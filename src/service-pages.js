import { serviceKeys, serviceMeta, serviceContent, serviceLabels } from './service-content.js';
import { paths, company } from './content.js';
import { renderServiceDrawing } from './service-atlas.js';

export { serviceKeys };
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const servicePath = (locale, key) => paths[locale] + 'services/' + key + '/';
export function serviceRoute(pathname) {
  const match = /^\/(?:(ar|fr)\/)?services\/([a-z-]+)\/?$/.exec(pathname.split('?')[0]);
  return match && serviceKeys.includes(match[2]) ? { locale: match[1] || 'en', key: match[2] } : null;
}
export const serviceRoutes = () => ['en','ar','fr'].flatMap(locale => serviceKeys.map(key => ({ locale, key, path: servicePath(locale, key) })));
export const serviceIcons = { construction: 'construction', finishing: 'tile', plumbing: 'pipe', electrical: 'electricity', 'design-project-management': 'floor-plan' };
const arrow = '<span aria-hidden="true">↗</span>';
export function renderServiceMain(locale, key) {
  const c = serviceContent[locale][key], l = serviceLabels[locale], m = serviceMeta[key];
  const list = items => '<ul class="service-checklist">' + items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  return `<main id="main" tabindex="-1" class="service-page">
    <section class="service-hero wrap" id="top">
      <nav class="breadcrumbs" aria-label="${esc(l.services)}"><a href="${paths[locale]}">${esc(l.home)}</a><span>/</span><a href="${paths[locale]}#services">${esc(l.services)}</a><span>/</span><span>${esc(c.title)}</span></nav>
      <div class="service-hero-grid"><div><p class="eyebrow">${esc(l.detail)}</p><h1>${esc(c.headline)}</h1><p class="service-hero-lede">${esc(c.intro)}</p><a class="button dark-button" href="#service-contact">${esc(l.talk)}${arrow}</a></div>${renderServiceDrawing(key)}</div>
    </section>
    <section class="service-scope wrap"><div class="section-heading"><p class="eyebrow">${esc(l.scope)}</p><h2>${esc(l.scopeTitle)}</h2></div><div class="scope-list">${c.scope.map(([h,p],i)=>`<article><span class="scope-index">0${i+1}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}</div><p class="scope-note">${esc(l.scopeNote)}</p></section>
    <section class="service-sequence"><div class="wrap"><div class="section-heading"><p class="eyebrow">${esc(l.sequence)}</p><h2>${esc(l.sequenceTitle)}</h2></div><ol class="process-list">${c.sequence.map(([h,p],i)=>`<li><span>0${i+1}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`).join('')}</ol></div></section>
    <section class="service-review wrap"><div><p class="eyebrow">${esc(l.review)}</p><h2>${esc(l.reviewTitle)}</h2>${list(c.reviews)}</div><div><p class="eyebrow">${esc(l.outputs)}</p><h2>${esc(l.outputsTitle)}</h2>${list(c.outputs)}<p class="scope-note">${esc(l.outputsNote)}</p></div></section>
    <section class="service-faq wrap"><div><p class="eyebrow">${esc(l.questions)}</p><h2>${esc(l.questionsTitle)}</h2><p class="scope-note">${esc(l.payment)}</p></div><div>${c.faq.map(([q,a])=>`<details><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join('')}</div></section>
    <section class="service-brief wrap" id="service-contact"><div><p class="eyebrow">${esc(l.preparation)}</p><h2>${esc(l.ctaTitle)}</h2><p>${esc(l.cta)}</p><div class="brief-actions"><a class="button dark-button" href="mailto:${company.email}?subject=${encodeURIComponent('DAR — '+c.title)}">${esc(l.email)}${arrow}</a><a class="text-link" href="${company.tel}">${esc(l.phone)}${arrow}</a></div></div><div><h3>${esc(l.preparationTitle)}</h3>${list(c.prepare)}</div></section>
    <section class="related-services wrap"><p class="eyebrow">${esc(l.related)}</p>${m.related.map(k=>`<a href="${servicePath(locale,k)}"><span>${esc(serviceContent[locale][k].title)}</span>${arrow}</a>`).join('')}<a class="text-link" href="${paths[locale]}#services">${esc(l.all)}${arrow}</a></section>
  </main>`;
}
