export const stages = [
  { id: 'site' },
  { id: 'foundations' },
  { id: 'ground-frame' },
  { id: 'upper-frame' },
  { id: 'infill' },
  { id: 'interior-finishing', details: ['paint', 'lighting', 'marble'], imageVersion: 'interior' },
  { id: 'finishes', details: ['stone', 'tile'] },
  { id: 'handover' },
];

export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const progressAt = index => index / (stages.length - 1);
export const stageAt = progress => Math.round(clamp(progress) * (stages.length - 1));

export const buildImageSizes = '(max-height: 550px) and (orientation: landscape) 57vw, (max-width: 700px) calc(100vw - 40px), (max-width: 1512px) 55vw, 840px';

export function stageImage(index) {
  const path = '/villa/stage-' + (index + 1);
  const version = stages[index]?.imageVersion;
  const file = size => path + '-' + size + '.webp' + (version ? '?v=' + version : '');
  return {
    src: file('wide'),
    srcset: file('small') + ' 640w, ' + file('medium') + ' 1000w, ' + file('wide') + ' 1670w',
  };
}
