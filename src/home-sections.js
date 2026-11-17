import { experienceCopy, newStageCopy } from './experience-content.js';
import { renderServiceAtlas } from './service-atlas.js';
import { stages, stageImage } from './build-stages.js';

const t = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines = v => t(v).replace(/\n/g,'<br>');
const arrow = '<span aria-hidden="true">↗</span>';
export function residencePicture({className='', eager=false}={}) {
  return `<picture class="${className}"><source media="(max-width: 600px)" srcset="/residence/villa-mobile-small.webp 640w, /residence/villa-mobile.webp 1024w" sizes="100vw"><img src="/residence/villa-wide.webp" srcset="/residence/villa-medium.webp 1000w, /residence/villa-wide.webp 1536w" sizes="100vw" width="1536" height="1024" alt="" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async"></picture>`;
}
export function renderHero(locale, data) {
  const c=experienceCopy[locale];
  const sceneHint = {en:'Drag to rotate', ar:'اسحب للتدوير', fr:'Glissez pour tourner'}[locale];
  return `<section class="opening" aria-labelledby="headline">
    <div class="wrap opening-grid">
      <div class="opening-copy">
        <p class="eyebrow opening-location"><span class="status-dot"></span>${t(data.location)}</p>
        <h1 id="headline"><span><strong>${t(data.headline[0])}</strong></span><span><em>${t(data.headline[1])}</em></span></h1>
        <p class="opening-lede">${t(data.hero)}</p>
        <a class="opening-action" href="#build"><span>${t(data.explore)}</span><span aria-hidden="true">↓</span></a>
      </div>
      <figure class="opening-art" aria-hidden="true">
        <div class="hero-fallback"><img src="/icons/icon-symbol-orange.svg" width="35" height="88" alt=""></div>
        <div class="hero-scene" id="hero-scene"></div>
        <figcaption class="hero-interaction"><span></span>${sceneHint}</figcaption>
      </figure>
    </div>
    <div class="wrap opening-foot" aria-hidden="true"><span></span></div>
  </section>
  <section class="intro-statement" aria-labelledby="intro-title"><div class="wrap intro-inner">
    <p class="eyebrow">${t(c.introLabel)}</p>
    <div><h2 id="intro-title">${lines(c.introTitle)}</h2><p class="intro-lede">${t(c.introText)}</p></div>
    <div class="intro-datum" aria-hidden="true"><span></span><i></i></div>
  </div></section>`;
}
export function renderBuildStudy(locale,data) {
  const c=experienceCopy[locale], image=stageImage(0), names=newStageCopy[locale];
  return `<section class="build-study" id="build" aria-labelledby="build-title"><div class="wrap section-heading build-heading"><p class="eyebrow">${t(c.buildLabel)}</p><h2 id="build-title">${lines(c.buildTitle)}</h2><div><p>${t(c.buildText)}</p><a href="#services" class="text-link">${t(c.skip)} ↓</a></div></div>
    <div class="experience-track" id="experience"><div class="experience wrap" id="experience-panel" data-stage="site"><div class="scene-layout"><div class="scene-main"><div class="scene-toolbar"><span class="eyebrow">${t(c.view)}</span><div><button id="still-toggle" type="button" aria-pressed="false">${t(c.still)}</button><button id="reset-view" type="button">${t(c.reset)}</button></div></div><div class="viewport" id="villa-viewport"><img src="${image.src}" srcset="${image.srcset}" sizes="(max-width: 800px) 100vw, 70vw" alt="" width="1400" height="1000" id="stage-poster" class="stage-frame" data-frame="0" loading="lazy"><div id="villa-canvas" class="villa-canvas"></div><p id="stage-image-status" class="sr-only" role="status"></p><div class="scene-coordinate" aria-hidden="true"><span>N</span><i>↑</i></div></div><div class="scene-footnote"><span id="scene-hint">${t(c.drag)}</span><div><button type="button" id="rotate-left" aria-label="${t(c.rotateLeft)}">↶</button><button type="button" id="rotate-right" aria-label="${t(c.rotateRight)}">↷</button></div></div></div><div class="stage-caption"><div class="stage-copy" aria-live="polite" aria-atomic="true"><p class="eyebrow stage-kicker" id="stage-kicker">${t(data.stage)} <bdi dir="ltr">01 / 08</bdi></p><h3 id="stage-title">${t(names[0][0])}</h3><p id="stage-description">${t(names[0][1])}</p></div><div class="stage-arrows"><button type="button" id="stage-prev" aria-label="${t(data.previous)}" disabled>←</button><button type="button" id="stage-next" aria-label="${t(data.next)}">→</button></div><details class="trade-details" id="trade-details" hidden><summary>${t(data.details)} <span aria-hidden="true">+</span></summary><div id="pin-list"></div><p id="pin-description" aria-live="polite"></p></details><a href="#contact" class="text-link handover-cta" id="handover-cta" hidden>${t(data.start)}${arrow}</a></div></div>
      <div class="stage-control"><label class="sr-only" for="stage-progress">${t(data.progress)}</label><input type="range" id="stage-progress" dir="ltr" min="0" max="700" value="0" aria-valuetext="${t(names[0][0])}"><div class="stage-rail" role="group" aria-label="${t(data.stagesLabel)}">${stages.map((s,i)=>`<button type="button" data-stage-jump="${i}" aria-label="${String(i+1).padStart(2,'0')} ${t(names[i][0])}"${i===0?' aria-current="step"':''}><bdi>${String(i+1).padStart(2,'0')}</bdi> <span>${t(names[i][0])}</span></button>`).join('')}</div></div></div></div></section>`;
}
export function renderServiceOverview(locale) {
  return renderServiceAtlas(locale);
}
export function renderProcess(locale) {
 const c=experienceCopy[locale];
 return `<section class="process-section" id="process"><div class="wrap process-grid"><div class="process-intro"><p class="eyebrow">${t(c.processLabel)}</p><h2>${lines(c.processTitle)}</h2><div class="process-datum" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div><ol class="process-list">${c.process.map(([h,p],i)=>`<li><span>0${i+1}</span><div><h3>${t(h)}</h3><p>${t(p)}</p></div></li>`).join('')}</ol></div></section>`;
}
export function renderMaterials(locale) {
 const c=experienceCopy[locale];
 return `<section class="material-section"><div class="material-picture">${residencePicture()}</div><div class="material-copy"><p class="eyebrow">${t(c.materialLabel)}</p><h2>${lines(c.materialTitle)}</h2><p>${t(c.materialText)}</p><dl>${c.materials.map(([n,h,p])=>`<div><dt><span>${n}</span>${t(h)}</dt><dd>${t(p)}</dd></div>`).join('')}</dl></div></section>`;
}
