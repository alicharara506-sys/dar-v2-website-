import { content, localeFromPath } from './content.js';
import { experienceCopy, newStageCopy } from './experience-content.js';
import { clamp, progressAt, stageAt, stageImage, stages } from './build-stages.js';

export function mountExperience() {
  const $ = s => document.querySelector(s);
  const track = $('#experience');
  if (!track) return;
  const locale=localeFromPath(location.pathname), copy=content[locale], c=experienceCopy[locale], names=newStageCopy[locale];
  const panel=$('#experience-panel'), viewport=$('#villa-viewport'), slider=/** @type {HTMLInputElement} */($('#stage-progress'));
  const caption=panel.querySelector('.stage-copy');
  const details=/** @type {HTMLDetailsElement} */($('#trade-details'));
  const buttons=[...document.querySelectorAll('[data-stage-jump]')];
  const motion=matchMedia('(prefers-reduced-motion: reduce)'), short=matchMedia('(max-height: 550px) and (orientation: landscape)');
  let current=-1, progress=0, scene=null, starting=false, failed=false, forcedStill=motion.matches, request=0, frame=0;
  let captionMotion;
  const cache=new Map();
  const direct=()=>motion.matches||short.matches;

  function still(index) {
    const token=++request;
    let img=cache.get(index);
    if (!img) {
      img=new Image(1400,1000); const source=stageImage(index);
      img.className='stage-frame';img.id='stage-poster';img.alt='';img.dataset.frame=String(index);
      img.decoding='async';img.sizes='(max-width: 800px) 100vw, 70vw';img.srcset=source.srcset;img.src=source.src;cache.set(index,img);
    }
    img.decode().then(()=>{
      if(token!==request)return;
      $('#stage-poster')?.replaceWith(img);
      $('#stage-image-status').textContent='';
    }).catch(()=>{
      if(token!==request)return;
      $('#stage-image-status').textContent=copy.imageUnavailable;
    });
  }
  function setMode() {
    const active=scene&&!forcedStill&&!failed;
    scene?.setEnabled(Boolean(active));
    viewport.dataset.renderer=active?'webgl':'still';
    $('#still-toggle').setAttribute('aria-pressed',String(!active));
    $('#scene-hint').textContent=active?c.drag:c.fallback;
    for(const id of ['reset-view','rotate-left','rotate-right']) /** @type {HTMLButtonElement} */($('#'+id)).disabled=!active;
    if(!active) still(Math.max(0,current));
  }
  async function startScene() {
    if(scene||starting||failed||forcedStill)return;
    starting=true;
    try {
      const {mountVillaScene}=await import('./villa-scene.js');
      scene=mountVillaScene($('#villa-canvas'),{reducedMotion:motion.matches});
      scene.setProgress(progress);
      const canvas=$('#villa-canvas canvas');
      canvas.addEventListener('webglcontextlost', event=>{event.preventDefault();failed=true;setMode();});
      canvas.addEventListener('webglcontextrestored', ()=>{scene?.destroy();scene=null;failed=false;starting=false;void startScene();});
      setMode();
    } catch(error) { failed=true;setMode();console.warn('Construction viewer uses still images.',error.message); }
    finally {starting=false;}
  }
  function selectDetail(id) {
    if(!stages[current].details?.includes(id))return;
    details.open=true;
    $('#pin-description').textContent=copy.pins[id][1];
    for(const b of document.querySelectorAll('[data-detail]'))b.setAttribute('aria-pressed',String(b.getAttribute('data-detail')===id));
  }
  function update(value) {
    const nextProgress=clamp(value);
    if (nextProgress===progress && current>=0) return;
    progress=nextProgress;
    const index=stageAt(progress);
    scene?.setProgress(progress);
    panel.style.setProperty('--build-progress',String(progress));
    slider.value=String(Math.round(progress*700));slider.style.setProperty('--filled',progress*100+'%');
    slider.setAttribute('aria-valuetext',names[index][0]);
    if(current===index)return;
    const previous=current;
    current=index;
    panel.dataset.stage=stages[index].id;
    $('#stage-kicker bdi').textContent=String(index+1).padStart(2,'0')+' / 08';
    $('#stage-title').textContent=names[index][0];$('#stage-description').textContent=names[index][1];
    captionMotion?.cancel();
    if (previous>=0 && !motion.matches && caption.animate) {
      const direction=index>previous?1:-1;
      captionMotion=caption.animate(
        [{ opacity:.48, transform:`translateY(${direction * 7}px)` }, { opacity:1, transform:'translateY(0)' }],
        { duration:320, easing:'cubic-bezier(.2,.7,.25,1)' }
      );
    }
    buttons.forEach((b,i)=>i===index?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
    const rail=$('.stage-rail'), active=buttons[index];
    const start=active.getBoundingClientRect().left-rail.getBoundingClientRect().left+rail.scrollLeft;
    if(start<rail.scrollLeft)rail.scrollLeft=start;
    if(start+active.clientWidth>rail.scrollLeft+rail.clientWidth)rail.scrollLeft=start+active.clientWidth-rail.clientWidth;
    /** @type {HTMLButtonElement} */($('#stage-prev')).disabled=index===0;
    /** @type {HTMLButtonElement} */($('#stage-next')).disabled=index===7;
    /** @type {HTMLElement} */($('#handover-cta')).hidden=index!==7;
    if(details.contains(document.activeElement)) /** @type {HTMLElement} */(buttons[index]).focus({preventScroll:true});
    details.open=false;details.hidden=!stages[index].details;
    $('#pin-description').textContent='';
    $('#pin-list').replaceChildren(...(stages[index].details||[]).map(id=>{const b=document.createElement('button');b.type='button';b.dataset.detail=id;b.textContent=copy.pins[id][0];b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>selectDetail(id));return b;}));
    if(!scene||forcedStill||failed)still(index);
  }
  function range() {
    const top=Number.parseFloat(getComputedStyle(panel).top)||0;
    return {start:Math.max(0,scrollY+track.getBoundingClientRect().top-top),travel:Math.max(1,track.clientHeight-Math.max(panel.clientHeight,innerHeight-top)-(parseFloat(getComputedStyle(track).paddingBottom)||0))};
  }
  function fromScroll() { if(direct())return; const r=range();update((scrollY-r.start)/r.travel); }
  function queue(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;fromScroll();});}
  function jump(index) {
    const p=progressAt(clamp(index,0,7));
    if(direct()){update(p);return;}
    const r=range();window.scrollTo({top:Math.ceil(r.start+p*r.travel),behavior:'instant'});update(p);
  }
  function hash() {
    const m=/^#stage-([a-z-]+)(?::([a-z]+))?$/.exec(location.hash);if(!m)return;
    const aliases={'first-fix':'interior-finishing','ground-frame':'structure','upper-frame':'structure','infill':'walls'};
    const id=aliases[m[1]]||m[1],i=stages.findIndex(s=>s.id===id);if(i<0)return;
    if(direct())track.scrollIntoView({block:'start'});jump(i);if(m[2])selectDetail(m[2]);
  }
  buttons.forEach((b,i)=>b.addEventListener('click',()=>jump(i)));
  $('#stage-prev').addEventListener('click',()=>jump(current-1));$('#stage-next').addEventListener('click',()=>jump(current+1));
  slider.addEventListener('input',()=>{
    const p=Number(slider.value)/700;
    if(direct())update(progressAt(stageAt(p)));
    else {const r=range();window.scrollTo({top:r.start+p*r.travel,behavior:'instant'});update(p);}
  });
  slider.addEventListener('keydown',event=>{
    const delta={ArrowLeft:-1,ArrowDown:-1,PageDown:-1,ArrowRight:1,ArrowUp:1,PageUp:1}[event.key];
    const index=event.key==='Home'?0:event.key==='End'?7:current+delta;
    if(Number.isFinite(index)){event.preventDefault();jump(index);}
  });
  $('#reset-view').addEventListener('click',()=>scene?.resetView());
  $('#rotate-left').addEventListener('click',()=>scene?.rotate(-1));$('#rotate-right').addEventListener('click',()=>scene?.rotate(1));
  $('#still-toggle').addEventListener('click',()=>{forcedStill=!forcedStill;if(!forcedStill)void startScene();setMode();});
  motion.addEventListener('change',()=>{document.documentElement.classList.toggle('reduce-motion',motion.matches);forcedStill=motion.matches;if(motion.matches)captionMotion?.cancel();scene?.setReducedMotion(motion.matches);setMode();if(!forcedStill)void startScene();});
  new IntersectionObserver(([entry])=>{if(entry.isIntersecting)void startScene();},{rootMargin:'250px'}).observe(viewport);
  window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);window.addEventListener('hashchange',hash);
  window.addEventListener('pageshow',()=>location.hash.startsWith('#stage-')?hash():queue());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
  document.documentElement.classList.toggle('reduce-motion',motion.matches);
  update(0);setMode();queue();if(location.hash.startsWith('#stage-'))requestAnimationFrame(hash);
}
