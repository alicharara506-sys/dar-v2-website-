import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stages } from './build-stages.js';

// Model coordinates are in metres. The front elevation faces +Z.
export function makeVilla() {
  const model = new T.Group();
  model.name = 'Mount Lebanon · Concept villa';
  const terrain = new T.Group();
  terrain.name = 'hillside';
  model.add(terrain);
  const groups = stages.map(({ id }) => {
    const group = new T.Group();
    group.name = id;
    model.add(group);
    return group;
  });
  const [site, foundations, ground, upper, infill, firstFix, finishes, handover] = groups;
  let seed = 4723;
  function rand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function grain(base, amount, pattern) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3900; i++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(43,30,19,' + rand() * amount + ')' : 'rgba(255,247,221,' + rand() * amount + ')';
      ctx.fillRect(rand() * 128, rand() * 128, 0.8 + rand() * 3, 0.5 + rand() * 1.5);
    }
    if (pattern === 'stone') {
      ctx.strokeStyle = '#8f806c';
      ctx.lineWidth = 1.15;
      for (let row = 0; row < 8; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * 16);
        ctx.lineTo(128, row * 16);
        for (let x = -16; x < 128; x += 32) {
          const offset = x + (row % 2) * 16;
          ctx.moveTo(offset, row * 16);
          ctx.lineTo(offset, row * 16 + 16);
        }
        ctx.stroke();
      }
    }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }
  function material(name, color, options = {}) {
    return new T.MeshStandardMaterial({ name, color, roughness: 0.86, ...options });
  }
  const soil = material('Exposed earth', '#ffffff', { map: grain('#77634b', 0.49) });
  const subsoil = material('Weathered limestone strata', '#93806a');
  const earth = material('Survey pad', '#ffffff', { map: grain('#9b8868', 0.28) });
  const stone = material('Coursed limestone', '#ffffff', { map: grain('#cabb9c', 0.32, 'stone') });
  const concrete = material('Cast concrete', '#ffffff', { map: grain('#a8a49a', 0.34) });
  const plaster = material('Warm white plaster', '#ede4d3');
  const mortar = material('Block mortar', '#7e7a70');
  const block = material('Hollow concrete block', '#ffffff', { map: grain('#bbb5a7', 0.55) });
  const wood = material('Timber finish and form boards', '#866045');
  const black = material('Dark aluminum', '#282a29', { metalness: 0.48 });
  const rebar = material('Reinforcement steel', '#654436', { metalness: 0.32 });
  const glass = material('Glazing', '#719197', { transparent: true, opacity: 0.57, roughness: 0.2, metalness: 0.25, depthWrite: false });
  const roof = material('Waterproof membrane', '#53575a');
  const paver = material('Terrace tile', '#ffffff', { map: grain('#cfc2a8', 0.22) });
  const line = new T.MeshBasicMaterial({ name: 'Orange survey string', color: '#ef7134', toneMapped: false });
  const whiteLine = new T.MeshBasicMaterial({ name: 'Survey reference', color: '#fff1cd', toneMapped: false });
  const light = material('Warm lighting', '#ffde9e', { emissive: '#ffbc68', emissiveIntensity: 0.8 });
  const foliage = ['#3b4d32', '#495538', '#63694a', '#75805a', '#8b8960'].map((c, i) => material('Mediterranean foliage ' + i, c, { flatShading: true }));
  const cobble = ['#b6a589', '#a79478', '#8f7e63'].map((c, i) => material('Field stone ' + i, c, { flatShading: true }));
  const boxGeometry = new T.BoxGeometry(1, 1, 1);
  const rockGeometry = new T.IcosahedronGeometry(1, 0);
  const leafGeometry = new T.IcosahedronGeometry(1, 1);
  const matrixObject = new T.Object3D();

  function put(parent, geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  function box(parent, mat, x, y, z, w, h, d) {
    return put(parent, boxGeometry, mat, x, y + h / 2, z, w, h, d);
  }
  function part(parent, name, start, end, options = {}) {
    const group = new T.Group();
    group.name = name;
    group.userData = { start, end, ...options };
    parent.add(group);
    return group;
  }
  function segment(parent, mat, a, b, radius, sides = 6) {
    const from = new T.Vector3(...a);
    const to = new T.Vector3(...b);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const length = from.distanceTo(to);
    const mesh = put(parent, new T.CylinderGeometry(radius, radius, length, sides), mat, mid.x, mid.y, mid.z);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.sub(from).normalize());
    return mesh;
  }
  function instances(parent, name, geometry, mat, transforms) {
    if (transforms.length === 0) return;
    const mesh = new T.InstancedMesh(geometry, mat, transforms.length);
    mesh.name = name;
    transforms.forEach(([x, y, z, sx, sy, sz, angle = 0], index) => {
      matrixObject.position.set(x, y, z);
      matrixObject.scale.set(sx, sy, sz);
      matrixObject.rotation.set(0, angle, 0);
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });
    parent.add(mesh);
  }

  // Sectioned terrain with an excavatable opening. The strata, fixed site and both slabs share a datum.
  box(terrain, subsoil, 0, -3.2, 0, 25.8, 0.68, 19.7);
  box(terrain, soil, 0, -2.52, 0, 25.8, 0.42, 19.7);
  box(terrain, subsoil, 0, -2.1, 0, 25.8, 0.16, 19.7);
  box(terrain, soil, 0, -1.94, 0, 25.8, 0.28, 19.7);
  box(terrain, earth, 0, -1.66, 0, 25.8, 0.07, 19.7);
  box(terrain, soil, -10.6, -1.59, 0, 4.6, 1.38, 19.7);
  box(terrain, soil, 10.6, -1.59, 0, 4.6, 1.38, 19.7);
  box(terrain, soil, 0, -1.59, -7.7, 16.6, 1.38, 4.3);
  box(terrain, soil, 0, -1.59, 7.8, 16.6, 1.38, 4.1);
  box(terrain, earth, -10.6, -0.22, 0, 4.6, 0.1, 19.7);
  box(terrain, earth, 10.6, -0.22, 0, 4.6, 0.1, 19.7);
  box(terrain, earth, 0, -0.22, -7.7, 16.6, 0.1, 4.3);
  box(terrain, earth, 0, -0.22, 7.8, 16.6, 0.1, 4.1);
  for (const [z, h, d] of [[-6.65, 0.65, 1.65], [-8.03, 1.35, 1.3], [-9.16, 2.12, 1.3]]) {
    box(terrain, soil, 0, -0.13, z, 25.78, h, d);
    box(terrain, stone, 0, -0.12, z + d / 2, 25.75, h, 0.23);
    box(terrain, earth, 0, h - 0.15, z, 25.7, 0.1, d);
  }
  for (const [x, z, w, d, h] of [[-11.4, 0, 2.9, 10.4, 0.32], [11.35, 1.0, 3, 9.9, 0.25], [-10.9, 6.2, 3.8, 2.1, 0.3]]) {
    box(terrain, stone, x, -0.13, z, w, h, d);
    box(terrain, earth, x, h - 0.14, z, w - 0.2, 0.12, d - 0.2);
  }
  const grass = foliage.map(() => []);
  const rocks = cobble.map(() => []);
  for (let i = 0; i < 610; i++) {
    const x = (rand() - 0.5) * 25.2;
    const z = (rand() - 0.5) * 19.2;
    if (Math.abs(x) < 8.55 && z > -6 && z < 8.55) continue;
    const height = z < -8.55 ? 2.03 : z < -7.38 ? 1.27 : z < -6 ? 0.55 : Math.abs(x) > 10 && z < 5.6 && z > -5.3 ? 0.22 : -0.1;
    const s = 0.06 + rand() * 0.24;
    grass[Math.floor(rand() * grass.length)].push([x, height, z, s, s * (0.6 + rand()), s * 0.8, rand() * 6]);
    if (i % 3 === 0) rocks[i % rocks.length].push([x, height - 0.035, z + 0.09, s * 0.65, s * 0.38, s * 0.68, rand() * 6]);
  }
  function olive(parent, x, y, z, s, leaves) {
    segment(parent, wood, [x, y, z], [x + 0.16 * s, y + 1.28 * s, z], 0.1 * s);
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      const xx = x + Math.cos(angle) * (0.62 + rand() * 0.45) * s;
      const zz = z + Math.sin(angle) * (0.62 + rand() * 0.45) * s;
      const yy = y + (1.4 + rand() * 0.68) * s;
      segment(parent, wood, [x + 0.12 * s, y + 0.65 * s, z], [xx, yy, zz], 0.04 * s);
      for (let j = 0; j < 5; j++) {
        const k = (0.26 + rand() * 0.24) * s;
        leaves[Math.floor(rand() * leaves.length)].push([xx + (rand() - 0.5) * 0.74 * s, yy + rand() * 0.65 * s, zz + (rand() - 0.5) * 0.74 * s, k * 1.45, k * 0.88, k * 1.32, rand() * 6]);
      }
    }
  }
  const trees = foliage.map(() => []);
  for (const [x, y, z, s] of [[-11.5,.18,-3.4,1.1],[-11.6,.18,3.6,1.18],[11.4,.18,-2.8,.92],[-10.9,.2,6.1,.8],[-9.7,1.95,-9.05,.86],[2,1.95,-9,.89],[8.2,1.2,-8,1],[11.2,1.95,-9,1.08]]) olive(terrain, x, y, z, s, trees);
  foliage.forEach((mat, i) => {
    instances(terrain, 'Hillside scrub', rockGeometry, mat, grass[i]);
    instances(terrain, 'Olive canopy', leafGeometry, mat, trees[i]);
  });
  cobble.forEach((mat, i) => instances(terrain, 'Loose limestone', rockGeometry, mat, rocks[i]));

  const surveyPad = part(site, 'Original ground', -1, -0.1, { hide: [0.05, 0.36], sink: 0.95 });
  box(surveyPad, earth, 0, -0.27, 0.09, 16.65, 0.15, 11.45);
  const marks = part(site, 'Survey strings and stakes', -1, -0.1, { hide: [0.12, 0.53] });
  for (const x of [-7.3, -2.4, 2.4, 7.3]) {
    box(marks, x === -7.3 || x === 7.3 ? line : whiteLine, x, -0.065, 0, 0.076, 0.035, 12.5);
    for (const z of [-5.05, 0, 5.05]) {
      box(marks, wood, x, -0.13, z, 0.09, 0.45, 0.09);
      box(marks, line, x, 0.32, z, 0.14, 0.05, 0.14);
    }
  }
  for (const z of [-5.05, 0, 5.05]) {
    box(marks, line, 0, -0.057, z, 17.5, 0.032, 0.076);
    for (const x of [-8.6, 8.6]) {
      box(marks, whiteLine, x, -0.074, z, 0.52, 0.028, 0.04);
      box(marks, whiteLine, x, -0.074, z, 0.04, 0.028, 0.52);
    }
  }

  const columns = [[-7.1,-4.7],[-2.35,-4.7],[2.35,-4.7],[7.1,-4.7],[-7.1,0],[2.35,0],[7.1,0],[-7.1,4.6],[-2.35,4.6],[2.35,4.6],[7.1,4.6]];
  const forms = part(foundations, 'Foundation formwork and reinforcement', 0.33, 0.6, { hide: [1.02, 1.45], lift: 0.5 });
  for (const [x, z] of columns) {
    for (const dx of [-0.24, 0.24]) for (const dz of [-0.24, 0.24]) {
      segment(forms, rebar, [x + dx, -1.45, z + dz], [x + dx, 0.33, z + dz], 0.026);
    }
    for (const y of [-1.12, -0.82, -0.52, -0.22, 0.08]) {
      box(forms, rebar, x, y, z - 0.25, 0.53, 0.027, 0.027);
      box(forms, rebar, x, y, z + 0.25, 0.53, 0.027, 0.027);
      box(forms, rebar, x - 0.25, y, z, 0.027, 0.027, 0.53);
      box(forms, rebar, x + 0.25, y, z, 0.027, 0.027, 0.53);
    }
  }
  for (const z of [-4.7, 4.6]) for (const offset of [-0.36, 0.36]) box(forms, wood, 0, -1.16, z + offset, 15.15, 0.58, 0.09);
  const pour = part(foundations, 'Concrete footings and grade beams', 0.6, 0.98, { pivot: -1.56, grow: true });
  for (const [x, z] of columns) {
    box(pour, concrete, x, -1.56, z, 1.57, 0.32, 1.55);
    box(pour, concrete, x, -1.24, z, 0.66, 0.98, 0.65);
  }
  for (const z of [-4.7, 0, 4.6]) box(pour, concrete, 0, -1.09, z, 14.85, 0.55, 0.56);
  for (const x of [-7.1, 2.35, 7.1]) box(pour, concrete, x, -1.09, -0.05, 0.56, 0.55, 9.9);
  const pad = part(foundations, 'Central ground slab', 0.78, 1, { lift: 0.48 });
  box(pad, concrete, -1.6, -0.28, -0.95, 11.7, 0.28, 7.95);
  const fullPad = part(ground, 'Ground slab perimeter', 1.04, 1.27, { lift: 0.42 });
  box(fullPad, concrete, 5.4, -0.28, -0.95, 2.3, 0.28, 7.95);
  box(fullPad, concrete, 0, -0.28, 4.07, 15.2, 0.28, 2.1);
  box(fullPad, concrete, 0, -0.28, -5.01, 15.2, 0.28, 0.16);
  for (const x of [-7.95, 7.95]) box(fullPad, earth, x, -1.59, 0.09, 0.7, 1.46, 11.44);
  box(fullPad, earth, 0, -1.59, -5.36, 15.2, 1.46, 0.53);
  box(fullPad, earth, 0, -1.59, 5.47, 15.2, 1.46, 0.7);

  const storey = 3.48;
  function stairs(parent, base, start, direction) {
    const stair = part(parent, 'Concrete stair flight', start, start + 0.32, { lift: 0.5 });
    for (let j = 0; j < 17; j++) {
      const top = base + (j + 1) * 0.195;
      const z = direction * (3.84 - j * 0.27) - 0.8;
      box(stair, concrete, 0.05, top - 0.35, z, 1.36, 0.35, 0.29);
    }
    box(stair, concrete, 0.05, base + 3.2, direction * -1.02 - 0.8, 1.4, 0.28, 1.3);
  }
  for (const [floor, parent] of /** @type {[number, T.Group][]} */ ([[0, ground], [1, upper]])) {
    const base = floor * storey;
    const start = floor + 1;
    columns.forEach(([x, z], i) => {
      const col = part(parent, 'Concrete pier ' + (i + 1), start + 0.16 + i * 0.021, start + 0.48 + i * 0.021, { grow: true, pivot: base });
      box(col, concrete, x, base, z, 0.47, 3.15, 0.47);
    });
    stairs(parent, base, start + 0.48, floor === 0 ? 1 : -1);
    const front = part(parent, 'Front beam and slab', start + 0.66, start + 0.96, { lift: 1.25, cut: floor === 1 ? 0.02 : 0.45 });
    const back = part(parent, 'Rear beam and slab', start + 0.69, start + 0.99, { lift: 1.45, cut: floor === 1 ? 0.13 : undefined });
    const level = base + storey;
    box(front, concrete, 0, level - 0.59, 4.6, 15.3, 0.43, 0.48);
    box(back, concrete, 0, level - 0.59, -4.7, 15.3, 0.43, 0.48);
    box(back, concrete, 0, level - 0.59, 0, 15.3, 0.43, 0.46);
    for (const x of [-7.1, 2.35, 7.1]) {
      box(front, concrete, x, level - 0.58, 2.3, 0.43, 0.41, 4.62);
      box(back, concrete, x, level - 0.58, -2.35, 0.43, 0.41, 4.68);
    }
    // Leave a fixed opening next to the stair landing.
    box(front, concrete, -4.2, level - 0.29, 2.7, 6.9, 0.29, 5.4);
    box(front, concrete, 4.18, level - 0.29, 2.7, 6.95, 0.29, 5.4);
    box(front, concrete, 0, level - 0.29, 4.53, 1.52, 0.29, 1.74);
    box(back, concrete, 0, level - 0.29, -2.6, 15.3, 0.29, 5.2);
    if (floor === 1) {
      box(front, concrete, 0, level, 5.31, 15.3, 0.5, 0.19);
      box(back, concrete, 0, level, -5.1, 15.3, 0.5, 0.19);
      for (const x of [-7.54, 7.54]) box(back, concrete, x, level, 0.1, 0.19, 0.5, 10.3);
    }
  }

  const bays = [];
  for (const y of [0, storey]) {
    bays.push({ x: 0, y, z: -4.72, length: 14.45, angle: 0 });
    bays.push({ x: 7.13, y, z: -1.68, length: 5.94, angle: Math.PI / 2 });
    bays.push({ x: -7.13, y, z: -2.15, length: 5, angle: Math.PI / 2 });
    bays.push({ x: -5.2, y, z: 4.62, length: 1.38, angle: 0, cut: true });
    bays.push({ x: 5.38, y, z: 4.62, length: 2.55, angle: 0, cut: true });
    bays.push({ x: 2.42, y, z: -0.28, length: 3.8, angle: Math.PI / 2 });
    bays.push({ x: -4.65, y, z: 0.35, length: 3.9, angle: 0, cut: true });
  }
  const hollow = mergeGeometries([
    new T.BoxGeometry(1, 1, 0.22).translate(0, 0, -0.39),
    new T.BoxGeometry(1, 1, 0.22).translate(0, 0, 0.39),
    ...[-0.4, 0, 0.4].map(x => new T.BoxGeometry(0.2, 1, 0.56).translate(x, 0, 0)),
  ]);
  bays.forEach(({ x, y, z, length, angle, cut }, index) => {
    const isBack = z === -4.72;
    const sections = isBack ? [[-5.1, 4.2], [0, 3.7], [5.1, 4.2]] : [[0, length]];
    for (let course = 0; course < 12; course++) {
      const row = part(infill, 'Block course ' + (index + 1) + '.' + (course + 1), 3.02 + course * 0.061 + (y > 0 ? 0.12 : 0), 3.14 + course * 0.061 + (y > 0 ? 0.12 : 0), { lift: 0.38, cut: cut ? 0.04 : undefined });
      row.position.set(x, y, z);
      row.rotation.y = angle;
      const cy = course * 0.249 + 0.126;
      const blocks = [];
      for (const [middle, size] of sections) {
        for (let cursor = middle - size / 2; cursor < middle + size / 2 - 0.06;) {
          const first = cursor === middle - size / 2;
          const width = Math.min(first && course % 2 === 1 ? 0.25 : 0.48, middle + size / 2 - cursor);
          blocks.push([cursor + width / 2, cy, 0, width - 0.015, 0.232, 0.22]);
          cursor += width;
        }
        if (course < 11) box(row, mortar, middle, cy + 0.115, 0, size, 0.016, 0.213);
      }
      instances(row, 'Hollow block units', hollow, block, blocks);
    }
  });

  const mep = part(firstFix, 'Water, waste and electrical first fix', 4.29, 4.98, { lift: 0.62 });
  const water = material('Cold water supply', '#2b82bb');
  const hot = material('Hot water supply', '#b94331');
  const waste = material('PVC drainage', '#54596b');
  const wire = material('Electrical conduit', '#e0a740');
  function run(mat, radius, points) {
    for (let i = 0; i < points.length - 1; i++) segment(mep, mat, points[i], points[i + 1], radius, 10);
  }
  for (const [offset, mat] of /** @type {[number, T.MeshStandardMaterial][]} */ ([[0, water], [0.25, hot]])) {
    run(mat, 0.052, [[-6.2 + offset,0.18,3.75],[-6.2 + offset,0.18,0.55],[-4.7 + offset,0.18,0.55],[-4.7 + offset,4.8,0.55],[-5.95 + offset,4.8,0.55]]);
    run(mat, 0.052, [[-4.7 + offset,0.18,0.55],[-4.7 + offset,1.28,0.55],[-5.85 + offset,1.28,0.55]]);
  }
  run(waste, 0.13, [[-3.65,5.6,0.64],[-3.65,0.52,0.64],[-3.65,0.45,3.07],[1.3,0.29,3.07],[1.3,0.18,5.45]]);
  run(waste, 0.095, [[-5.7,0.64,1.65],[-5.7,0.57,0.64],[-3.65,0.52,0.64]]);
  for (const [z, y] of [[0.22,2.85],[0.35,2.98],[0.48,3.09]]) {
    run(wire, 0.044, [[4.72,1.6,z],[4.72,y,z],[2.35,y,z],[2.35,y,3.1],[0.55,y,3.1]]);
  }
  run(wire, 0.045, [[4.72,2.1,0.33],[4.72,5.8,0.33],[6.35,5.8,0.33],[6.35,5.8,2.65]]);
  box(mep, black, 4.72, 1.42, 0.31, 0.59, 0.72, 0.24);
  box(mep, concrete, 4.72, 1.48, 0.465, 0.48, 0.58, 0.1);
  for (const x of [0.55,2.35,6.35]) box(mep, black, x, x === 6.35 ? 5.65 : 2.76, x === 6.35 ? 2.65 : 3.1, 0.23, 0.18, 0.23);
  mep.userData.hide = [5.14, 5.62];

  const waterproof = part(finishes, 'Roof and terrace waterproofing', 5.12, 5.43, { lift: 0.45 });
  box(waterproof, roof, 0, 6.966, -0.03, 14.82, 0.052, 10.15);
  box(waterproof, roof, -1.25, storey + 0.013, 5.72, 12.7, 0.058, 1.65);
  const envelope = part(finishes, 'Limestone, render and balcony edges', 5.32, 5.69, { lift: 0.65 });
  for (const { x, y, z, length, angle } of bays) {
    if (z === -4.72) {
      for (const [xx, width] of [[-5.1, 4.24],[0,3.74],[5.1,4.24]]) box(envelope, plaster, xx, y, z - 0.11, width, 3.12, 0.12);
    } else {
      const wall = box(envelope, z === 4.62 && x > 0 ? stone : plaster, x, y, z, length + 0.03, 3.13, 0.37);
      wall.rotation.y = angle;
    }
  }
  for (const y of [0, storey]) {
    for (const x of [-7.1, 7.1]) box(envelope, plaster, x, y, 4.6, 0.56, 3.26, 0.54);
    box(envelope, plaster, 0, y + 3.12, 5.38, 15.55, 0.42, 0.23);
  }
  box(envelope, plaster, -1.25, storey - 0.26, 5.72, 12.9, 0.27, 1.72);
  box(envelope, plaster, -1.25, 2 * storey - 0.26, 5.72, 12.9, 0.28, 1.72);
  box(envelope, plaster, -7.55, storey, 5.8, 0.29, 3.51, 1.39);
  box(envelope, plaster, 5.04, storey, 5.8, 0.29, 3.51, 1.39);
  box(envelope, plaster, 0, 7.43, 0.1, 15.38, 0.08, 10.6);
  box(envelope, roof, 0, 7.515, 0.1, 14.82, 0.04, 10.05);

  const windows = part(finishes, 'Aluminum glazing and terrace rails', 5.52, 5.91, { lift: 0.52 });
  function windowBay(parent, x, y, z, width, height, panes, rotation = 0, rail = false) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotation;
    parent.add(group);
    for (let i = 0; i < panes; i++) {
      box(group, glass, (i + 0.5) * width / panes - width / 2, 0.05, 0, width / panes - 0.057, height - 0.085, 0.025);
    }
    for (let i = 0; i <= panes; i++) box(group, black, i * width / panes - width / 2, 0, 0.015, 0.045, height, 0.077);
    box(group, black, 0, height - 0.045, 0.015, width + 0.05, 0.05, 0.086);
    if (!rail) box(group, black, 0, 0, 0.015, width + 0.05, 0.04, 0.086);
  }
  for (const y of [0.08, storey + 0.08]) {
    windowBay(windows, -0.76, y, 4.72, 7.4, 2.94, 5);
    windowBay(windows, -6.43, y, 4.71, 1.06, 2.94, 1);
    windowBay(windows, 6.79, y, 4.71, 0.5, 2.94, 1);
    windowBay(windows, 7.17, y, 2.89, 3.48, 2.94, 2, Math.PI / 2);
    windowBay(windows, -7.17, y, 2.34, 4.26, 2.94, 3, Math.PI / 2);
  }
  windowBay(windows, -1.24, storey + 0.11, 6.49, 12.1, 0.97, 7, 0, true);
  for (let j = 0; j < 13; j++) box(windows, wood, 3.22 + j * 0.115, storey + 0.12, 5.04, 0.045, 3.02, 0.18);
  const details = part(finishes, 'Tile, ceilings, plaster and lighting', 5.55, 6, { lift: 0.38 });
  const tiles = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 21; i++) tiles.push([-7.4 + i * 0.609, storey + 0.102, 5.14 + j * 0.548, 0.596, 0.045, 0.534]);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 14; i++) tiles.push([-6.8 + i * 0.99, 0.018, -4.45 + j * 0.79, 0.974, 0.035, 0.779]);
  instances(details, 'Terrace and interior tiles', boxGeometry, paver, tiles);
  for (const y of [0, storey]) {
    box(details, plaster, -3.52, y + 2.98, 1.6, 6.8, 0.085, 5.75);
    box(details, plaster, 4.48, y + 2.98, 1.6, 4.9, 0.085, 5.75);
    for (const x of [-5.7,-2.8,3.5,6.2]) {
      box(details, light, x, y + 2.975, 3.95, 0.15, 0.035, 0.15);
      box(details, light, x, y + 3.13, 5.26, 0.14, 0.035, 0.14);
    }
    box(details, wood, -5.1, y + 0.04, -2.55, 2.65, 0.9, 0.67);
    box(details, paver, -5.1, y + 0.94, -2.55, 2.73, 0.085, 0.75);
  }
  box(details, wood, -4.95, 0.055, 2.75, 2.42, 0.3, 0.85);
  box(details, plaster, -4.95, 0.36, 2.75, 2.31, 0.24, 0.78);
  box(details, plaster, -4.95, 0.49, 2.4, 2.31, 0.39, 0.22);
  box(details, wood, -3.25, 0.045, 3.3, 0.75, 0.46, 0.55);

  const gardens = part(handover, 'Drive, entrance terraces and planting', 6.06, 7, { lift: 0.48 });
  box(gardens, stone, 0, -0.18, 6.22, 16.4, 0.17, 2.1);
  box(gardens, mortar, 4.95, -0.13, 8.25, 6.3, 0.14, 3.15);
  box(gardens, stone, -4.65, -0.17, 7.5, 5.9, 0.35, 1.15);
  box(gardens, soil, -4.65, 0.18, 7.5, 5.55, 0.11, 0.91);
  const paving = [];
  for (let j = 0; j < 12; j++) for (let i = 0; i < 18; i++) {
    paving.push([1.98 + i * 0.337 + (j % 2) * 0.06, 0.024, 6.87 + j * 0.254, 0.325, 0.04, 0.244]);
  }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 22; i++) paving.push([-8 + i * 0.756, 0.014, 5.36 + j * 0.46, 0.743, 0.05, 0.446]);
  instances(gardens, 'Driveway and terrace pavers', boxGeometry, paver, paving);
  for (let i = 0; i < 6; i++) box(gardens, concrete, -0.85, -0.08 + i * 0.029, 8.38 - i * 0.33, 2.07, 0.09, 0.34);
  const planting = foliage.map(() => []);
  olive(gardens, -6.45, 0.28, 7.53, 0.63, planting);
  for (let i = 0; i < 125; i++) {
    const x = -7.33 + rand() * 5.38;
    const z = 7.1 + rand() * 0.76;
    const s = 0.075 + rand() * 0.15;
    planting[i % planting.length].push([x, 0.29, z, s, s * 1.35, s, rand() * 6]);
  }
  foliage.forEach((mat, i) => instances(gardens, 'Terrace plants', leafGeometry, mat, planting[i]));
  for (const x of [-7.8,-1.8,1.7,8]) {
    box(gardens, black, x, 0.02, 7.17, 0.105, 0.46, 0.105);
    box(gardens, light, x, 0.43, 7.17, 0.107, 0.05, 0.107);
  }
  return model;
}
