export function mountServiceAtlas() {
  const atlas = document.querySelector('[data-service-atlas]');
  if (!atlas) return;

  const tablist = atlas.querySelector('.atlas-tabs');
  const visual = atlas.querySelector('.atlas-visual');
  const tabs = [.../** @type {NodeListOf<HTMLButtonElement>} */ (atlas.querySelectorAll('button[data-atlas-tab]'))];
  const panels = [...atlas.querySelectorAll('.atlas-panel')];
  const drawings = [...atlas.querySelectorAll('.atlas-drawing')];
  if (!tablist || !visual || !tabs.length || tabs.length !== panels.length || tabs.length !== drawings.length) return;

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let selected = 0;
  let drawn = 0;

  function showDrawing(index) {
    if (index === drawn) return;
    drawings[drawn].setAttribute('hidden', '');
    drawings[index].removeAttribute('hidden');
    drawn = index;
  }

  function select(index) {
    selected = index;
    for (const [position, tab] of tabs.entries()) {
      const active = position === index;
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      panels[position].toggleAttribute('hidden', !active);
    }
    showDrawing(index);
  }

  for (const [index, tab] of tabs.entries()) {
    const panel = panels[index];
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);

    tab.addEventListener('click', () => select(index));
    tab.addEventListener('pointerenter', () => {
      if (finePointer.matches) showDrawing(index);
    });
    tab.addEventListener('pointerleave', () => showDrawing(selected));
    tab.addEventListener('keydown', event => {
      if (!(event instanceof KeyboardEvent)) return;
      let next;
      switch (event.key) {
        case 'ArrowDown': next = (index + 1) % tabs.length; break;
        case 'ArrowUp': next = (index - 1 + tabs.length) % tabs.length; break;
        case 'Home': next = 0; break;
        case 'End': next = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      select(next);
      tabs[next].focus();
    });
  }

  select(0);
  atlas.classList.add('atlas-enhanced');
  tablist.removeAttribute('hidden');
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(([entry]) => {
      atlas.toggleAttribute('data-atlas-visible', entry.isIntersecting);
    }, { threshold: 0.05 });
    visibility.observe(visual);
  }
}
