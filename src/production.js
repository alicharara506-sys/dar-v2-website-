import './production.css';
import { content, localeFromPath } from './content.js';
import { buildImageSizes, clamp, progressAt, stageAt, stageImage, stages } from './build-stages.js';
import { mountInquiry } from './inquiry-form.js';

const locale = localeFromPath(location.pathname);
const copy = content[locale];
const $ = selector => document.querySelector(selector);
const track = $('#experience');
const panel = $('#experience-panel');
const viewport = $('#villa-viewport');
const slider = $('#stage-progress');
const kicker = $('#stage-kicker bdi');
const title = $('#stage-title');
const description = $('#stage-description');
const prev = $('#stage-prev');
const next = $('#stage-next');
const stageRail = $('.stage-rail');
const stageButtons = Array.from(/** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('[data-stage-jump]')));
const details = $('#trade-details');
const detailList = $('#pin-list');
const detailDescription = $('#pin-description');
const handover = $('#handover-cta');
const imageStatus = $('#stage-image-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { current: 0, selectedDetail: '', visible: false, scrollFrame: 0, imageRequest: 0 };
const maxStage = stages.length - 1;
const sliderMaximum = maxStage * 100;
const total = String(stages.length).padStart(2, '0');
const formatPercent = new Intl.NumberFormat(locale, { style: 'percent' });
let visibleImage = /** @type {HTMLImageElement} */ ($('#stage-poster'));
const frameCache = new Map();

function loadFrame(index, priority) {
  const cached = frameCache.get(index);
  if (cached) {
    if (priority === 'high' && !cached.complete) cached.fetchPriority = 'high';
    return cached;
  }
  const image = new Image(1670, 940);
  const { src, srcset } = stageImage(index);
  image.id = 'stage-poster';
  image.className = 'stage-frame';
  image.dataset.frame = String(index);
  image.alt = '';
  image.decoding = 'async';
  image.fetchPriority = priority;
  image.sizes = buildImageSizes;
  image.srcset = srcset;
  image.src = src;
  frameCache.set(index, image);
  return image;
}

function showFrame(index, direction = 1) {
  const request = ++state.imageRequest;
  const image = loadFrame(index, 'high');
  if (!image.complete) viewport.dataset.imageState = 'loading';
  imageStatus.textContent = image.complete ? '' : copy.imageLoading;
  const ready = image.decode().then(() => true, () => image.complete && image.naturalWidth > 0);
  void ready.then(loaded => {
    if (!loaded && frameCache.get(index) === image) frameCache.delete(index);
    if (request !== state.imageRequest) return;
    viewport.dataset.imageState = loaded ? 'ready' : 'failed';
    imageStatus.textContent = loaded ? '' : copy.imageUnavailable;
    if (!loaded) return;
    if (image !== visibleImage) {
      visibleImage.replaceWith(image);
      visibleImage = image;
    }
    const adjacent = index + direction;
    if (!motion.matches && adjacent >= 0 && adjacent <= maxStage) {
      loadFrame(adjacent, 'low');
    }
  });
}

function detailButton(id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.detail = id;
  button.textContent = copy.pins[id][0];
  button.setAttribute('aria-pressed', 'false');
  return button;
}

function selectDetail(id, focus = false) {
  if (!stages[state.current].details?.includes(id)) return;
  state.selectedDetail = id;
  details.open = true;
  for (const button of detailList.querySelectorAll('button')) {
    const selected = button.dataset.detail === id;
    button.setAttribute('aria-pressed', String(selected));
    if (selected && focus) button.focus({ preventScroll: true });
  }
  detailDescription.textContent = copy.pins[id][1];
}

function updateStage(index) {
  if (state.current === index) return;
  const direction = Math.sign(index - state.current);
  state.current = index;
  const stage = stages[index];
  panel.dataset.stage = stage.id;
  const [name, caption] = copy.stages[index];
  title.textContent = name;
  description.textContent = caption;
  kicker.textContent = String(index + 1).padStart(2, '0') + ' / ' + total;
  stageButtons.forEach((button, i) => {
    if (i === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  const currentButton = stageButtons[index];
  const buttonLeft = currentButton.offsetLeft - stageRail.offsetLeft;
  if (buttonLeft < stageRail.scrollLeft) stageRail.scrollLeft = buttonLeft;
  const buttonRight = buttonLeft + currentButton.offsetWidth;
  if (buttonRight > stageRail.scrollLeft + stageRail.clientWidth) stageRail.scrollLeft = buttonRight - stageRail.clientWidth;
  const focused = document.activeElement;
  prev.disabled = index === 0;
  next.disabled = index === maxStage;
  if (focused === prev && prev.disabled) next.focus({ preventScroll: true });
  if (focused === next && next.disabled) prev.focus({ preventScroll: true });
  handover.hidden = index !== maxStage;
  state.selectedDetail = '';
  detailDescription.textContent = '';
  if (details.contains(focused)) currentButton.focus({ preventScroll: true });
  details.open = false;
  details.hidden = !stage.details;
  detailList.replaceChildren(...(stage.details ?? []).map(detailButton));
  showFrame(index, direction);
}

function applyProgress(value) {
  const progress = clamp(value);
  updateStage(stageAt(progress));
  slider.value = String(Math.round(progress * sliderMaximum));
  slider.style.setProperty('--filled', (progress * 100).toFixed(1) + '%');
  slider.setAttribute('aria-valuetext', copy.stages[state.current][0] + ' · ' + formatPercent.format(progress));
}

function scrollRange() {
  const stickyTop = Number.parseFloat(getComputedStyle(panel).top) || 0;
  const start = Math.max(0, scrollY + track.getBoundingClientRect().top - stickyTop);
  const reservedHeight = Math.max(425, innerHeight - stickyTop);
  return { start, travel: Math.max(1, track.offsetHeight - reservedHeight) };
}

function fromScroll() {
  if (motion.matches) return;
  const { start, travel } = scrollRange();
  applyProgress((scrollY - start) / travel);
}

function queueScroll() {
  if (state.scrollFrame) return;
  state.scrollFrame = requestAnimationFrame(() => {
    state.scrollFrame = 0;
    fromScroll();
  });
}

function jump(progress) {
  if (motion.matches) {
    applyProgress(progressAt(stageAt(progress)));
    return;
  }
  const { start, travel } = scrollRange();
  window.scrollTo({ top: Math.ceil(start + progress * travel), behavior: 'auto' });
  fromScroll();
}

function userJump(progress) {
  if (location.hash.startsWith('#stage-')) {
    history.replaceState(history.state, '', '#stage-' + stages[stageAt(progress)].id);
  }
  jump(progress);
}

function followStageHash() {
  const match = /^#stage-([a-z-]+)(?::([a-z]+))?$/.exec(location.hash);
  if (!match) return;
  const id = match[1] === 'first-fix' ? 'interior-finishing' : match[1];
  const index = stages.findIndex(stage => stage.id === id);
  if (index < 0) return;
  if (id !== match[1]) history.replaceState(history.state, '', '#stage-' + id);
  if (motion.matches) track.scrollIntoView({ block: 'start' });
  jump(progressAt(index));
  stageButtons[index].focus({ preventScroll: true });
  if (match[2]) selectDetail(match[2], true);
}

document.documentElement.classList.add('enhanced');
document.documentElement.classList.toggle('reduce-motion', motion.matches);
slider.step = motion.matches ? '100' : '1';
frameCache.set(0, visibleImage);
showFrame(0);
new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; }).observe(viewport);

motion.addEventListener('change', () => {
  document.documentElement.classList.toggle('reduce-motion', motion.matches);
  slider.step = motion.matches ? '100' : '1';
  if (motion.matches) applyProgress(progressAt(state.current));
  else queueScroll();
});
window.addEventListener('scroll', queueScroll, { passive: true });
window.addEventListener('resize', () => {
  queueScroll();
  if (viewport.dataset.imageState === 'loading') showFrame(state.current);
});
window.addEventListener('pageshow', () => location.hash.startsWith('#stage-') ? followStageHash() : queueScroll());
window.addEventListener('hashchange', followStageHash);

stageButtons.forEach((button, index) => button.addEventListener('click', () => userJump(progressAt(index))));
prev.addEventListener('click', () => userJump(progressAt(Math.max(0, state.current - 1))));
next.addEventListener('click', () => userJump(progressAt(Math.min(maxStage, state.current + 1))));
slider.addEventListener('input', () => userJump(Number(slider.value) / sliderMaximum));
slider.addEventListener('keydown', event => {
  const offsets = { ArrowLeft: -1, ArrowDown: -1, PageDown: -1, ArrowRight: 1, ArrowUp: 1, PageUp: 1 };
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? maxStage : state.current + offsets[event.key];
  if (!Number.isFinite(index)) return;
  event.preventDefault();
  userJump(progressAt(clamp(index, 0, maxStage)));
});
detailList.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button');
  if (button) selectDetail(button.dataset.detail);
});

const headerMenus = Array.from(/** @type {NodeListOf<HTMLDetailsElement>} */ (document.querySelectorAll('.header details')));
for (const menu of headerMenus) {
  menu.addEventListener('toggle', () => {
    if (menu.open) for (const other of headerMenus) if (other !== menu) other.open = false;
  });
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (details.open && details.contains(document.activeElement)) {
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
      ? location.hash : '#stage-' + stages[state.current].id + (state.selectedDetail ? ':' + state.selectedDetail : '');
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
