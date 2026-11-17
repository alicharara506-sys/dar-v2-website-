import { experienceCopy } from './experience-content.js';
import { serviceContent, serviceKeys, serviceLabels } from './service-content.js';
import { servicePath } from './service-pages.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

// Layers share a projection so the drawing reads as a single assembly.
const project = ([x, y, z]) => [400 + (x - y) * 30, 357 + (x + y) * 15 - z * 32];
const points = vertices => vertices.map(vertex => project(vertex).join(',')).join(' ');
const polygon = (vertices, attributes) => `<polygon points="${points(vertices)}" ${attributes}/>`;
const line = (vertices, attributes = '') => `<polyline points="${points(vertices)}" fill="none" ${attributes}/>`;
const datum = 'stroke="#a79b90" stroke-opacity=".5" stroke-dasharray="3 6"';
const hot = 'stroke="#ee693b" stroke-width="2.4"';
const detail = 'stroke="#dcccc0" stroke-opacity=".56" stroke-width=".8"';
const stone = ['#bcb1a5', '#625a51', '#8c8176'];
const dark = ['#53504c', '#262524', '#383532'];
const amber = ['#e66639', '#883519', '#bb481f'];

function volume(x, y, z, width, depth, height, colors = stone) {
  const right = x + width;
  const front = y + depth;
  const top = z + height;
  const faces = [
    [[right, y, top], [right, front, top], [right, front, z], [right, y, z]],
    [[x, front, top], [right, front, top], [right, front, z], [x, front, z]],
    [[x, y, top], [right, y, top], [right, front, top], [x, front, top]],
  ];
  return faces.map((face, index) => polygon(face,
    `fill="${colors[[1, 2, 0][index]]}" stroke="#f2e6d8" stroke-width=".65" stroke-opacity=".22"`,
  )).join('');
}

function floorPlan(z, fill = 'none') {
  const outline = [[-5,-3,z],[5,-3,z],[5,3,z],[-5,3,z],[-5,-3,z]];
  return polygon(outline, `fill="${fill}" stroke="#b8aba0" stroke-width="1" stroke-opacity=".64"`)
    + line([[-1,-3,z],[-1,-.8,z],[1,-.8,z],[1,1,z],[5,1,z]], detail)
    + line([[-5,-1,z],[-2.5,-1,z]], detail)
    + line([[-2.5,1,z],[-2.5,3,z]], detail)
    + line([[2.8,-3,z],[2.8,-1.6,z]], detail)
    + line([[-5,3,z],[-5,-3,z],[5,-3,z]], hot);
}

function construction() {
  const columns = [[-4.8,-2.8],[0,-2.8],[-4.8,2.5],[4.4,-2.8],[0,2.5],[4.4,2.5]];
  const posts = z => columns.map(([x,y]) => volume(x,y,z,.42,.4,2.68)).join('');
  const rim = z => volume(-5,-3,z,10,.36,.35)
    + volume(-5,-3,z,.36,6,.35)
    + volume(4.64,-3,z,.36,6,.35)
    + volume(-5,2.64,z,10,.36,.35);
  const roofJoists = [-4.1,-2.7,-1.3,.1,1.5,2.9,4.3].map(x => volume(x,-2.62,5.7,.13,5.24,.14,dark)).join('');
  return `<g class="atlas-ground">${volume(-5.3,-3.3,0,10.6,6.6,.06,amber)}${volume(-5.3,-3.3,.06,10.6,6.6,.34)}</g>
    <g class="atlas-rise">${posts(.39)}${volume(-5,-3,2.9,10,6,.35)}${posts(3.2)}${rim(5.7)}${roofJoists}
      ${volume(-5,-3,6.37,5.4,6,.17)}${volume(.42,-3,6.37,1.28,6,.17,dark)}
      ${line([[-5,-3,6.58],[-5,3,6.58],[1.7,3,6.58]],hot)}
      ${line([[-5,-3,6.37],[-5,-3,5.9]],datum)}${line([[1.7,3,6.37],[1.7,3,5.9]],datum)}
    </g>`;
}

function finishing() {
  const tileGrid = Array.from({ length: 7 }, (_, index) => {
    const x = -4.46 + index * 1.28;
    return line([[x,-2.6,3.58],[x,2.65,3.58]],detail);
  }).join('') + Array.from({ length: 4 }, (_, index) => {
    const y = -1.55 + index * 1.05;
    return line([[-4.46,y,3.58],[4.48,y,3.58]],detail);
  }).join('');
  const backWall = volume(-4.46,-2.6,3.6,8.95,.22,2.38,['#c6b0a2','#71625b','#b7a196']);
  const panel = volume(-4.46,-2.31,3.6,.17,2.45,2.38,['#d2c2b2','#aa8c79','#98816d']);
  const slats = Array.from({length: 13}, (_, index) => volume(-4.5,-2.25+index*.18,3.65,.14,.048,2.25,['#bd9782','#6c4334','#9a715d'])).join('');
  return `<g class="atlas-ground">${volume(-5,-3,.1,10,6,.23,dark)}${volume(-4.85,-2.9,1.05,9.7,5.8,.13,amber)}${volume(-4.74,-2.8,2.2,9.48,5.6,.2)}</g>
    <g class="atlas-rise">${volume(-4.46,-2.6,3.4,8.94,5.25,.18,['#c5b2a1','#857165','#a89482'])}${tileGrid}${backWall}${panel}${slats}
      ${line([[4.48,-2.6,.32],[4.48,-2.6,3.43]],datum)}${line([[4.48,2.65,.32],[4.48,2.65,3.43]],datum)}
      ${line([[-4.46,2.65,3.63],[4.48,2.65,3.63],[4.48,-2.6,3.63]],hot)}
    </g>`;
}

function conduit(vertices, color, width = 5) {
  const join = 'stroke-linecap="round" stroke-linejoin="round"';
  return line(vertices, `${join} stroke="#0f0e0d" stroke-width="${width + 3}"`)
    + line(vertices, `${join} stroke="${color}" stroke-width="${width}"`)
    + line(vertices, `${join} class="atlas-flow" stroke="#fff5da" stroke-width="1.3"`);
}

function plumbing() {
  return `<g class="atlas-ground">${volume(-5.1,-3.1,.02,10.2,6.2,.22,dark)}${floorPlan(.25,'#2c2926')}</g>
    <g class="atlas-rise">
    ${volume(-4.35,-2.42,.26,1.86,1.6,.45)}${volume(-1.85,-2.42,.26,1.3,1.6,.45)}${volume(2.68,1.2,.26,1.86,1.3,.43)}
    ${conduit([[-3.4,-1.7,.72],[-3.4,-1.7,2.1],[3.75,-1.7,2.1],[3.75,1.8,2.1],[3.75,1.8,.73]],'#f47750')}
    ${conduit([[-3.18,-1.42,.72],[-3.18,-1.42,2.55],[4,-1.42,2.55],[4,1.8,2.55],[4,1.8,.73]],'#78aeb5')}
    ${conduit([[-1.15,-1.58,.71],[-1.15,-1.58,2.55],[-1.15,-1.42,2.55]],'#78aeb5')}
    ${conduit([[-3.6,-1.2,.62],[-3.6,-1.2,1.2],[-3.6,2.1,1.02],[4.5,2.1,.81],[4.5,2.1,.25]],'#ab9f93',7)}
    ${volume(-4.3,-2.25,1.15,.35,.38,2.8,amber)}
    ${line([[-4.3,-2.25,4.3],[-4.3,2.3,4.3],[4.45,2.3,4.3]],datum)}
    ${line([[4.45,2.3,4.3],[4.45,2.3,.4]],datum)}
    </g>`;
}

function electrical() {
  const fixtures = [[-3.1,1.5],[.45,1.5],[3.8,1.5]];
  const ceiling = [[-5,-3,4.66],[5,-3,4.66],[5,3,4.66],[-5,3,4.66],[-5,-3,4.66]];
  return `<g class="atlas-ground">${volume(-5.1,-3.1,.02,10.2,6.2,.19,dark)}${floorPlan(.22,'#282624')}</g>
    <g class="atlas-rise">${line(ceiling,datum)}${volume(-4.7,-2.65,.2,.54,.65,2.13)}
      ${volume(-4.62,-1.98,1.2,.41,.18,.82,amber)}
      ${conduit([[-4.42,-1.8,1.64],[-4.42,-1.8,4.14],[-4.42,1.5,4.14],[3.8,1.5,4.14]],'#be8f68',4)}
      ${conduit([[-4.42,-1.8,4.14],[3.8,-1.8,4.14],[3.8,.6,4.14],[3.8,.6,1.1]],'#e3774f',4)}
      ${fixtures.map(([x,y]) => {
        const [cx,cy] = project([x,y,3.67]);
        return line([[x,y,4.14],[x,y,3.72]],'stroke="#ce9a76" stroke-width="2"')
          + `<circle class="atlas-lamp" cx="${cx}" cy="${cy}" r="20" fill="url(#atlas-glow-electrical)"/>`
          + `<circle cx="${cx}" cy="${cy}" r="3" fill="#fff3cc"/>`;
      }).join('')}
      ${line([[-5,-3,.22],[-5,-3,4.66]],datum)}${line([[5,3,.22],[5,3,4.66]],datum)}
    </g>`;
}

function design() {
  const layers = [.5,2.65,4.85];
  const risers = [[-5,-3],[-5,3],[5,-3],[5,3]].map(([x,y]) => line([[x,y,.25],[x,y,5.26]],datum)).join('');
  return `<g class="atlas-ground">${volume(-5.15,-3.15,.04,10.3,6.3,.19,dark)}</g>
    <g class="atlas-rise">${risers}${layers.map((z,index) => `<g class="atlas-plan" style="--layer:${index}">${floorPlan(z,['#36322e','#3f3830','#4b4036'][index])}</g>`).join('')}
      ${line([[-5,-3,5.28],[5,-3,5.28],[5,3,5.28]],hot)}
      ${line([[-5,-3,5.36],[-5,3,5.36]],detail)}
      ${line([[-5,-3,5.58],[-5,3,5.58]],datum)}
    </g>`;
}

const drawings = [construction, finishing, plumbing, electrical, design];

function renderDrawing(key, index, hidden = false) {
  const isElectrical = key === 'electrical';
  return `<svg viewBox="0 0 800 540" class="atlas-drawing" data-atlas-drawing="${index}" aria-hidden="true" focusable="false"${hidden ? ' hidden' : ''}>
    <defs>${isElectrical ? `<radialGradient id="atlas-glow-electrical"><stop stop-color="#ffd28f" stop-opacity=".8"/><stop offset="1" stop-color="#ff9e56" stop-opacity="0"/></radialGradient>` : ''}</defs>
    <g class="atlas-grid">${Array.from({length:15},(_, i) => {
      const d = i - 7;
      return line([[d,-5,0],[d,5,0]], detail) + line([[-7,d*.72,0],[7,d*.72,0]], detail);
    }).join('')}</g>
    <g class="atlas-plinth">${volume(-6.15,-4,0,12.3,8,-.19,['#33302d','#191715','#26231f'])}
    ${line([[-6.15,-4,0],[-6.15,4,0],[6.15,4,0],[6.15,-4,0]],'stroke="#bfb0a0" stroke-opacity=".44"')}</g>
    ${drawings[index]()}
    <path class="atlas-corner-marks" d="M31 60V30H62M738 30H769V60M31 480V510H62M738 510H769V480" fill="none" stroke="#a49180" stroke-opacity=".44"/>
  </svg>`;
}

export function renderServiceDrawing(key) {
  const index = serviceKeys.indexOf(key);
  return index < 0 ? '' : `<div class="atlas-visual service-detail-visual" aria-hidden="true">${renderDrawing(key, index)}</div>`;
}

export function renderServiceAtlas(locale) {
  const copy = experienceCopy[locale];
  const services = serviceContent[locale];
  return `<section class="service-atlas" id="services" aria-labelledby="services-title">
    <div class="wrap">
      <div class="atlas-heading">
        <p class="eyebrow">${escape(copy.serviceLabel)}</p>
        <h2 id="services-title">${escape(copy.serviceTitle).replace(/\n/g, '<br>')}</h2>
        <p>${escape(copy.serviceText)}</p>
      </div>
      <div class="atlas-layout" data-service-atlas>
        <div class="atlas-visual" aria-hidden="true">${serviceKeys.map((key, index) => renderDrawing(key, index, index !== 0)).join('')}</div>
        <div class="atlas-tabs" role="tablist" aria-orientation="vertical" aria-label="${escape(serviceLabels[locale].services)}" hidden>
          ${serviceKeys.map((key, index) => `<button type="button" role="tab" id="atlas-tab-${index}" aria-controls="atlas-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-atlas-tab="${index}">${escape(services[key].title)}<span aria-hidden="true"></span></button>`).join('')}
        </div>
        <div class="atlas-panels">
          ${serviceKeys.map((key, index) => `<div id="atlas-panel-${index}" class="atlas-panel">
            <h3 class="atlas-fallback-title">${escape(services[key].title)}</h3><p>${escape(services[key].summary)}</p>
            <a class="service-row atlas-link" href="${servicePath(locale,key)}">${escape(copy.read)} <span class="sr-only">${escape(services[key].title)}</span><span aria-hidden="true">↗</span></a>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}
