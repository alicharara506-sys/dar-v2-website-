export const stages = [
  { id: 'site',          camera: [32, 26, 39], target: [0, 0.05, 0],  width: 38 },
  { id: 'foundations',   camera: [28, 27, 33], target: [0, -0.5, 0],  width: 31 },
  { id: 'ground-frame',  camera: [30, 23, 36], target: [0, 1, 0],     width: 32 },
  { id: 'upper-frame',   camera: [31, 24, 37], target: [0, 1.8, 0],   width: 34 },
  { id: 'infill',        camera: [26, 18, 36], target: [0, 2.1, 0],   width: 31 },
  { id: 'first-fix',     camera: [18, 27, 33], target: [0, 2.4, 0],   width: 26 },
  { id: 'finishes',      camera: [25, 17, 36], target: [0, 2.1, 0],   width: 31 },
  { id: 'handover',      camera: [31, 22, 42], target: [0, 0.8, 0],   width: 37 },
];

export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const progressAt = index => index / (stages.length - 1);
export const stageAt = progress => Math.round(clamp(progress) * (stages.length - 1));
export const ease = value => value * value * (3 - 2 * value);
export const reveal = (cursor, start, end) => ease(clamp((cursor - start) / (end - start)));

export const hotspots = [
  { id: 'water', stage: 5, at: [-4.6, 1.7, 0.5] },
  { id: 'drain', stage: 5, at: [0, 0.65, 3.1] },
  { id: 'power', stage: 5, at: [4.7, 2.1, 0.3] },
  { id: 'stone', stage: 6, at: [5.5, 2, 4.2] },
  { id: 'tile', stage: 6, at: [-1.4, 3.65, 5.45] },
];
