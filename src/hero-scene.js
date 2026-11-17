import * as THREE from 'three';

const brandOrange = 0xd94f1e;
const markScale = 0.068;

function randomSource(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function stoneTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const data = context.createImageData(size, size);
  const random = randomSource(73);
  const grids = [8, 32].map(length => ({
    length,
    values: Array.from({ length: length * length }, random),
  }));

  function sample(grid, x, y) {
    const gridX = x * grid.length / size;
    const gridY = y * grid.length / size;
    const cellX = Math.floor(gridX);
    const cellY = Math.floor(gridY);
    const xMix = gridX - cellX;
    const yMix = gridY - cellY;
    const at = (dx, dy) => grid.values[((cellY + dy) % grid.length) * grid.length + (cellX + dx) % grid.length];
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(at(0, 0), at(1, 0), xMix),
      THREE.MathUtils.lerp(at(0, 1), at(1, 1), xMix),
      yMix,
    );
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const grain = random();
      const pore = grain < 0.017 ? -34 : 0;
      const tone = 202 + sample(grids[0], x, y) * 19 + sample(grids[1], x, y) * 16 + grain * 16 + pore;
      data.data[index] = tone + 2;
      data.data[index + 1] = tone;
      data.data[index + 2] = tone - 4;
      data.data[index + 3] = 255;
    }
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.53, 0.53);
  return texture;
}

function studioTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#1b1816';
  context.fillRect(0, 0, 512, 256);

  function softbox(x, y, width, height, color, blur = 10) {
    context.filter = `blur(${blur}px)`;
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }

  softbox(70, 30, 55, 130, '#ffecd6');
  softbox(196, 35, 92, 56, '#c8c9ce', 20);
  softbox(370, 55, 22, 110, '#fff9ef', 6);
  softbox(290, 135, 12, 94, '#8d4f33', 7);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function clippedRectangle(x0, y0, x1, y1, clip) {
  const shape = new THREE.Shape();
  shape.moveTo(x0 + clip, y0);
  shape.lineTo(x1 - clip, y0);
  shape.lineTo(x1, y0 + clip);
  shape.lineTo(x1, y1 - clip);
  shape.lineTo(x1 - clip, y1);
  shape.lineTo(x0 + clip, y1);
  shape.lineTo(x0, y1 - clip);
  shape.lineTo(x0, y0 + clip);
  shape.closePath();
  return shape;
}

function bore(shape, x, y, radius) {
  const hole = new THREE.Path();
  hole.absarc(x, y, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
}

/**
 * The DAR monogram, assembled like an architectural detail.
 * The face follows icon-symbol-orange.svg's 35 × 88 view box.
 * @param {HTMLElement} container
 */
export function mountHeroScene(container) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const canvas = renderer.domElement;
  canvas.className = 'hero-webgl';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'pan-y' });
  renderer.setClearColor(0x0c0c0c, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.10;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 85);
  const stage = new THREE.Group();
  scene.add(stage);
  const disposables = new Set();
  const stone = stoneTexture();
  const studio = studioTexture();
  scene.environment = studio;
  scene.environmentIntensity = 0.66;
  disposables.add(stone);
  disposables.add(studio);

  function material(parameters) {
    const value = new THREE.MeshPhysicalMaterial(parameters);
    disposables.add(value);
    return value;
  }

  const basalt = material({ color: 0x555451, map: stone, bumpMap: stone, bumpScale: 0.042, roughness: 0.84 });
  const stoneCut = material({ color: 0x48443e, map: stone, bumpMap: stone, bumpScale: 0.023, roughness: 0.88 });
  const limestone = material({ color: 0xc9b79e, map: stone, bumpMap: stone, bumpScale: 0.032, roughness: 0.88 });
  const graphite = material({ color: 0x222220, roughness: 0.49, metalness: 0.42 });
  const darkMetal = material({ color: 0x3d3a36, roughness: 0.41, metalness: 0.58 });
  const enamel = material({ color: brandOrange, roughness: 0.32, metalness: 0.30, clearcoat: 0.42, clearcoatRoughness: 0.28 });
  const enamelCut = material({ color: 0x9e3717, roughness: 0.4, metalness: 0.38, clearcoat: 0.27 });

  function solid(parent, shape, depth, face, edge, bevel = 0.014) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      curveSegments: 54,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
    });
    disposables.add(geometry);
    const mesh = new THREE.Mesh(geometry, [face, edge]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function group(parent) {
    const value = new THREE.Group();
    parent.add(value);
    return value;
  }

  const backing = group(stage);
  const core = group(stage);
  const left = group(stage);
  const joint = group(stage);
  const plinth = group(stage);
  const right = group(stage);
  const topRing = group(stage);
  const bar = group(stage);
  // A bias away from the bar balances the asymmetric face of the mark.
  const ringX = (11 - 17.5) * markScale - 0.45;
  const ringY = (44 - 15) * markScale;
  const barX = (32.5 - 17.5) * markScale - 0.45;
  const halfHeight = 44 * markScale;
  const radius = 11 * markScale;
  const ringHole = 8 * markScale;

  const backShape = clippedRectangle(-2.37, -3.38, 2.24, 3.35, 0.18);
  bore(backShape, ringX, ringY, ringHole * 1.35);
  solid(backing, backShape, 0.29, graphite, darkMetal, 0.025);
  const coreShape = clippedRectangle(-2.47, -3.22, 1.94, 3.27, 0.16);
  bore(coreShape, ringX, ringY, ringHole * 1.31);
  solid(core, coreShape, 0.17, stoneCut, darkMetal, 0.02);
  solid(core, clippedRectangle(-2.34, -3.08, 1.89, -2.91, 0.045), 0.12, limestone, stoneCut, 0.01).position.z = 0.167;

  const leftShape = clippedRectangle(-2.65, -0.87, barX - 0.22, 3.21, 0.11);
  bore(leftShape, ringX, ringY, radius + 0.046);
  solid(left, leftShape, 0.39, basalt, stoneCut);
  solid(joint, clippedRectangle(-2.51, -1.89, barX - 0.22, -0.95, 0.08), 0.29, graphite, darkMetal);
  solid(plinth, clippedRectangle(-2.59, -3.21, barX - 0.22, -1.98, 0.09), 0.32, basalt, stoneCut);
  solid(right, clippedRectangle(barX + 0.22, -2.49, 1.85, 3.21, 0.11), 0.29, limestone, stoneCut);
  solid(right, clippedRectangle(barX + 0.22, -3.21, 1.85, -2.57, 0.07), 0.29, stoneCut, darkMetal);
  solid(right, clippedRectangle(1.96, -3.12, 2.20, 3.13, 0.05), 0.19, graphite, darkMetal);

  const ringProfile = new THREE.Shape();
  ringProfile.absarc(ringX, ringY, radius - 0.012, 0, Math.PI * 2);
  bore(ringProfile, ringX, ringY, ringHole + 0.012);
  solid(topRing, ringProfile, 0.24, enamel, enamelCut, 0.012);
  const collar = new THREE.Shape();
  collar.absarc(ringX, ringY, radius + 0.02, 0, Math.PI * 2);
  bore(collar, ringX, ringY, ringHole * 0.94);
  solid(topRing, collar, 0.078, darkMetal, graphite, 0.01).position.z = -0.13;

  const halfBar = 2.5 * markScale - 0.012;
  const barProfile = clippedRectangle(barX - halfBar, -halfHeight + 0.012, barX + halfBar, halfHeight - 0.012, 0.007);
  solid(bar, barProfile, 0.25, enamel, enamelCut, 0.012);
  solid(bar, clippedRectangle(barX - 0.18, -halfHeight - 0.01, barX + 0.18, halfHeight + 0.01, 0.022), 0.088, darkMetal, graphite).position.z = -0.13;

  const seams = group(left);
  const seamMaterial = new THREE.LineBasicMaterial({ color: 0xb2aa95, transparent: true, opacity: 0.18 });
  disposables.add(seamMaterial);
  const seamsGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.634, -0.45, 0.391),
    new THREE.Vector3(-1.25, -0.45, 0.391),
    new THREE.Vector3(-2.634, -0.51, 0.391),
    new THREE.Vector3(-1.78, -0.51, 0.391),
    new THREE.Vector3(-2.634, -0.57, 0.391),
    new THREE.Vector3(-2.10, -0.57, 0.391),
  ]);
  disposables.add(seamsGeometry);
  seams.add(new THREE.LineSegments(seamsGeometry, seamMaterial));

  // Faint projection marks echo a drawing sheet and provide a second plane of depth.
  const guideVertices = [];
  const line = (x0, y0, x1, y1) => guideVertices.push(x0, y0, -1.9, x1, y1, -1.9);
  line(-3.02, -3.69, 2.72, -3.69);
  line(-3.02, 3.64, 2.72, 3.64);
  line(-3.02, -3.69, -3.02, 3.64);
  line(2.72, -3.69, 2.72, 3.64);
  for (let i = 0; i < 16; i++) {
    const y = -3.69 + i * 0.46;
    const tick = i % 4 === 0 ? 0.23 : 0.09;
    line(-3.02 - tick, y, -3.02, y);
    line(2.72, y, 2.72 + tick, y);
  }
  const guideGeometry = new THREE.BufferGeometry();
  guideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(guideVertices, 3));
  const guideMaterial = new THREE.LineBasicMaterial({ color: 0xbbb19e, transparent: true, opacity: 0.17 });
  disposables.add(guideGeometry);
  disposables.add(guideMaterial);
  stage.add(new THREE.LineSegments(guideGeometry, guideMaterial));

  function light(color, intensity, x, y, z) {
    const value = new THREE.DirectionalLight(color, intensity);
    value.position.set(x, y, z);
    scene.add(value);
    return value;
  }

  scene.add(new THREE.HemisphereLight(0xd4c8b3, 0x231e1b, 0.72));
  const key = light(0xffedcf, 2.75, -5.5, 6.3, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, bottom: -6, top: 6, near: 0.1, far: 20 });
  key.shadow.normalBias = 0.013;
  key.shadow.bias = -0.0001;
  key.shadow.intensity = 0.68;
  key.shadow.radius = 2.5;
  light(0xffab68, 2.19, 3.0, 2.0, -3.1);
  light(0xc1cce0, 0.53, 3.6, -0.8, 4.0);

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerTarget = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  let progressTarget = 0;
  let progress = 0;
  let entrance = motionQuery.matches ? 1 : 0;
  let clockTime = 0;
  let frame = 0;
  let inView = true;
  let disposed = false;
  let lost = false;
  let dragX = null;
  let dragTarget = 0;
  let drag = 0;

  function setPointer(x, y) {
    const clamp = THREE.MathUtils.clamp;
    pointerTarget.set(clamp(x, -1, 1), clamp(y, -1, 1));
    schedule();
  }

  function setProgress(value) {
    progressTarget = Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;
    schedule();
  }

  function schedule() {
    if (!frame && !disposed && !lost && inView && !document.hidden) {
      frame = requestAnimationFrame(renderFrame);
    }
  }

  function paint() {
    const opening = Math.sin(progress * Math.PI * 0.76) * 0.9 + (1 - entrance) * 0.92;
    stage.rotation.set(
      -0.24 + pointer.y * 0.16 + progress * 0.40,
      -0.40 + pointer.x * 0.28 + progress * 0.92 + drag,
      -0.16 + progress * 0.27 + pointer.x * 0.035,
    );
    stage.position.set(0.15 + progress * 0.15, 0.06 - progress * 0.52, 0);
    left.position.set(-opening * 0.53, opening * 0.06, opening * 0.13);
    joint.position.set(-0.05 - opening * 0.80, -opening * 0.18, -0.12 - opening * 0.15);
    plinth.position.set(-opening * 0.39, -opening * 0.38, opening * 0.47);
    right.position.set(opening * 0.55, -opening * 0.08, opening * 0.09);
    core.position.set(opening * 0.25, 0, -0.32 - opening * 0.55);
    backing.position.set(opening * 0.5, -0.08, -0.72 - opening * 0.82);
    topRing.position.set(-opening * 0.12, opening * 0.20, 0.46 + opening * 0.62);
    bar.position.set(opening * 0.25, -opening * 0.24, 0.22 + opening * 0.85);
    key.position.x = -5.5 + pointer.x * 1.5 + progress * 3.5;
    guideMaterial.opacity = 0.19 + opening * 0.16;
    renderer.render(scene, camera);
  }

  function renderFrame(now) {
    frame = 0;
    const dt = clockTime ? Math.min((now - clockTime) / 1000, 0.05) : 1 / 60;
    clockTime = now;
    const damp = THREE.MathUtils.damp;
    if (motionQuery.matches) {
      pointer.set(0, 0);
      progress = 0;
      drag = 0;
      entrance = 1;
    } else {
      pointer.x = damp(pointer.x, pointerTarget.x, 6.6, dt);
      pointer.y = damp(pointer.y, pointerTarget.y, 6.6, dt);
      progress = damp(progress, progressTarget, 9, dt);
      drag = damp(drag, dragTarget, 7.5, dt);
      entrance = damp(entrance, 1, 4.0, dt);
    }
    paint();
    const moving = entrance < 0.997 || pointer.distanceToSquared(pointerTarget) > 0.00005 ||
      Math.abs(progress - progressTarget) > 0.002 || Math.abs(drag - dragTarget) > 0.002;
    if (!motionQuery.matches && moving) schedule();
    else clockTime = 0;
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const pixelBudget = width * height > 520000 ? 1.2 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelBudget));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const distance = Math.max(14.7, 10.2 / camera.aspect);
    camera.position.set(0, 0.07, distance);
    camera.lookAt(0, 0.06, 0);
    camera.updateProjectionMatrix();
    schedule();
  }

  function pointerMove(event) {
    if (dragX !== null) {
      const width = Math.max(1, container.clientWidth);
      dragTarget = THREE.MathUtils.clamp(dragTarget + (event.clientX - dragX) / width * 2.9, -0.85, 0.85);
      dragX = event.clientX;
    }
    const bounds = container.getBoundingClientRect();
    if (bounds.width && bounds.height) {
      setPointer((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
    }
  }

  function pointerDown(event) {
    if (event.button !== 0 || !event.isPrimary || motionQuery.matches) return;
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function stopDrag() {
    dragX = null;
    canvas.style.cursor = 'grab';
  }

  function resetPointer() {
    if (dragX === null) setPointer(0, 0);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
    clockTime = 0;
  }

  function onVisibility() {
    if (document.hidden) pause();
    else schedule();
  }

  function contextLost(event) {
    event.preventDefault();
    lost = true;
    pause();
    delete container.dataset.renderer;
    canvas.hidden = true;
    canvas.style.visibility = 'hidden';
  }

  function contextRestored() {
    lost = false;
    canvas.hidden = false;
    canvas.style.visibility = '';
    container.dataset.renderer = 'webgl';
    schedule();
  }

  container.append(canvas);
  canvas.style.cursor = motionQuery.matches ? 'default' : 'grab';
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    if (inView) schedule();
    else pause();
  });
  intersection.observe(container);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove, { passive: true });
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('lostpointercapture', stopDrag);
  canvas.addEventListener('pointerleave', resetPointer);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', onVisibility);
  motionQuery.addEventListener('change', schedule);
  resize();
  paint();
  container.dataset.renderer = 'webgl';

  return {
    setPointer,
    setProgress,
    destroy() {
      disposed = true;
      pause();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', schedule);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      key.shadow.dispose();
      for (const disposable of disposables) disposable.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      delete container.dataset.renderer;
    },
  };
}
