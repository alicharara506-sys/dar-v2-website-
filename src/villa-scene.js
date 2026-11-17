import * as THREE from 'three';

const cameraPoses = [
  { yaw: -.62, pitch: .72, x: 0, y: .3, z: 0, width: 14, height: 7.7 },
  { yaw: -.39, pitch: .85, x: 0, y: .4, z: 0, width: 11.4, height: 6.5 },
  { yaw: -.60, pitch: .53, x: 0, y: 2.6, z: 0, width: 10.6, height: 6.45 },
  { yaw: -.22, pitch: .37, x: 0, y: 2.7, z: .45, width: 10.2, height: 6.1 },
  { yaw: -.36, pitch: .78, x: 0, y: 2, z: .15, width: 10.1, height: 6.15 },
  { yaw: -.62, pitch: .85, x: 0, y: 1.9, z: .1, width: 10.4, height: 6.3 },
  { yaw: -.44, pitch: .41, x: 0, y: 2.25, z: .2, width: 13.3, height: 7.2 },
  { yaw: -.65, pitch: .53, x: .15, y: 1.2, z: .35, width: 15.2, height: 8.5 },
];

/**
 * A compact, deliberately schematic Lebanese courtyard villa, measured in metres.
 * X: arrival to garden; Y: up; Z: rear to the south-facing arched loggia.
 * Load this module on intersection; it has no render loop when the view is settled.
 */
export function mountVillaScene(container, { onReady = () => {}, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x222222, 0);
  const canvas = renderer.domElement;
  canvas.className = 'villa-webgl';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'pan-y', cursor: 'grab' });
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-15, 15, 11, -11, 0.1, 120);
  const target = new THREE.Vector3();
  const aim = { yaw: 0, pitch: 0, hoverX: 0, hoverY: 0 };
  const view = { ...aim };
  let aspect = 1;
  let enabled = true;
  let disposed = false;
  let inView = true;
  let frame = 0;
  let currentProgress = 0;
  let destination = 0;
  let lastTime = 0;
  const animated = [];
  const disposables = new Set();

  function material(color, properties = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...properties });
    disposables.add(value);
    return value;
  }
  function limestoneTexture() {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 256;
    const ctx = tile.getContext('2d');
    ctx.fillStyle = '#d5c9ad';
    ctx.fillRect(0, 0, 256, 256);
    let seed = 2181;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 15000; i++) {
      const bright = Math.floor(145 + random() * 90);
      ctx.fillStyle = `rgba(${bright + 12},${bright + 5},${bright - 8},${random() * 0.21})`;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
    }
    for (let row = 0; row < 4; row++) {
      ctx.fillStyle = 'rgba(100,88,67,.13)';
      ctx.fillRect(0, row * 64, 256, 1);
      ctx.fillRect((row % 2) * 128, row * 64, 1, 64);
    }
    const texture = new THREE.CanvasTexture(tile);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    disposables.add(texture);
    return texture;
  }
  const stoneMap = limestoneTexture();
  const stone = material(0xe4d9c3, { map: stoneMap, roughness: 0.95 });
  const concrete = material(0xbdb8a9, { roughness: 0.94 });
  const masonry = material(0xb2ab97, { map: stoneMap, roughness: 1 });
  const earth = material(0x777063);
  const cutEarth = material(0x564b40);
  const graphite = material(0x272726, { roughness: .62, metalness: .24 });
  const trim = material(0x4e4940, { roughness: .48, metalness: .5 });
  const bronze = material(0x514a39, { metalness: 0.7, roughness: 0.4 });
  const timber = material(0x785438, { roughness: 0.7 });
  const roofClay = material(0x9b644a, { roughness: 0.97 });
  const roofRidge = material(0xb77d5e);
  const cream = material(0xf0e9db);
  const marble = material(0xe2dcd0, { roughness: 0.3 });
  const softGreen = material(0x7c8461);
  const darkGreen = material(0x596448);
  const lawn = material(0x92977c);
  const glass = material(0x7d9992, { metalness: 0.22, roughness: 0.17, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false });
  const water = material(0x789c9a, { metalness: 0.3, roughness: 0.18, transparent: true, opacity: 0.88 });
  const warmLight = material(0xf4dca7, { emissive: 0xf8cb77, emissiveIntensity: 0.65 });
  const plumbing = material(0x5d8d99, { roughness: 0.5, metalness: 0.2 });
  const electrical = material(0xbc8851);

  function layer(name, from, { until = 9, lift = 0.2 } = {}) {
    const group = new THREE.Group();
    group.name = name;
    scene.add(group);
    animated.push({ group, from, until, lift });
    return group;
  }
  function mesh(geometry, mat, group, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    disposables.add(geometry);
    return object;
  }
  function box(group, x, y, z, w, h, d, mat = stone) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, group, x, y, z);
  }
  function cylinder(group, x, y, z, top, bottom, height, mat, segments = 10) {
    return mesh(new THREE.CylinderGeometry(top, bottom, height, segments), mat, group, x, y, z);
  }
  function line(group, points, color = 0x8c8878, opacity = 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    disposables.add(geometry);
    disposables.add(mat);
    const object = new THREE.Line(geometry, mat);
    group.add(object);
    return object;
  }
  function pipe(group, points, radius, mat) {
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]);
      const b = new THREE.Vector3(...points[i]);
      const delta = b.clone().sub(a);
      const part = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), mat, group);
      part.position.copy(a.add(b).multiplyScalar(0.5));
      part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
  }
  function outline(group, x, z, w, d, y, color) {
    return line(group, [[x - w / 2, y, z - d / 2], [x + w / 2, y, z - d / 2], [x + w / 2, y, z + d / 2], [x - w / 2, y, z + d / 2], [x - w / 2, y, z - d / 2]], color);
  }

  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x70665a, 1.52));
  const sun = new THREE.DirectionalLight(0xffe9ca, 3.12);
  sun.position.set(-8, 13, 10);
  sun.castShadow = true;
  const shadowSize = window.matchMedia('(pointer: coarse)').matches ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 55 });
  sun.shadow.normalBias = 0.045;
  sun.shadow.bias = -0.00015;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc0d5ef, 1.6);
  fill.position.set(11, 9, -11);
  scene.add(fill);
  const pendant = new THREE.PointLight(0xffb16f, 0, 7);
  pendant.position.set(0, 4.4, .1);
  scene.add(pendant);

  const display = new THREE.Group();
  scene.add(display);
  box(display, 0, -1.32, 0, 22.7, .39, 15.7, graphite);
  box(display, 0, -1.16, 0, 22.62, .06, 15.62, trim);
  const displayEdge = line(display, [[-11.35, -1.08, 7.85], [11.35, -1.08, 7.85], [11.35, -1.08, -7.85]], 0xf78953, .76);
  const grid = new THREE.GridHelper(40, 32, 0xb2a18d, 0x807367);
  grid.position.y = -1.54;
  grid.material.transparent = true;
  grid.material.opacity = .15;
  grid.material.depthWrite = false;
  display.add(grid);
  disposables.add(grid.geometry);
  disposables.add(grid.material);

  const datum = new THREE.Group();
  scene.add(datum);
  const datumScale = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 23 }, (_, index) => {
      const x = -11 + index;
      return [new THREE.Vector3(x, -1.46, 8.25), new THREE.Vector3(x, -1.46, index % 5 === 1 ? 8.68 : 8.43)];
    }).flat()
  );
  const datumTone = new THREE.LineBasicMaterial({ color: 0xcaac8d, opacity: .6, transparent: true, depthWrite: false });
  datum.add(new THREE.LineSegments(datumScale, datumTone));
  disposables.add(datumScale);
  disposables.add(datumTone);
  const playhead = line(datum, [[0, -1.4, 8.12], [0, -1.4, 8.78], [.24, -1.4, 8.78]], 0xff8b55);

  // The plot is a real solid with an open construction cavity, rather than a plane
  // over which the foundations would disappear. All subsequent floors share datum .28.
  const terrain = layer('terrain', -1, { lift: 0 });
  box(terrain, 0, -0.9, 0, 22.4, 0.48, 15.4, earth);
  box(terrain, -8.45, -0.27, 0, 5.5, 0.82, 15.4, earth);
  box(terrain, 8.45, -0.4, 0, 5.5, 0.56, 15.4, earth);
  box(terrain, 0, -0.27, -5.4, 11.4, 0.82, 4.6, earth);
  box(terrain, 0, -0.4, 5.4, 11.4, 0.56, 4.6, earth);
  // A continuous excavation floor and its cut soil edges stay below the footings.
  box(terrain, 0, -0.61, 0, 11.4, 0.1, 6.2, cutEarth);
  box(terrain, -5.71, -0.22, 0, 0.08, 0.72, 6.2, cutEarth);
  box(terrain, 5.71, -0.32, 0, 0.08, 0.52, 6.2, cutEarth);
  box(terrain, 0, -0.22, -3.11, 11.4, 0.08 + 0.64, 0.08, cutEarth);
  const survey = layer('survey', -1, { until: 0.8, lift: 0 });
  box(survey, 0, 0.115, 0, 11.4, 0.05, 6.2, earth);
  outline(survey, 0, 0, 11.1, 6, 0.16, 0xffa86d);
  outline(survey, 0, 0, 4.2, 6, 0.17, 0xffa86d);
  outline(survey, 8, 1.2, 3.3, 7.1, 0.03, 0x8d9585);
  outline(survey, -8.1, -1.4, 4.1, 5.3, 0.18, 0x8d9585);
  for (let x = -4; x <= 4; x += 2) line(survey, [[x, 0.17, -3], [x, 0.17, 3]], 0x9c9f8e, 0.7);
  line(survey, [[-5.6, 0.17, 0], [5.6, 0.17, 0]], 0x9c9f8e, 0.7);
  // Survey pins and real site dimensions, rendered as restrained drawn marks.
  for (const x of [-5.6, 5.6]) for (const z of [-3, 3]) {
    cylinder(survey, x, 0.28, z, 0.035, 0.035, 0.35, bronze, 6);
    line(survey, [[x - 0.16, 0.46, z], [x + 0.16, 0.46, z]], 0x726b54);
  }
  line(survey, [[-5.6, 0.17, 4], [5.6, 0.17, 4]], 0x6c7566);
  for (const x of [-5.6, 5.6]) line(survey, [[x, 0.17, 3.7], [x, 0.17, 4.3]], 0x6c7566);

  const footings = layer('foundations', 0.65, { lift: 0.12 });
  for (const x of [-5.35, -2.05, 2.05, 5.35]) {
    box(footings, x, -0.28, 0, 0.7, 0.35, 5.9, concrete);
    for (const z of [-2.7, 0, 2.7]) box(footings, x, -0.14, z, 0.8, 0.3, 0.8, concrete);
  }
  for (const z of [-2.7, 2.7]) box(footings, 0, -0.28, z, 10.9, 0.35, 0.7, concrete);
  const foundationBars = layer('foundation reinforcement', 0.7, { until: 1.9, lift: 0 });
  for (const x of [-5.35, -2.05, 2.05, 5.35]) {
    for (const dx of [-0.14, 0.14]) pipe(foundationBars, [[x + dx, -0.06, -2.75], [x + dx, -0.06, 2.75]], 0.013, bronze);
    for (const z of [-2.7, 0, 2.7]) {
      for (const dx of [-0.08, 0.08]) pipe(foundationBars, [[x + dx, -0.1, z], [x + dx, 0.6, z]], 0.012, bronze);
    }
  }

  const frameGroup = layer('concrete frame', 1.65, { lift: 0.25 });
  box(frameGroup, 0, 0.27, 0, 11.15, 0.24, 6.05, concrete);
  // Structural columns align with the bearing walls and the arched front piers.
  for (const x of [-5.35, -2.05, 2.05, 5.35]) {
    for (const z of [-2.7, 0, 2.7]) box(frameGroup, x, 3.26, z, 0.25, 5.75, 0.25, concrete);
  }
  for (const x of [-0.68, 0.68]) box(frameGroup, x, 3.25, 2.95, 0.17, 5.8, 0.22, concrete);
  const upperStructure = layer('upper slabs', 1.85, { lift: 0.35 });
  box(upperStructure, -3.72, 3.27, 0, 3.5, 0.22, 5.9, concrete);
  box(upperStructure, 3.72, 3.27, 0, 3.5, 0.22, 5.9, concrete);
  box(upperStructure, 0, 3.27, -2.07, 4.2, 0.22, 1.5, concrete);
  const roofStructure = layer('flat roof slabs', 2.05, { lift: 0.45 });
  box(roofStructure, -3.72, 6.2, -0.35, 3.65, 0.22, 5.25, concrete);
  box(roofStructure, 3.43, 6.2, -0.68, 2.98, 0.22, 4.6, concrete);
  for (const z of [-2.7, 2.72]) box(roofStructure, 0, 6.13, z, 4.4, 0.28, 0.3, concrete);

  // Shell openings are constructed from jambs and lintels, not painted-on windows.
  const shell = layer('masonry shell', 2.7, { lift: 0.3 });
  function wall(x, y, z, w, h, d) { return box(shell, x, y, z, w, h, d, masonry); }
  // Rear wall with four bedroom/service windows.
  for (const floor of [0, 1]) {
    const y = 0.4 + floor * 2.94;
    wall(0, y + 0.48, -2.85, 10.85, 0.96, 0.25);
    wall(0, y + 2.47, -2.85, 10.85, 0.7, 0.25);
    for (const x of [-5.3, -2.8, 0, 2.8, 5.3]) wall(x, y + 1.53, -2.85, x === 0 ? 1.5 : 0.5, 1.15, 0.25);
  }
  // Outer wing walls with long side openings.
  for (const x of [-5.4, 5.4]) {
    wall(x, 0.85, 0, 0.26, 0.9, 5.7);
    wall(x, 2.95, 0, 0.26, 0.48, 5.7);
    for (const z of [-2.65, -0.2, 2.65]) wall(x, 1.95, z, 0.26, 1.35, 0.45);
  }
  wall(-5.4, 4.15, -0.35, 0.26, 1.6, 5.1);
  wall(-5.4, 5.92, -0.35, 0.26, 0.4, 5.1);
  for (const z of [-2.65, 0, 2.1]) wall(-5.4, 5.25, z, 0.26, 1.4, 0.4);
  wall(4.8, 4.1, -0.7, 0.26, 1.5, 4.35);
  wall(4.8, 5.95, -0.7, 0.26, 0.35, 4.35);
  for (const z of [-2.65, 1.3]) wall(4.8, 5.2, z, 0.26, 1.5, 0.45);
  // Front wing faces are largely glazed, with generous solid outer corner piers.
  for (const x of [-4.98, 4.98]) wall(x, 1.75, 2.8, 0.9, 2.7, 0.25);
  for (const x of [-3.72, 3.72]) wall(x, 3.02, 2.8, 3.5, 0.3, 0.25);
  wall(-4.98, 4.75, 2.1, 0.9, 2.75, 0.25);
  wall(-3.72, 5.96, 2.1, 3.5, 0.32, 0.25);
  wall(4.45, 4.75, 1.4, 0.7, 2.75, 0.25);
  wall(3.4, 5.96, 1.4, 2.8, 0.32, 0.25);
  // Inner walls protect bedrooms while retaining the double-height central hall.
  for (const x of [-2.04, 2.04]) {
    wall(x, 1.76, -1.7, 0.2, 2.7, 2.3);
    wall(x, 4.7, -0.35, 0.2, 2.7, 5.1);
  }

  function archShape(center, bottom = 0.4, spring = 5.32, radius = 0.53) {
    const shape = new THREE.Shape();
    shape.moveTo(center - radius, bottom);
    shape.lineTo(center + radius, bottom);
    shape.lineTo(center + radius, spring);
    shape.absarc(center, spring, radius, 0, Math.PI, false);
    shape.lineTo(center - radius, bottom);
    return shape;
  }
  const arcadeOutline = new THREE.Shape();
  arcadeOutline.moveTo(-2.16, 0.39);
  arcadeOutline.lineTo(2.16, 0.39);
  arcadeOutline.lineTo(2.16, 6.25);
  arcadeOutline.lineTo(-2.16, 6.25);
  arcadeOutline.closePath();
  for (const x of [-1.36, 0, 1.36]) arcadeOutline.holes.push(new THREE.Path(archShape(x).getPoints(24)));
  const arcade = mesh(new THREE.ExtrudeGeometry(arcadeOutline, { depth: 0.28, bevelEnabled: false, curveSegments: 20 }), masonry, shell, 0, 0, 2.84);

  const services = layer('coordinated services', 3.7, { until: 4.7, lift: 0 });
  // One rear wet-service riser, branching inside floor/ceiling zones to kitchen and bath.
  pipe(services, [[1.82, 0.52, -2.5], [1.82, 5.68, -2.5]], 0.052, plumbing);
  for (const y of [0.55, 3.5]) {
    pipe(services, [[1.82, y, -2.5], [4.2, y, -2.5], [4.2, y, -1.55]], 0.036, plumbing);
    pipe(services, [[1.68, y + 0.1, -2.5], [-3.7, y + 0.1, -2.5], [-3.7, y + 0.1, -1.2]], 0.029, plumbing);
  }
  box(services, -4.95, 1.45, -2.57, 0.52, 0.72, 0.12, cream);
  pipe(services, [[-4.95, 1.8, -2.5], [-4.95, 2.88, -2.5], [4.8, 2.88, -2.5]], 0.023, electrical);
  for (const x of [-3.65, 0, 3.6]) {
    pipe(services, [[x, 2.88, -2.5], [x, 2.88, 1.4]], 0.023, electrical);
    for (const z of [-1.4, 0, 1.4]) cylinder(services, x, 2.84, z, 0.095, 0.095, 0.04, electrical, 12);
  }
  // Flat concealed ventilation trunk, routed along the rear service band.
  box(services, 0, 2.87, -2.25, 9.5, 0.18, 0.24, concrete);
  for (const x of [-3.7, 3.7]) box(services, x, 2.86, -1.35, 0.22, 0.16, 1.8, concrete);

  const interiors = layer('interior finishing', 4.65, { lift: 0.1 });
  // Keep the far-side finishes in place so the section shows painted rooms.
  const paintedBand = [
    [0, .88, -2.71, 10.6, .96, .026],
    [0, 2.87, -2.71, 10.6, .7, .026],
    [0, 3.82, -2.71, 10.6, .96, .026],
    [0, 5.81, -2.71, 10.6, .7, .026],
  ];
  for (const [x,y,z,w,h,d] of paintedBand) box(interiors, x,y,z,w,h,d, cream);
  for (const y of [1.93, 4.87]) {
    for (const x of [-5.3, -2.8, 0, 2.8, 5.3]) {
      box(interiors, x, y, -2.71, x === 0 ? 1.5 : .5, 1.15, .026, cream);
    }
  }
  // Stone floors, timber joinery, fitted kitchen and human-scale seating.
  box(interiors, 0, 0.412, 0, 10.6, 0.045, 5.55, marble);
  box(interiors, -3.7, 3.405, -0.35, 3.2, 0.045, 5.05, timber);
  box(interiors, 3.45, 3.405, -0.68, 2.6, 0.045, 4.35, timber);
  for (const x of [-4.8, -3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6, 4.8]) line(interiors, [[x, 0.439, -2.65], [x, 0.439, 2.65]], 0xb9b6ac, 0.5);
  for (const z of [-2.4, -1.2, 0, 1.2, 2.4]) line(interiors, [[-5.2, 0.439, z], [5.2, 0.439, z]], 0xb9b6ac, 0.5);
  box(interiors, 3.65, 0.9, -2.3, 2.65, 0.92, 0.62, timber);
  box(interiors, 3.65, 1.38, -2.3, 2.72, 0.07, 0.68, marble);
  box(interiors, 3.65, 0.91, -0.8, 1.9, 0.94, 0.8, cream);
  box(interiors, 3.65, 1.41, -0.8, 2.05, 0.08, 0.95, marble);
  box(interiors, -4.55, 0.77, 0.35, 0.83, 0.5, 2.35, cream);
  box(interiors, -4.85, 1.01, 0.35, 0.22, 0.58, 2.35, cream);
  for (const z of [-0.65, 1.35]) box(interiors, -4.5, 1.0, z, 0.9, 0.44, 0.22, cream);
  box(interiors, -3.18, 0.69, 0.35, 0.83, 0.18, 1.5, timber);
  box(interiors, -3.4, 0.45, 0.35, 2.5, 0.02, 3, material(0xc5b89e));
  box(interiors, 0, 0.83, 0.1, 1.25, 0.1, 1.8, timber);
  for (const x of [-0.47, 0.47]) for (const z of [-0.62, 0.82]) box(interiors, x, 0.62, z, 0.06, 0.38, 0.06, bronze);
  for (const x of [-1.0, 1.0]) for (const z of [-0.5, 0.55]) {
    box(interiors, x, 0.66, z, 0.42, 0.12, 0.45, cream);
    box(interiors, x + (x < 0 ? -0.18 : 0.18), 0.92, z, 0.06, 0.5, 0.45, timber);
    for (const dz of [-0.16, 0.16]) box(interiors, x, 0.52, z + dz, 0.32, 0.2, 0.04, timber);
  }
  // Stair climbs along the rear of the double-height hall to its upper bridge.
  for (let i = 0; i < 16; i++) box(interiors, -1.45 + i * 0.18, 0.46 + i * 0.183, -1.95, 0.2, 0.12, 0.9, marble);
  pipe(interiors, [[-1.5, 1.35, -1.47], [1.37, 4.1, -1.47]], 0.02, bronze);
  for (let i = 0; i <= 8; i++) box(interiors, -1.45 + i * 0.36, 0.91 + i * 0.366, -1.47, 0.025, 0.9, 0.025, bronze);
  for (const x of [-3.65, 3.45]) {
    box(interiors, x, 3.69, -0.9, 1.7, 0.48, 2.05, cream);
    box(interiors, x, 3.81, -1.72, 1.7, 0.18, 0.4, cream);
    box(interiors, x, 4.04, -2.05, 1.9, 1.0, 0.1, timber);
  }
  for (const x of [-3.7, 3.6]) for (const z of [-1.2, 1.2]) cylinder(interiors, x, 3.12, z, 0.08, 0.08, 0.04, warmLight, 12);
  cylinder(interiors, 0, 4.76, 0.1, 0.36, 0.36, 0.045, bronze, 32);
  cylinder(interiors, 0, 4.72, 0.1, 0.32, 0.32, 0.025, warmLight, 32);
  pipe(interiors, [[0, 4.8, 0.1], [0, 6.22, 0.1]], 0.014, bronze);

  const exterior = layer('limestone and glazing', 5.65, { lift: 0.18 });
  const finishArcade = mesh(arcade.geometry, stone, exterior, 0, 0, 2.855);
  finishArcade.scale.set(1.002, 1.002, 1.05);
  // Narrow limestone edge bands make the offset massing legible.
  for (const [x, y, z, w, d] of [[-3.72, 3.21, 0, 3.7, 6.15], [3.72, 3.21, 0, 3.7, 6.15], [-3.72, 6.3, -0.35, 3.8, 5.4], [3.43, 6.3, -0.68, 3.15, 4.75]]) {
    box(exterior, x, y, z, w, 0.18, d, stone);
    box(exterior, x, y - 0.13, z + d / 2 - 0.12, w - 0.12, 0.055, 0.2, timber);
  }
  // A stone facing follows the actual opaque shell; no window is covered.
  for (const child of shell.children) {
    if (child === arcade) continue;
    const facing = new THREE.Mesh(child.geometry, stone);
    facing.position.copy(child.position);
    facing.scale.set(1.004, 1.002, 1.004);
    facing.castShadow = true;
    facing.receiveShadow = true;
    exterior.add(facing);
  }
  function glazedRectangle(group, x, y, z, w, h, side = false) {
    const pane = box(group, x, y, z, side ? 0.035 : w, h, side ? w : 0.035, glass);
    pane.castShadow = false;
    if (!side) {
      for (const dx of [-w / 2, 0, w / 2]) box(group, x + dx, y, z + 0.03, 0.035, h, 0.055, bronze);
      for (const dy of [-h / 2, h / 2]) box(group, x, y + dy, z + 0.03, w, 0.035, 0.055, bronze);
    } else {
      for (const dz of [-w / 2, 0, w / 2]) box(group, x, y, z + dz, 0.055, h, 0.035, bronze);
      for (const dy of [-h / 2, h / 2]) box(group, x, y + dy, z, 0.055, 0.035, w, bronze);
    }
  }
  for (const x of [-1.36, 0, 1.36]) {
    const pane = mesh(new THREE.ShapeGeometry(archShape(x), 24), glass, exterior, 0, 0, 2.81);
    pane.castShadow = false;
    line(exterior, archShape(x).getPoints(32).map(p => [p.x, p.y, 2.83]), 0x5c5140);
    box(exterior, x, 3.16, 2.83, 0.035, 5.5, 0.055, bronze);
    box(exterior, x, 2.72, 2.83, 1.06, 0.045, 0.055, bronze);
    box(exterior, x, 3.36, 2.83, 1.06, 0.045, 0.055, bronze);
  }
  for (const x of [-3.28, 3.28]) glazedRectangle(exterior, x, 1.67, 2.79, 2.25, 2.45);
  glazedRectangle(exterior, -3.28, 4.65, 2.09, 2.25, 2.45);
  glazedRectangle(exterior, 3.1, 4.65, 1.39, 1.9, 2.45);
  for (const x of [-5.41, 5.41]) {
    glazedRectangle(exterior, x, 1.96, -1.42, 1.92, 1.25, true);
    glazedRectangle(exterior, x, 1.96, 1.23, 2.4, 1.25, true);
  }
  glazedRectangle(exterior, -5.41, 5.24, -1.34, 2.15, 1.32, true);
  glazedRectangle(exterior, -5.41, 5.24, 1.0, 1.7, 1.32, true);
  glazedRectangle(exterior, 4.81, 5.24, -0.7, 3.5, 1.32, true);
  // Terrace balustrades are finely scaled bronze posts with transparent infill.
  function railing(x, z, width, y = 3.42) {
    box(exterior, x, y + 0.46, z, width, 0.9, 0.025, glass).castShadow = false;
    box(exterior, x, y + 0.95, z, width, 0.035, 0.045, bronze);
    for (let i = 0; i <= 4; i++) box(exterior, x - width / 2 + width * i / 4, y + 0.47, z, 0.028, 0.95, 0.04, bronze);
  }
  railing(-3.72, 2.93, 3.35);
  railing(3.72, 2.93, 3.35);
  glazedRectangle(exterior, 5.37, 3.89, 2.08, 1.65, 0.92, true);
  box(exterior, 5.37, 4.37, 2.08, 0.035, 0.035, 1.65, bronze);

  // A low hipped clay roof covers only the central hall. Side wings remain flat.
  const roof = layer('central terracotta roof', 5.85, { lift: 0.5 });
  const roofVertices = new Float32Array([
    -2.4, 6.31, -3.17, 2.4, 6.31, -3.17, 0, 7.09, -1.15,
    2.4, 6.31, -3.17, 2.4, 6.31, 3.36, 0, 7.09, 1.35,
    2.4, 6.31, -3.17, 0, 7.09, 1.35, 0, 7.09, -1.15,
    2.4, 6.31, 3.36, -2.4, 6.31, 3.36, 0, 7.09, 1.35,
    -2.4, 6.31, 3.36, -2.4, 6.31, -3.17, 0, 7.09, -1.15,
    -2.4, 6.31, 3.36, 0, 7.09, -1.15, 0, 7.09, 1.35,
  ]);
  const roofGeometry = new THREE.BufferGeometry();
  roofGeometry.setAttribute('position', new THREE.BufferAttribute(roofVertices, 3));
  roofGeometry.computeVertexNormals();
  roofClay.side = THREE.DoubleSide;
  mesh(roofGeometry, roofClay, roof);
  box(roof, 0, 6.28, 0.1, 4.82, 0.1, 6.55, timber);
  pipe(roof, [[0, 7.11, -1.17], [0, 7.11, 1.37]], 0.06, roofRidge);
  for (const p of [[-2.4, 6.33, -3.17], [2.4, 6.33, -3.17]]) pipe(roof, [p, [0, 7.11, -1.15]], 0.045, roofRidge);
  for (const p of [[-2.4, 6.33, 3.36], [2.4, 6.33, 3.36]]) pipe(roof, [p, [0, 7.11, 1.35]], 0.045, roofRidge);
  // Fine tile courses are surface lines, avoiding hundreds of expensive tile meshes.
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = 2.4 * (1 - t);
    const y = 6.325 + 0.78 * t;
    const back = -3.17 + 2.02 * t;
    const front = 3.36 - 2.01 * t;
    for (const side of [-1, 1]) line(roof, [[side * x, y, back], [side * x, y, front]], 0x7d513e, 0.48);
    line(roof, [[-x, y, front], [x, y, front]], 0x7d513e, 0.48);
  }

  const landscape = layer('exterior works', 5.7, { lift: 0.12 });
  // Three low terraces follow the gentle fall toward the private garden.
  box(landscape, 0, -0.04, 4.25, 11.8, 0.22, 2.45, stone);
  box(landscape, 0, 0.11, 3.52, 10.95, 0.18, 0.95, stone);
  box(landscape, 0, 0.26, 3.15, 10.9, 0.18, 0.45, stone);
  box(landscape, 0, -0.11, 6.15, 18.9, 0.1, 2.6, lawn);
  box(landscape, 8.3, -0.13, 0.3, 5.45, 0.12, 11.6, stone);
  box(landscape, 8.3, -0.03, -4.85, 5.2, 0.18, 1.8, lawn);
  // The pool is entirely on the private right side, away from vehicle arrival.
  box(landscape, 8.05, -0.01, 1.25, 3.5, 0.12, 6.9, marble);
  box(landscape, 8.05, 0.052, 1.25, 3.12, 0.015, 6.5, water).castShadow = false;
  for (const z of [-1.7, -1.35, -1]) box(landscape, 8.05, 0.065, z, 2.65, 0.012, 0.025, material(0xa8bfb5, { transparent: true, opacity: 0.5 }));
  // Left arrival: two restrained parking bays and a planted screen.
  box(landscape, -8.2, 0.16, -1.75, 4.65, 0.1, 6.4, material(0xb9b5a9));
  box(landscape, -8.2, 0.16, -5.8, 4.65, 0.1, 1.8, material(0xb9b5a9));
  for (const x of [-10.25, -8.2, -6.15]) line(landscape, [[x, 0.216, -3.9], [x, 0.216, 0.8]], 0xded8c9);
  // Pergola posts stay outside the clear parking spaces.
  for (const x of [-10.35, -6.05]) for (const z of [-4.5, 0.95]) box(landscape, x, 1.55, z, 0.09, 2.7, 0.09, bronze);
  for (let z = -4.55; z <= 1; z += 0.36) box(landscape, -8.2, 2.96, z, 4.5, 0.1, 0.13, timber);
  for (const x of [-10.35, -6.05]) box(landscape, x, 2.86, -1.75, 0.12, 0.16, 5.6, bronze);
  // Discreet door and paved walk connect parking to the west side of the house.
  box(landscape, -5.92, 0.23, 1.55, 0.95, 0.15, 1.1, stone);
  box(exterior, -5.55, 1.52, 1.55, 0.055, 2.2, 1.02, timber);
  box(exterior, -5.59, 1.55, 1.88, 0.04, 0.4, 0.025, bronze);
  for (const [x, z, w, d] of [[-8.15, 3.3, 4.5, 2.2], [-8.15, 6.2, 4.5, 1.4], [0, -5.3, 10.8, 3.4]]) {
    box(landscape, x, 0.17, z, w, 0.16, d, lawn);
  }
  for (const x of [-11.05, 11.05]) box(landscape, x, -0.02, 0, 0.22, 0.38, 15.25, stone);
  box(landscape, 0, -0.19, 7.52, 22.1, 0.42, 0.22, stone);
  box(landscape, 0, 0.34, -7.52, 22.1, 0.42, 0.22, stone);
  // Olive crowns use a small number of smooth, irregular lobes, never a cone.
  function olive(x, z, scale = 1) {
    const tree = new THREE.Group();
    tree.position.set(x, 0.21, z);
    tree.scale.setScalar(scale);
    landscape.add(tree);
    pipe(tree, [[0, 0, 0], [0.12, 1.18, 0.06], [-0.08, 1.9, 0]], 0.09, timber);
    pipe(tree, [[0.1, 1.05, 0], [-0.5, 1.85, 0.12]], 0.052, timber);
    pipe(tree, [[0.1, 1.18, 0], [0.55, 1.87, -0.25]], 0.045, timber);
    for (const [px, py, pz, r] of [[0, 2.17, 0, 0.83], [-0.61, 2.04, 0.16, 0.61], [0.6, 2.11, -0.18, 0.64], [-0.2, 2.65, -0.04, 0.64], [0.1, 2.21, 0.59, 0.56]]) {
      const crown = mesh(new THREE.IcosahedronGeometry(r, 2), px < 0 ? softGreen : darkGreen, tree, px, py, pz);
      crown.scale.y = 0.78;
    }
    cylinder(tree, 0, 0.025, 0, 0.72, 0.72, 0.04, earth, 24);
  }
  olive(-8.4, 3.5, 1.04);
  olive(7.5, -4.85, 0.95);
  olive(3.65, -5.15, 1.1);
  // Restrained low planting in small drifts, clear of circulation.
  for (const [x, z] of [[-10, 5.9], [-9.45, 6.05], [-8.85, 6.05], [-7.6, 3.8], [-7.1, 3.8], [9.6, -4.9], [9.1, -4.95], [2, -5.7], [1.45, -5.65]]) {
    for (let i = 0; i < 4; i++) {
      const stem = cylinder(landscape, x + Math.cos(i * 2.4) * 0.11, 0.36, z + Math.sin(i * 2.4) * 0.1, 0.008, 0.03, 0.4 + i * 0.045, softGreen, 5);
      stem.rotation.z = (i - 1.5) * 0.14;
    }
  }
  // Two timber loungers and a quiet outdoor dining place complete handover.
  const livedIn = layer('handover details', 6.65, { lift: 0.08 });
  for (const z of [0, 2]) {
    box(livedIn, 10.25, 0.21, z, 0.68, 0.2, 1.65, timber);
    box(livedIn, 10.25, 0.33, z, 0.61, 0.07, 1.56, cream);
    const back = box(livedIn, 10.25, 0.49, z - 0.59, 0.61, 0.06, 0.6, cream);
    back.rotation.x = -0.4;
  }
  cylinder(livedIn, 2.85, 0.64, 4.35, 0.55, 0.55, 0.08, marble, 32);
  cylinder(livedIn, 2.85, 0.34, 4.35, 0.09, 0.2, 0.55, bronze, 12);
  for (const x of [2.0, 3.7]) {
    box(livedIn, x, 0.36, 4.35, 0.44, 0.1, 0.46, timber);
    box(livedIn, x + (x < 3 ? -0.2 : 0.2), 0.61, 4.35, 0.04, 0.5, 0.46, timber);
  }
  for (const x of [-1.89, 1.89]) box(livedIn, x, 1.9, 3.155, 0.065, 0.45, 0.045, warmLight);

  const ghostShell = material(0xc9bca7, { transparent: true, opacity: .08, depthWrite: false });
  const ghostSlab = material(0xc7c7bd, { transparent: true, opacity: .055, depthWrite: false });
  const sectionTraceMaterial = new THREE.LineBasicMaterial({ color: 0xd6ad8e, transparent: true, opacity: 0, depthWrite: false });
  const sectionTraceGeometry = new THREE.EdgesGeometry(arcade.geometry, 24);
  const sectionTrace = new THREE.LineSegments(sectionTraceGeometry, sectionTraceMaterial);
  sectionTrace.position.copy(arcade.position);
  scene.add(sectionTrace);
  disposables.add(sectionTraceMaterial);
  disposables.add(sectionTraceGeometry);
  const assemblies = animated.map(entry => ({
    ...entry,
    parts: entry.group.children.map(object => ({ object, restY: object.position.y })),
  }));
  const cutaway = [
    { group: shell, ghost: ghostShell, solid: masonry },
    { group: upperStructure, ghost: ghostSlab, solid: concrete },
    { group: roofStructure, ghost: ghostSlab, solid: concrete },
  ];
  let ghosting = false;
  let lastProgress = -1;

  function setCutaway(amount) {
    const inside = amount > .005;
    ghostShell.opacity = THREE.MathUtils.lerp(.98, .08, amount);
    ghostSlab.opacity = THREE.MathUtils.lerp(.98, .055, amount);
    sectionTrace.visible = inside;
    sectionTraceMaterial.opacity = .55 * amount;
    roofStructure.position.y = 1.7 * amount;
    if (inside === ghosting) return;
    ghosting = inside;
    for (const layer of cutaway) {
      for (const object of layer.group.children) {
        object.material = inside ? layer.ghost : layer.solid;
        object.castShadow = !inside;
      }
    }
  }

  function applyStage(value) {
    const stage = value * 7;
    for (const { group, from, until, lift, parts } of assemblies) {
      group.visible = stage >= from && stage < until;
      if (!group.visible || from < 0) continue;
      parts.forEach(({ object, restY }, index) => {
        const stagger = .11 * index / Math.max(parts.length - 1, 1);
        const amount = THREE.MathUtils.smoothstep(stage, from + stagger, from + stagger + .26);
        object.visible = amount > .002;
        object.position.y = restY + (1 - amount) * lift * 2.05;
      });
    }
    const section = THREE.MathUtils.smoothstep(stage, 3.47, 3.94) * (1 - THREE.MathUtils.smoothstep(stage, 5.15, 5.85));
    setCutaway(section);
    for (const object of frameGroup.children) {
      if (object.position.z >= 1) object.visible = stage > 1.8 && section < .69;
    }
    playhead.position.x = THREE.MathUtils.lerp(-10.95, 10.95, value);
    displayEdge.material.opacity = .65 + .22 * Math.sin(Math.PI * value);
    pendant.intensity = 30 * THREE.MathUtils.smoothstep(stage, 4.75, 5.2);
    canvas.dataset.stage = String(Math.round(stage));
    renderer.shadowMap.needsUpdate = true;
  }

  function updateCamera() {
    const position = currentProgress * (cameraPoses.length - 1);
    const index = Math.floor(position);
    const pose = cameraPoses[index];
    const next = cameraPoses[index + 1] ?? pose;
    const blend = THREE.MathUtils.smoothstep(position - index, 0, 1);
    const at = key => THREE.MathUtils.lerp(pose[key], next[key], blend);
    const yaw = THREE.MathUtils.clamp(at('yaw') + view.yaw + view.hoverX, -1.15, .75);
    const elevation = THREE.MathUtils.clamp(at('pitch') + view.pitch + view.hoverY, .28, 1.06);
    target.set(at('x'), at('y'), at('z'));
    const margin = 1 + .11 * Math.abs(view.yaw);
    const halfHeight = Math.max(at('height'), at('width') / aspect) * margin;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    const radius = 35;
    camera.position.set(
      Math.sin(yaw) * Math.cos(elevation) * radius + target.x,
      Math.sin(elevation) * radius + target.y,
      Math.cos(yaw) * Math.cos(elevation) * radius + target.z
    );
    camera.lookAt(target);
  }

  function follow(current, target, elapsed, friction) {
    if (reducedMotion || Math.abs(target - current) < .0004) return target;
    return THREE.MathUtils.damp(current, target, friction, elapsed);
  }

  function render(time = 0) {
    frame = 0;
    if (disposed || !enabled || !inView || document.hidden) return;
    const dt = Math.min((time - lastTime) / 1000 || 1 / 60, 0.06);
    lastTime = time;

    currentProgress = follow(currentProgress, destination, dt, 11);
    for (const key of Object.keys(view)) view[key] = follow(view[key], aim[key], dt, 12);
    if (currentProgress !== lastProgress) {
      applyStage(currentProgress);
      lastProgress = currentProgress;
    }
    updateCamera();
    renderer.render(scene, camera);

    const cameraInMotion = Object.keys(view).some(key => view[key] !== aim[key]);
    if (currentProgress !== destination || cameraInMotion) requestRender();
  }

  function requestRender() {
    if (!frame && !disposed && enabled && inView && !document.hidden) frame = requestAnimationFrame(render);
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    aspect = width / height;
    renderer.setSize(width, height, false);
    requestRender();
  }
  function setProgress(progress) {
    const value = Number(progress);
    if (!Number.isFinite(value) || disposed) return;
    destination = THREE.MathUtils.clamp(value, 0, 1);
    if (reducedMotion) currentProgress = destination;
    requestRender();
  }
  function setStage(index) { setProgress(THREE.MathUtils.clamp(Math.round(index), 0, 7) / 7); }

  let pointer = null;

  function resetHover() {
    aim.hoverX = 0;
    aim.hoverY = 0;
    requestRender();
  }

  function pointerDown(event) {
    if (event.button !== 0) return;
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: event.pointerType !== 'touch' };
    resetHover();
    if (pointer.active) {
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    }
  }
  function pointerMove(event) {
    if (!pointer && !reducedMotion && event.pointerType === 'mouse') {
      const box = canvas.getBoundingClientRect();
      aim.hoverX = ((event.clientX - box.left) / box.width - .5) * .14;
      aim.hoverY = ((event.clientY - box.top) / box.height - .5) * .07;
      requestRender();
    }
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.active) {
      const horizontal = Math.abs(event.clientX - pointer.startX);
      const vertical = Math.abs(event.clientY - pointer.startY);
      if (vertical > 9 && vertical > horizontal) { pointer = null; return; }
      if (horizontal < 12 || horizontal < vertical * 1.25) return;
      pointer.active = true;
      canvas.setPointerCapture(event.pointerId);
    }
    aim.yaw = THREE.MathUtils.clamp(aim.yaw - dx * .004, -.65, 1);
    if (event.pointerType !== 'touch') aim.pitch = THREE.MathUtils.clamp(aim.pitch + dy * .0025, -.32, .32);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    requestRender();
  }
  function pointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointer = null;
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  canvas.addEventListener('pointerleave', resetHover);
  function visibility() { if (!document.hidden) requestRender(); }
  document.addEventListener('visibilitychange', visibility);
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) requestRender();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '80px' });
  observer.observe(container);
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(container);
  resize();
  applyStage(0);
  updateCamera();
  renderer.render(scene, camera);
  onReady?.();

  return {
    setProgress,
    setStage,
    resize,
    setEnabled(value) {
      enabled = value;
      if (enabled) requestRender();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    setReducedMotion(value) { reducedMotion = Boolean(value); resetHover(); },
    rotate(direction) { aim.yaw = THREE.MathUtils.clamp(aim.yaw + direction * .18, -.65, 1); requestRender(); },
    resetView() { aim.yaw = 0; aim.pitch = 0; resetHover(); },
    destroy() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('lostpointercapture', pointerUp);
      canvas.removeEventListener('pointerleave', resetHover);
      for (const resource of disposables) resource.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
