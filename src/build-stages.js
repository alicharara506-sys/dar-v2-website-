export const stages = [
  { id: 'site' },
  { id: 'foundations' },
  { id: 'structure' },
  { id: 'walls' },
  { id: 'services' },
  { id: 'interior-finishing', details: ['paint', 'lighting', 'marble'], imageVersion: 'interior' },
  { id: 'finishes', details: ['stone', 'tile'] },
  { id: 'handover' },
];

export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const progressAt = index => index / (stages.length - 1);
export const stageAt = progress => Math.round(clamp(progress) * (stages.length - 1));

export const buildImageSizes = '(max-width: 800px) 100vw, 70vw';

export function stageImage(index) {
  const path = '/construction/stage-' + (index + 1);
  const version = stages[index]?.imageVersion;
  const file = size => path + '-' + size + '.webp' + (version ? '?v=' + version : '');
  return {
    src: file('wide'),
    srcset: file('small') + ' 640w, ' + file('medium') + ' 1000w, ' + file('wide') + ' 1400w',
  };
}
