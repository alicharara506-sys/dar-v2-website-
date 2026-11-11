import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp, ease, hotspots, reveal, stages } from './build-stages.js';

const vector = array => new T.Vector3(...array);

export async function loadVilla(url) {
  const manager = new T.LoadingManager();
  let resourceFailed = false;
  manager.onError = () => { resourceFailed = true; };
  const { scene } = await new GLTFLoader(manager).loadAsync(url);
  if (resourceFailed || stages.some(({ id }) => !scene.getObjectByName(id))) throw new Error('Incomplete villa model');
  return scene;
}

/** @typedef {typeof hotspots[number] & { x: number, y: number, visible: boolean }} ProjectedPin */
/** @param {HTMLCanvasElement} canvas
 * @param {T.Object3D} model
 * @param {{ onFail?: () => void, onPins?: (pins: ProjectedPin[]) => void, onReady?: () => void, pixelRatio?: number, capture?: boolean }} options
 */
export function mountVilla(canvas, model, { onFail = () => {}, onPins = () => {}, onReady = () => {}, pixelRatio, capture = false } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: capture });
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(pixelRatio ?? Math.min(devicePixelRatio, coarse ? 1.35 : 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene();
  scene.add(model);
  const camera = new T.OrthographicCamera(-18, 18, 12, -12, 0.5, 170);
  const hemi = new T.HemisphereLight('#edf0f6', '#89745c', 2.05);
  const sun = new T.DirectionalLight('#fff1da', 3.3);
  sun.position.set(-18, 29, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -21, right: 21, top: 19, bottom: -19, near: 5, far: 72 });
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00025;
  scene.add(hemi, sun);
  const parts = [];
  model.traverse(object => {
    if (object instanceof T.Mesh) {
      object.castShadow = !object.material.transparent;
      object.receiveShadow = true;
    }
    if (Number.isFinite(object.userData.start)) parts.push({
      object,
      position: object.position.clone(),
      data: object.userData,
    });
  });
  let progress = 0;
  let progressRendered = -1;
  let frame = 0;
  let dead = false;
  let ready = false;
  let active = true;
  let inspecting = false;
  let width = 1;
  let height = 1;
  let lastFrame = 0;
  let azimuth = 0;
  let elevation = 0;
  let zoom = 1;
  let targetAzimuth = 0;
  let targetElevation = 0;
  let targetZoom = 1;
  const look = new T.Vector3();
  const eye = new T.Vector3();
  const point = new T.Vector3();
  const pose = stages.map(stage => ({ eye: vector(stage.camera), look: vector(stage.target) }));
  const clampAngle = value => clamp(value, 0.1, 1.37);

  function requestFrame() {
    if (frame === 0 && active && !document.hidden && !dead) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (dead || !active || document.hidden) return;
    try {
      const cursor = progress * (stages.length - 1);
      const start = Math.floor(cursor);
      const end = Math.min(start + 1, stages.length - 1);
      const blend = ease(cursor - start);
      const dt = Math.min(0.04, Math.max(0.016, (now - lastFrame) / 1000));
      lastFrame = now;
      const damping = 1 - Math.exp(-dt * 15);
      azimuth += (targetAzimuth - azimuth) * damping;
      elevation += (targetElevation - elevation) * damping;
      zoom += (targetZoom - zoom) * damping;
      if (progress !== progressRendered) {
        const cut = reveal(cursor, 4.18, 4.91) * (1 - reveal(cursor, 5.17, 5.64));
        for (const { object, position, data } of parts) {
          const amount = reveal(cursor, data.start, data.end);
          const conceal = data.hide ? reveal(cursor, data.hide[0], data.hide[1]) : 0;
          const squash = data.cut === undefined ? 1 : 1 - cut * (1 - data.cut);
          object.visible = amount > 0.002 && conceal < 0.995 && squash > 0.14;
          object.scale.y = data.grow ? Math.max(0.001, amount) : 1;
          object.scale.z = squash;
          object.position.copy(position);
          object.position.y += (data.lift ?? 0) * (1 - amount) - (data.sink ?? 0) * conceal;
          object.position.y += (data.pivot ?? 0) * (1 - object.scale.y);
          if (data.cut !== undefined) object.position.z -= cut * (data.cut > 0.15 ? 2.9 : 0.4);
        }
        renderer.shadowMap.needsUpdate = true;
        progressRendered = progress;
      }
      look.copy(pose[start].look).lerp(pose[end].look, blend);
      eye.copy(pose[start].eye).lerp(pose[end].eye, blend).sub(look);
      const distance = eye.length();
      const a = Math.atan2(eye.x, eye.z) + azimuth;
      const e = clampAngle(Math.asin(eye.y / distance) + elevation);
      camera.position.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(distance).add(look);
      camera.lookAt(look);
      const aspect = width / height;
      const span = T.MathUtils.lerp(stages[start].width, stages[end].width, blend);
      const horizontal = span * Math.max(1, aspect / 1.67) / zoom;
      camera.left = -horizontal / 2;
      camera.right = horizontal / 2;
      camera.top = horizontal / aspect / 2;
      camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      if (inspecting) {
        const pins = hotspots.map(pin => {
          point.fromArray(pin.at).project(camera);
          return { ...pin, x: (point.x + 1) / 2, y: (1 - point.y) / 2, visible: point.z < 1 && Math.abs(point.x) < 0.88 && Math.abs(point.y) < 0.84 };
        });
        onPins(pins);
      }
      if (!ready) {
        ready = true;
        onReady();
      }
      if (Math.abs(targetAzimuth - azimuth) + Math.abs(targetElevation - elevation) + Math.abs(targetZoom - zoom) > 0.002) requestFrame();
    } catch {
      fail();
    }
  }
  function fail(event) {
    event?.preventDefault();
    if (dead) return;
    dead = true;
    cancelAnimationFrame(frame);
    onFail();
  }
  function resize() {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    requestFrame();
  }
  function reset() {
    targetAzimuth = targetElevation = 0;
    targetZoom = 1;
    requestFrame();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener('webglcontextlost', fail);
  document.addEventListener('visibilitychange', requestFrame);
  resize();
  return {
    setProgress(value) { progress = clamp(value); requestFrame(); },
    setActive(value) { active = value; requestFrame(); },
    setInspecting(value) { inspecting = value; if (!value) reset(); requestFrame(); },
    orbit(dx, dy) {
      targetAzimuth -= dx * 0.009;
      targetElevation = clamp(targetElevation + dy * 0.006, -0.58, 0.66);
      requestFrame();
    },
    zoom(factor) { targetZoom = clamp(targetZoom * factor, 0.78, 2.75); requestFrame(); },
    reset,
    dispose() {
      dead = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', fail);
      document.removeEventListener('visibilitychange', requestFrame);
      const resources = new Set();
      model.traverse(object => {
        if (!(object instanceof T.Mesh)) return;
        resources.add(object.geometry);
        resources.add(object.material);
        for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
      });
      resources.forEach(resource => resource.dispose());
      sun.shadow.dispose();
      renderer.dispose();
    },
  };
}
