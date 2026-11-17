export function mountOpening() {
  const section = document.querySelector('.opening');
  const container = document.querySelector('#hero-scene');
  if (!(section instanceof HTMLElement) || !(container instanceof HTMLElement)) return;
  const opening = section;
  const art = container;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.header');
  const process = document.querySelector('.process-grid');
  const steps = [...document.querySelectorAll('.process-list li')];
  /** @type {ReturnType<typeof import('./hero-scene.js').mountHeroScene> | undefined} */
  let scene;
  let mounting = false;
  let failed = false;
  let frame = 0;

  async function syncRenderer() {
    if (preference.matches) {
      scene?.destroy();
      scene = undefined;
      return;
    }
    if (scene || mounting || failed) return;
    mounting = true;
    try {
      const { mountHeroScene } = await import('./hero-scene.js');
      if (!preference.matches) scene = mountHeroScene(art);
    } catch {
      failed = true;
    } finally {
      mounting = false;
      requestUpdate();
    }
  }

  function update() {
    frame = 0;
    const { top, height } = opening.getBoundingClientRect();
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const progress = Math.max(0, Math.min(1, (headerBottom - top) / height));
    opening.style.setProperty('--opening-progress', String(preference.matches ? 0 : progress));
    scene?.setProgress(progress);

    if (!(process instanceof HTMLElement) || !steps.length) return;
    const readingLine = innerHeight * .6;
    let active = 0;
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].getBoundingClientRect().top <= readingLine) active = i;
    }
    const activeStep = String(active);
    if (process.dataset.step !== activeStep) {
      process.dataset.step = activeStep;
      steps.forEach((step, index) => step.classList.toggle('process-active', index === active));
    }
  }

  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  const openingVisibility = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    openingVisibility.disconnect();
    void syncRenderer();
  }, { rootMargin: '160px 0px' });
  openingVisibility.observe(opening);
  preference.addEventListener('change', () => { void syncRenderer(); requestUpdate(); });
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  requestUpdate();
}
