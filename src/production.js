import './production.css';
import { content, localeFromPath } from './content.js';
import { clamp, hotspots, progressAt, stageAt, stages } from './build-stages.js';
import { mountInquiry } from './inquiry-form.js';

const locale = localeFromPath(location.pathname);
const copy = content[locale];
const $ = selector => document.querySelector(selector);
const track = $('#experience');
const panel = $('#experience-panel');
const viewport = $('#villa-viewport');
const canvas = viewport.querySelector('canvas');
const slider = $('#stage-progress');
const kicker = $('#stage-kicker bdi');
const title = $('#stage-title');
const description = $('#stage-description');
const prev = $('#stage-prev');
const next = $('#stage-next');
const stageRail = $('.stage-rail');
const stageButtons = Array.from(/** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('[data-stage-jump]')));
const poster = $('#stage-poster');
const enter = $('#enter-3d');
const exit = $('#exit-3d');
const reset = $('#reset-3d');
const still = $('#still-status');
const details = $('#trade-details');
const pinList = $('#pin-list');
const pinDescription = $('#pin-description');
const pinButtons = Array.from(/** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.pin')));
const handover = $('#handover-cta');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const presses = new Map();
const state = {
  current: 0,
  progress: 0,
  engine: null,
  mode: 'still',
  pending: false,
  failed: false,
  posterIndex: 0,
  selectedPin: '',
  near: false,
  visible: false,
  frame: 0,
};

function posterAt(index) {
  if (state.posterIndex === index) return;
  state.posterIndex = index;
  poster.querySelector('source').srcset = '/villa/stage-' + (index + 1) + '-small.webp';
  poster.querySelector('img').src = '/villa/stage-' + (index + 1) + '-wide.webp';
}
function setMode(mode) {
  state.mode = panel.dataset.mode = mode;
  const inspect = mode === 'inspect';
  const stillMode = mode === 'still';
  enter.hidden = mode !== 'live';
  still.hidden = !stillMode || (!motion.matches && !state.failed);
  reset.hidden = exit.hidden = !inspect;
  if (inspect) {
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', copy.viewLabel);
    viewport.setAttribute('aria-describedby', 'gesture-help');
  } else {
    viewport.removeAttribute('tabindex');
    viewport.removeAttribute('role');
    viewport.removeAttribute('aria-label');
    viewport.removeAttribute('aria-describedby');
    pinButtons.forEach(button => { button.hidden = true; });
  }
  if (stillMode) posterAt(state.current);
}

function pinLabel(id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.pin = id;
  button.textContent = copy.pins[id][0];
  button.setAttribute('aria-pressed', 'false');
  return button;
}
function selectPin(id, focus = false) {
  const choice = hotspots.find(pin => pin.id === id && pin.stage === state.current);
  if (!choice) return;
  state.selectedPin = id;
  details.open = true;
  for (const button of [...pinButtons, ...pinList.querySelectorAll('button')]) {
    button.setAttribute('aria-pressed', String(button.dataset.pin === id));
    if (focus && button.parentElement === pinList && button.dataset.pin === id) button.focus({ preventScroll: true });
  }
  pinDescription.textContent = copy.pins[id][1];
}
function updateStage(index) {
  if (state.current === index) return;
  state.current = index;
  panel.dataset.stage = stages[index].id;
  const [name, caption] = copy.stages[index];
  title.textContent = name;
  description.textContent = caption;
  kicker.textContent = String(index + 1).padStart(2, '0') + ' / 08';
  stageButtons.forEach((button, stage) => {
    if (stage === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  const currentButton = stageButtons[index];
  const buttonLeft = currentButton.offsetLeft - stageRail.offsetLeft;
  if (buttonLeft < stageRail.scrollLeft) stageRail.scrollLeft = buttonLeft;
  const buttonRight = buttonLeft + currentButton.offsetWidth;
  if (buttonRight > stageRail.scrollLeft + stageRail.clientWidth) stageRail.scrollLeft = buttonRight - stageRail.clientWidth;
  const focused = document.activeElement;
  prev.disabled = index === 0;
  next.disabled = index === stages.length - 1;
  if (focused === prev && prev.disabled) next.focus({ preventScroll: true });
  if (focused === next && next.disabled) prev.focus({ preventScroll: true });
  handover.hidden = index !== stages.length - 1;
  state.selectedPin = '';
  pinDescription.textContent = '';
  pinButtons.forEach(button => {
    button.hidden = true;
    button.setAttribute('aria-pressed', 'false');
  });
  const activePins = hotspots.filter(pin => pin.stage === index);
  if (details.contains(focused)) stageButtons[index].focus({ preventScroll: true });
  details.open = false;
  details.hidden = activePins.length === 0;
  pinList.replaceChildren(...activePins.map(pin => pinLabel(pin.id)));
  if (state.mode === 'still') posterAt(index);
}

function applyProgress(value) {
  const progress = clamp(value);
  state.progress = progress;
  updateStage(stageAt(progress));
  slider.value = String(Math.round(progress * 700));
  slider.style.setProperty('--filled', (progress * 100).toFixed(1) + '%');
  slider.setAttribute('aria-valuetext', copy.stages[state.current][0] + ' · ' + Math.round(progress * 100) + '%');
  state.engine?.setProgress(progress);
}
function scrollRange() {
  const stickyTop = Number.parseFloat(getComputedStyle(panel).top) || 0;
  const start = Math.max(0, scrollY + track.getBoundingClientRect().top - stickyTop);
  const reservedHeight = Math.max(425, innerHeight - stickyTop);
  const travel = Math.max(1, track.offsetHeight - reservedHeight);
  return { start, travel };
}
function fromScroll() {
  state.frame = 0;
  if (motion.matches || state.mode === 'inspect') return;
  const { start, travel } = scrollRange();
  applyProgress((scrollY - start) / travel);
}
function queueScroll() {
  if (!state.frame) state.frame = requestAnimationFrame(fromScroll);
}
function jump(progress) {
  if (state.mode === 'inspect') leaveInspection(false);
  if (motion.matches) {
    applyProgress(progressAt(stageAt(progress)));
    return;
  }
  const { start, travel } = scrollRange();
  // Round upward so the final stage reaches 1 on engines with integral scroll offsets.
  window.scrollTo({ top: Math.ceil(start + progress * travel), behavior: 'auto' });
  fromScroll();
}
function userJump(progress) {
  if (location.hash.startsWith('#stage-')) {
    history.replaceState(history.state, '', '#stage-' + stages[stageAt(progress)].id);
  }
  jump(progress);
}

function failScene() {
  const inspecting = state.mode === 'inspect';
  releasePointers();
  state.failed = true;
  state.engine?.dispose();
  state.engine = null;
  setMode('still');
  if (inspecting || document.activeElement === enter) slider.focus({ preventScroll: true });
}
async function enable3d() {
  if (!state.near || state.pending || state.failed || motion.matches || state.engine) return;
  state.pending = true;
  try {
    const { loadVilla, mountVilla } = await import('./villa-renderer.js');
    const model = await loadVilla('/villa/mount-lebanon.glb');
    if (motion.matches) return;
    state.engine = mountVilla(canvas, model, {
      onFail: failScene,
      onReady: () => setMode('live'),
      onPins: pins => {
        for (const [index, pin] of pins.entries()) {
          const button = pinButtons[index];
          button.hidden = pin.stage !== state.current || !pin.visible;
          button.style.left = pin.x * 100 + '%';
          button.style.top = pin.y * 100 + '%';
        }
      },
    });
    state.engine.setProgress(state.progress);
    state.engine.setActive(state.visible);
  } catch {
    failScene();
  } finally {
    state.pending = false;
  }
}

function inspect() {
  if (!state.engine || state.mode !== 'live') return;
  setMode('inspect');
  state.engine.setInspecting(true);
  viewport.focus({ preventScroll: true });
}
function releasePointers() {
  for (const id of presses.keys()) {
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
  }
  presses.clear();
}
function leaveInspection(restoreFocus = true) {
  if (state.mode !== 'inspect') return;
  releasePointers();
  state.engine?.setInspecting(false);
  setMode('live');
  if (restoreFocus) enter.focus({ preventScroll: true });
  queueScroll();
}
function distance() {
  const [first, second] = presses.values();
  return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : 0;
}
function pointerDown(event) {
  if (state.mode !== 'inspect' || event.target.closest('button') || event.button !== 0 || presses.size >= 2) return;
  event.preventDefault();
  viewport.setPointerCapture(event.pointerId);
  presses.set(event.pointerId, { x: event.clientX, y: event.clientY });
}
function pointerMove(event) {
  const previous = presses.get(event.pointerId);
  if (!previous || state.mode !== 'inspect') return;
  const before = distance();
  presses.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (presses.size === 1) state.engine?.orbit(event.clientX - previous.x, event.clientY - previous.y);
  else if (before > 3) state.engine?.zoom(distance() / before);
}
function keydown(event) {
  if (state.mode !== 'inspect' || event.target !== viewport) return;
  const shifts = { ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -25], ArrowDown: [0, 25] };
  const shift = shifts[event.key];
  if (shift) state.engine?.orbit(...shift);
  else if (event.key === '+' || event.key === '=') state.engine?.zoom(1.15);
  else if (event.key === '-') state.engine?.zoom(1 / 1.15);
  else if (event.key === 'Home') state.engine?.reset();
  else return;
  event.preventDefault();
}
function followStageHash() {
  const match = /^#stage-([a-z-]+)(?::([a-z]+))?$/.exec(location.hash);
  if (!match) return;
  const index = stages.findIndex(stage => stage.id === match[1]);
  if (index < 0) return;
  if (motion.matches) track.scrollIntoView({ block: 'start' });
  jump(progressAt(index));
  stageButtons[index].focus({ preventScroll: true });
  if (match[2]) selectPin(match[2], true);
}

document.documentElement.classList.add('enhanced');
document.documentElement.classList.toggle('reduce-motion', motion.matches);
slider.step = motion.matches ? '100' : '1';
setMode('still');
const onVisibility = new IntersectionObserver(([entry]) => {
  state.visible = entry.isIntersecting;
  state.engine?.setActive(state.visible);
  if (!state.visible) leaveInspection(false);
});
onVisibility.observe(viewport);
const nearVisibility = new IntersectionObserver(([entry]) => {
  state.near = entry.isIntersecting;
  void enable3d();
}, { rootMargin: '150px' });
nearVisibility.observe(viewport);

motion.addEventListener('change', () => {
  document.documentElement.classList.toggle('reduce-motion', motion.matches);
  slider.step = motion.matches ? '100' : '1';
  if (motion.matches) {
    leaveInspection(false);
    state.engine?.dispose();
    state.engine = null;
    applyProgress(progressAt(state.current));
    setMode('still');
  } else {
    queueScroll();
    void enable3d();
  }
});
window.addEventListener('scroll', queueScroll, { passive: true });
window.addEventListener('resize', queueScroll);
window.addEventListener('pageshow', () => location.hash.startsWith('#stage-') ? followStageHash() : queueScroll());
window.addEventListener('hashchange', followStageHash);
window.addEventListener('blur', releasePointers);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) releasePointers();
});

stageButtons.forEach((button, index) => button.addEventListener('click', () => userJump(progressAt(index))));
prev.addEventListener('click', () => userJump(progressAt(Math.max(0, state.current - 1))));
next.addEventListener('click', () => userJump(progressAt(Math.min(stages.length - 1, state.current + 1))));
slider.addEventListener('input', () => userJump(Number(slider.value) / 700));
slider.addEventListener('keydown', event => {
  const offsets = { ArrowLeft: -1, ArrowDown: -1, PageDown: -1, ArrowRight: 1, ArrowUp: 1, PageUp: 1 };
  const offset = offsets[event.key];
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? stages.length - 1 : state.current + offset;
  if (!Number.isFinite(index)) return;
  event.preventDefault();
  userJump(progressAt(Math.min(stages.length - 1, Math.max(0, index))));
});
enter.addEventListener('click', inspect);
exit.addEventListener('click', () => leaveInspection());
reset.addEventListener('click', () => state.engine?.reset());
viewport.addEventListener('pointerdown', pointerDown);
viewport.addEventListener('pointermove', pointerMove);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  viewport.addEventListener(type, event => presses.delete(event.pointerId));
}
viewport.addEventListener('wheel', event => {
  if (state.mode !== 'inspect' || event.target.closest('button')) return;
  event.preventDefault();
  state.engine?.zoom(Math.exp(-event.deltaY * 0.0012));
}, { passive: false });
viewport.addEventListener('keydown', keydown);
for (const list of [pinList, $('#pins')]) {
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-pin]');
    if (button) selectPin(button.dataset.pin, list !== pinList);
  });
}
const headerMenus = Array.from(/** @type {NodeListOf<HTMLDetailsElement>} */ (document.querySelectorAll('.header details')));
for (const menu of headerMenus) {
  menu.addEventListener('toggle', () => {
    if (menu.open) for (const other of headerMenus) if (other !== menu) other.open = false;
  });
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (state.mode === 'inspect') leaveInspection();
  else if (details.open && details.contains(document.activeElement)) {
    details.open = false;
    details.querySelector('summary').focus({ preventScroll: true });
  }
  for (const menu of headerMenus) {
    if (!menu.open) continue;
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  for (const menu of headerMenus) {
    if (!menu.contains(event.target) || event.target.closest('a')) menu.open = false;
  }
  const link = event.target.closest('a');
  if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (link.hasAttribute('data-locale')) {
    const hash = location.hash.startsWith('#stage-') || state.current === 0 || !state.visible
      ? location.hash : '#stage-' + stages[state.current].id + (state.selectedPin ? ':' + state.selectedPin : '');
    event.preventDefault();
    const destination = new URL(link.href);
    destination.hash = hash;
    location.assign(destination.href);
    return;
  }
  if (link.id === 'explore-build') {
    event.preventDefault();
    if (location.hash) history.replaceState(history.state, '', '#experience');
    if (motion.matches) track.scrollIntoView({ block: 'start' });
    jump(0);
    slider.focus({ preventScroll: true });
  } else if (link.getAttribute('href')?.startsWith('#stage-') && link.hash === location.hash) {
    followStageHash();
  }
});

queueScroll();
void mountInquiry($('#inquiry'), locale, copy.form);
