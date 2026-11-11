import { company, content, localeNames, locales, paths } from './content.js';
import { buildImageSizes, stageImage, stages } from './build-stages.js';

const sections = ['build', 'about', 'services', 'partners', 'contact'];
const partners = ['DCP — British Building Materials', 'HEK.HOUSE — Innovating Your Home'];
const tradeIcons = ['tile', 'pipe', 'electricity', 'floor-plan'];
const tradeStageLinks = ['#stage-interior-finishing:marble', '', '', '#stage-site'];
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
const num = index => String(index + 1).padStart(2, '0');
const t = escape;

export function renderHead(locale, siteOrigin = '') {
  const data = content[locale];
  const firstFrame = stageImage(0);
  const title = company.name + ' | ' + data.location;
  const absolute = path => siteOrigin + path;
  const ogLocale = { en: 'en_US', ar: 'ar_LB', fr: 'fr_FR' };
  return `
    <title>${t(title)}</title>
    <meta name="description" content="${t(data.description)}">
    <meta name="theme-color" content="#111111">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${t(company.name)}">
    <meta property="og:title" content="${t(title)}">
    <meta property="og:description" content="${t(data.description)}">
    <meta property="og:locale" content="${ogLocale[locale]}">
    ${locales.filter(code => code !== locale).map(code => '<meta property="og:locale:alternate" content="' + ogLocale[code] + '">').join('')}
    <meta name="twitter:card" content="summary_large_image">
    ${siteOrigin ? `<link rel="canonical" href="${t(absolute(paths[locale]))}">
    <meta property="og:url" content="${t(absolute(paths[locale]))}">
    <meta property="og:image" content="${t(absolute('/villa/share.webp'))}">
    <meta property="og:image:alt" content="${t(data.shareAlt)}">
    ${locales.map(code => '<link rel="alternate" hreflang="' + code + '" href="' + t(absolute(paths[code])) + '">').join('')}
    <link rel="alternate" hreflang="x-default" href="${t(absolute('/'))}">` : ''}
    <link rel="icon" href="/dar-icon.svg" type="image/svg+xml">
    <link rel="preload" as="image" imagesrcset="${firstFrame.srcset}" imagesizes="${buildImageSizes}" fetchpriority="high">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'GeneralContractor',
      name: company.name,
      telephone: '+96179004108',
      email: company.email,
      address: { '@type': 'PostalAddress', addressLocality: 'Beirut', addressCountry: 'LB' },
      ...(siteOrigin ? { url: absolute(paths[locale]) } : {}),
    })}</script>`;
}

function logo(locale, variant) {
  return `<a class="logo" href="${paths[locale]}" aria-label="${t(company.name)}"><img alt="" src="/brand/dar-${variant}.webp" width="128" height="56"></a>`;
}

function stagePicture(index, main = false, alt = '') {
  const { src, srcset } = stageImage(index);
  const sizes = main ? buildImageSizes : '(max-width: 700px) 94vw, (max-width: 1512px) 43vw, 650px';
  return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${t(alt)}" width="1670" height="940"
    ${main ? 'id="stage-poster" class="stage-frame" data-frame="0" fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
}

function renderHeader(locale, data) {
  const links = sections.map((id, index) => `<a href="#${id}">${t(data.nav[index])}</a>`).join('');
  return `
  <a class="skip" href="#main">${t(data.skip)}</a>
  <header class="header">
    <div class="wrap header-inner">
      ${logo(locale, 'secondary-white')}
      <nav class="desktop-nav" aria-label="${t(data.menu)}">${links}</nav>
      <div class="header-actions">
        <details class="language">
          <summary aria-label="${t(data.language + ' ' + locale.toUpperCase())}">${icon('globe')}<span dir="ltr">${locale.toUpperCase()}</span></summary>
          <div class="dropdown">${locales.map(code => `<a data-locale href="${paths[code]}" lang="${code}" dir="${code === 'ar' ? 'rtl' : 'ltr'}"${code === locale ? ' aria-current="page"' : ''}>${t(localeNames[code])}</a>`).join('')}</div>
        </details>
        <a class="button header-cta" href="#contact">${t(data.start)}${icon('upRight')}</a>
        <details class="mobile-menu">
          <summary aria-label="${t(data.menu)}">${icon('menu')}</summary>
          <nav class="dropdown" aria-label="${t(data.menu)}">${links}<a class="menu-cta" href="#contact">${t(data.start)}${icon('upRight')}</a></nav>
        </details>
      </div>
    </div>
  </header>`;
}

function renderBuild(data) {
  return `
  <section class="build" id="build" aria-labelledby="headline">
    <div class="wrap build-layout">
      <div class="build-intro">
        <p class="eyebrow location">${icon('location')}${t(data.location)}</p>
        <h1 id="headline"><span>${t(data.headline[0])}</span><span>${t(data.headline[1])}</span></h1>
        <p class="lede">${t(data.hero)}</p>
        <a class="button primary" href="#experience" id="explore-build">${t(data.explore)}${icon('down')}</a>
        <p class="signoff">${t(data.signoff)}</p>
      </div>
      <div class="experience-track" id="experience">
        <div class="experience" id="experience-panel" data-stage="site">
          <figure class="build-figure">
            <div class="viewport" id="villa-viewport">
              ${stagePicture(0, true)}
              <p class="scroll-cue">${icon('down')}${t(data.scrollCue)}</p>
              <p class="stage-image-status" id="stage-image-status" role="status"></p>
            </div>
            <figcaption class="stage-caption">
              <div class="stage-copy" aria-live="polite" aria-atomic="true">
                <p class="eyebrow stage-kicker" id="stage-kicker">${t(data.stage)} <bdi dir="ltr">01 / 08</bdi></p>
                <h2 id="stage-title">${t(data.stages[0][0])}</h2>
                <p id="stage-description">${t(data.stages[0][1])}</p>
              </div>
              <div class="stage-arrows">
                <button type="button" id="stage-prev" aria-label="${t(data.previous)}" disabled>${icon('prev')}</button>
                <button type="button" id="stage-next" aria-label="${t(data.next)}">${icon('next')}</button>
              </div>
            </figcaption>
          </figure>
          <details class="trade-details" id="trade-details" hidden>
            <summary>${t(data.details)}</summary>
            <div class="trade-popover">
              <div id="pin-list"></div>
              <p id="pin-description" aria-live="polite"></p>
            </div>
          </details>
          <div class="stage-control">
            <label class="sr-only" for="stage-progress">${t(data.progress)}</label>
            <input type="range" id="stage-progress" dir="ltr" min="0" max="700" value="0" aria-valuetext="${t(data.stages[0][0])}">
            <div class="stage-rail" aria-label="${t(data.stagesLabel)}" role="group">
              ${stages.map((stage, index) => `<button type="button" data-stage-jump="${index}" aria-label="${t(num(index) + ' ' + data.stages[index][0])}"${index === 0 ? ' aria-current="step"' : ''}><bdi>${num(index)}</bdi> <span>${t(data.stages[index][0])}</span></button>`).join('')}
            </div>
          </div>
          <a href="#contact" id="handover-cta" class="button primary handover-cta" hidden>${t(data.start)}${icon('upRight')}</a>
        </div>
      </div>
    </div>
  </section>`;
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

function renderServices(data) {
  return `
  <section id="services" class="services light-section" aria-labelledby="services-title">
    <div class="wrap">
      <div class="section-intro"><p class="eyebrow section-label">${t(data.services[0])}</p><h2 id="services-title">${t(data.services[1])}</h2><p>${t(data.services[2])}</p></div>
      <div class="service-grid">
        <figure class="trade-picture">
          ${stagePicture(7, false, data.shareAlt)}
        </figure>
        <div class="trade-list">
          ${data.trades.map(([heading, copy], index) => `
          <article class="trade">
            <img src="/brand/${tradeIcons[index]}.webp" width="38" height="38" alt="" loading="lazy">
            <div><h3>${t(heading)}</h3><p>${t(copy)}</p>${tradeStageLinks[index] ? `<a class="text-link" href="${tradeStageLinks[index]}">${t(data.showTrade)}${icon('upRight')}</a>` : ''}</div>
          </article>`).join('')}
        </div>
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
      <a href="#build" class="text-link">${t(data.nav[0])}${icon('upRight')}</a>
    </div>
  </footer>`;
}

export function renderPage(locale) {
  const data = content[locale];
  return `
  ${renderHeader(locale, data)}
  <main id="main" tabindex="-1">
    ${renderBuild(data)}
    ${renderStory(data)}
    ${renderServices(data)}
    ${renderPartners(data)}
    ${renderContact(locale, data)}
  </main>
  ${renderFooter(locale, data)}`;
}
