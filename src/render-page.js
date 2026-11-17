import { company, content, localeNames, locales, paths } from './content.js';
import { renderHero, renderBuildStudy, renderServiceOverview, renderProcess, renderMaterials } from './home-sections.js';
import { experienceCopy } from './experience-content.js';
import { renderServiceMain, servicePath } from './service-pages.js';
import { serviceContent } from './service-content.js';

const partners = ['DCP — British Building Materials', 'HEK.HOUSE — Innovating Your Home'];
const symbols = {
  upRight: '<path d="M6 18 18 6M7 6h11v11"/>',
  down: '<path d="M12 4v15m-6-6 6 6 6-6"/>',
  prev: '<path d="m14 6-6 6 6 6"/>',
  next: '<path d="m10 6 6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a15 15 0 0 1 0 16 15 15 0 0 1 0-16Z"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  plus: '<path d="M5 12h14m-7-7v14"/>',
  location: '<path d="M18 10c0 4-6 9-6 9s-6-5-6-9a6 6 0 1 1 12 0Z"/><circle cx="12" cy="10" r="1.5"/>',
  phone: '<path d="M8 4H5a1 1 0 0 0-1 1 15 15 0 0 0 15 15 1 1 0 0 0 1-1v-3l-5-2-1.5 2a11 11 0 0 1-5.5-5.5L10 9 8 4Z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4 7 8 6 8-6"/>',
};

export const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
export const icon = name => '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + symbols[name] + '</svg>';
const t = escape;

export function renderHead(locale, siteOrigin = '', serviceKey = '') {
  const data = content[locale];
  const title = (serviceKey ? serviceContent[locale][serviceKey].title + ' | ' : '') + company.name + ' | ' + data.location;
  const absolute = path => siteOrigin + path;
  const pagePath = serviceKey ? servicePath(locale, serviceKey) : paths[locale];
  const description = serviceKey ? serviceContent[locale][serviceKey].summary : data.description;
  const ogLocale = { en: 'en_US', ar: 'ar_LB', fr: 'fr_FR' };
  return `
    <title>${t(title)}</title>
    <meta name="description" content="${t(description)}">
    <meta name="theme-color" content="#111111">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${t(company.name)}">
    <meta property="og:title" content="${t(title)}">
    <meta property="og:description" content="${t(description)}">
    <meta property="og:locale" content="${ogLocale[locale]}">
    ${locales.filter(code => code !== locale).map(code => '<meta property="og:locale:alternate" content="' + ogLocale[code] + '">').join('')}
    <meta name="twitter:card" content="summary_large_image">
    ${siteOrigin ? `<link rel="canonical" href="${t(absolute(pagePath))}">
    <meta property="og:url" content="${t(absolute(pagePath))}">
    <meta property="og:image" content="${t(absolute('/residence/villa-wide.webp'))}">
    <meta property="og:image:alt" content="${t(data.shareAlt)}">
    ${locales.map(code => '<link rel="alternate" hreflang="' + code + '" href="' + t(absolute(serviceKey ? servicePath(code,serviceKey) : paths[code])) + '">').join('')}
    <link rel="alternate" hreflang="x-default" href="${t(absolute(serviceKey ? servicePath('en',serviceKey) : '/'))}">` : ''}
    <link rel="icon" href="/dar-icon.svg" type="image/svg+xml">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'GeneralContractor',
      name: company.name,
      telephone: '+96179004108',
      email: company.email,
      address: { '@type': 'PostalAddress', addressLocality: 'Beirut', addressCountry: 'LB' },
      ...(siteOrigin ? { url: absolute(pagePath) } : {}),
    })}</script>`;
}

function logo(locale, variant) {
  return `<a class="logo" href="${paths[locale]}" aria-label="${t(company.name)}"><img alt="" src="/brand/dar-${variant}.webp" width="128" height="56"></a>`;
}

function renderHeader(locale, data, serviceKey = '') {
  const prefix = serviceKey ? paths[locale] : '';
  const links = [['build',data.nav[0]],['services',data.nav[2]],['process',experienceCopy[locale].processNav],['about',experienceCopy[locale].aboutNav]].map(([id,label])=>`<a href="${prefix}#${id}">${t(label)}</a>`).join('');
  return `
  <a class="skip" href="#main">${t(data.skip)}</a>
  <header class="header${serviceKey ? '' : ' header--home'}"><div class="reading-progress" aria-hidden="true"></div>
    <div class="wrap header-inner">
      ${logo(locale, serviceKey ? 'secondary-white' : 'primary-black')}
      <nav class="desktop-nav" aria-label="${t(data.menu)}">${links}</nav>
      <div class="header-actions">
        <details class="language">
          <summary aria-label="${t(data.language + ' ' + locale.toUpperCase())}">${icon('globe')}<span dir="ltr">${locale.toUpperCase()}</span></summary>
          <div class="dropdown">${locales.map(code => `<a data-locale href="${serviceKey ? servicePath(code,serviceKey) : paths[code]}" lang="${code}" dir="${code === 'ar' ? 'rtl' : 'ltr'}"${code === locale ? ' aria-current="page"' : ''}>${t(localeNames[code])}</a>`).join('')}</div>
        </details>
        <a class="button header-cta" href="${prefix}#contact">${t(data.start)}${icon('upRight')}</a>
        <details class="mobile-menu">
          <summary aria-label="${t(data.menu)}">${icon('menu')}</summary>
          <nav class="dropdown" aria-label="${t(data.menu)}">${links}<a class="menu-cta" href="${prefix}#contact">${t(data.start)}${icon('upRight')}</a></nav>
        </details>
      </div>
    </div>
  </header>`;
}

function renderStory(data) {
  const [label, title, subtitle, body, terms] = data.story;
  return `
  <section class="story light-section" id="about" aria-labelledby="story-title">
    <div class="wrap">
      <div class="story-intro">
        <div>
          <p class="eyebrow section-label">${t(label)}</p>
          <h2 id="story-title">${t(title)}</h2>
        </div>
        <div class="story-copy">
          <p class="section-lede">${t(subtitle)}</p>
          <p>${t(body)}</p>
          <p class="terms">${t(terms)}</p>
        </div>
      </div>
      <div class="purpose">
        ${data.purpose.map(([name, heading, copy]) => `<article><p class="eyebrow">${t(name)}</p><h3>${t(heading)}</h3><p>${t(copy)}</p></article>`).join('')}
      </div>
      <ul class="values">${data.values.map(value => `<li>${t(value)}</li>`).join('')}</ul>
      <div class="why">
        <div><h3 class="eyebrow">${t(data.why[0])}</h3><blockquote>${t(data.why[1])}</blockquote></div>
        <ul>${data.why[2].map(value => `<li>${t(value)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>`;
}

function renderPartners(data) {
  return `
  <section class="partners light-section" id="partners" aria-labelledby="partners-title">
    <div class="wrap">
      <div class="section-intro"><p class="eyebrow section-label">${t(data.partners[0])}</p><h2 id="partners-title">${t(data.partners[1])}</h2></div>
      <div class="partner-grid">${data.partnerCopy.map(([label, engineer, copy], index) => `
        <article class="partner">
          <img src="/brand/${index ? 'hek-house' : 'dcp'}.webp" width="100" height="100" alt="" loading="lazy">
          <div><p class="eyebrow">${t(label)}</p><h3><bdi>${t(partners[index])}</bdi></h3><p>${t(copy)}</p><p class="presented">${t(data.partners[2])} <strong>${t(engineer)}</strong></p></div>
        </article>`).join('')}</div>
    </div>
  </section>`;
}

function renderContact(locale, data) {
  const [label, title, subtitle, call, email, location] = data.contact;
  return `
  <section class="contact" id="contact" aria-labelledby="contact-title">
    <div class="wrap">
      <p class="eyebrow section-label">${t(label)}</p>
      <h2 id="contact-title">${t(title)}</h2>
      <p class="contact-lede">${t(subtitle)}</p>
      <div class="contact-grid">
        <a href="${company.tel}">${icon('phone')}<span><strong>${t(call)}</strong><bdi dir="ltr">${t(company.phone)}</bdi></span>${icon('upRight')}</a>
        <a href="mailto:${company.email}">${icon('mail')}<span><strong>${t(email)}</strong><bdi dir="ltr">${t(company.email)}</bdi></span>${icon('upRight')}</a>
        <div>${icon('location')}<span><strong>${t(location)}</strong>${t(data.location)}</span></div>
      </div>
      <div id="inquiry"></div>
    </div>
  </section>`;
}

function renderFooter(locale, data) {
  return `
  <footer class="footer">
    <div class="wrap footer-inner">
      ${logo(locale, 'primary-black')}
      <p class="signoff">${t(data.signoff)}</p>
      <a href="${paths[locale]}#build" class="text-link">${t(data.nav[0])}${icon('upRight')}</a>
    </div>
  </footer>`;
}

export function renderPage(locale, serviceKey = '') {
  const data = content[locale];
  if (serviceKey) return renderHeader(locale,data,serviceKey) + renderServiceMain(locale,serviceKey) + renderFooter(locale,data);
  return `
  ${renderHeader(locale, data)}
  <main id="main" tabindex="-1">
    ${renderHero(locale,data)}
    ${renderBuildStudy(locale,data)}
    ${renderServiceOverview(locale)}
    ${renderProcess(locale)}
    ${renderMaterials(locale)}
    ${renderStory(data)}
    ${renderPartners(data)}
    ${renderContact(locale, data)}
  </main>
  ${renderFooter(locale, data)}`;
}
