# DAR Trading & Contracting

DAR Trading & Contracting website with English, Arabic (RTL), and French homepages and five detailed service pages in every language.

## Preview

Use Node.js 22.13 or newer. Run `npm ci` to install dependencies, then `npm run dev` to start the development site at http://127.0.0.1:3220/.

For the compiled site, run `npm run build` followed by `npm start`. Set `PORT` to use a different port. The compiled site is in `dist/`; the supplied server handles service-page routes, locale routes and the optional inquiry endpoint.

The current photographs and 3D architectural study are design previews. Final project imagery is pending.

## Pages and experience

- The homepage opens with a live 3D sculpture of the DAR mark. Pointer movement tilts the sculpture, dragging rotates it, and scrolling separates its layers.
- The service directory pairs the five trades with animated architectural drawings and links to their detail pages.
- Services: Construction; Interior & Exterior Finishing; Plumbing; Electrical; Design & Project Management.
- Routes: `/services/<slug>/`, `/ar/services/<slug>/`, `/fr/services/<slug>/`.
- Every service contains scope, sequence, client review points, handover items, FAQs and direct contact actions.
- The eight-stage construction study supports forward/reverse native scrolling, stage buttons, keyboard scrubber, horizontal drag, rotation/reset controls and still-view toggle.
- Stage 06 is interior finishing. The 3D module loads only near the viewer. Rendering pauses outside the viewport and when the page is hidden.
- Reduced-motion visitors get discrete same-model stills. WebGL failure preserves the still viewer and all business content. Short landscape screens use manual stages so the page remains usable.
- Reduced motion gives the opening a static DAR mark and disables animated reveals.

## Content and assets

| File | Purpose |
| --- | --- |
| `src/content.js` | Company facts, locales, trade detail text and inquiry messages |
| `src/experience-content.js` | New homepage and eight construction-stage descriptions |
| `src/service-content.js` | Detailed service copy in all three languages |
| `src/render-page.js` | Shared page chrome, company sections and metadata |
| `src/home-sections.js` | Homepage composition |
| `src/service-pages.js` | Service routes and rendering |
| `src/production.css` | Fonts, global basics, navigation and inquiry styles |
| `src/design.css` | Responsive layout and visual direction |
| `src/hero-scene.js` | Interactive 3D DAR sculpture |
| `src/opening-motion.js` | Homepage scroll and motion controls |
| `src/service-atlas.js` | Service selector and architectural drawings |
| `src/experience.js` | Scroll, stage, fallback and view controls |
| `src/villa-scene.js` | Reproducible compact Lebanese villa study |
| `site-assets/residence/` | Temporary responsive photographic direction |
| `site-assets/construction/` | Same-model still fallback, eight stages, three sizes |
| `site-assets/icons/` | SVG geometry extracted from the supplied visual identity |

Final visuals can replace the temporary residence assets. The villa study illustrates the build sequence.

To regenerate same-model fallbacks after geometry changes, run the dev server and `node tools/capture-frames.mjs`. It uses installed Edge through Playwright and Python Pillow. The capture HTML is a development tool, not a production route.

## Contact and inquiry

Phone and email are live links. The optional inquiry form appears only when an actual delivery relay is configured. Set `DAR_INQUIRY_URL` and `DAR_INQUIRY_TOKEN` in the server environment. The relay must return a successful status and JSON `{"accepted":true}` before the site confirms receipt. No production relay is configured here. Browser tests use a local mock provider; they do not contact DAR or deliver real inquiries.

Set `DAR_SITE_URL` to the final HTTPS origin when deploying to generate canonical URLs, hreflang, social metadata, sitemap and robots metadata. The Node server supports precompressed Brotli/gzip assets. Do not expose the private company profile or source documents.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:browser`.

The browser suite uses installed Microsoft Edge, desktop and touch/viewport emulation at 320, 390, 768, 844 and 1440 CSS pixels, with a local mock inquiry relay on an isolated test server. It checks 15 service routes, RTL, FAQs, locale links, eight construction stages, reverse scrolling, keyboard controls, touch scrolling, reduced motion, unavailable WebGL, content without JavaScript and accessibility. Physical iOS Safari and Android hardware testing remains outside this environment.

## Design research

- https://lusion.co/ and https://lusion.co/projects/zero_tech/ informed purposeful real-time 3D and scrolling structure.
- https://lusion.co/projects/porsche_dream_machine/ informed chapter-based visual storytelling.
- https://sourcelebanon.com/ informed clear trade-scope organization.
- https://www.manenterprise.com/our-work/al-nahr informed how verified project information should be structured when supplied.
- https://www.dpr.com/construction/expertise/preconstruction informed discussion of planning and coordination.
- https://dribbble.com/shots/26513728-Quiet-Luxury-Villa-Website-Concept informed restrained typography and warm architectural presentation.
- https://www.badih-kantar.com/en/work/project-38 informed the general principle of contemporary architecture grounded in local stone craftsmanship.

No third-party project imagery or Lusion code was copied. Pinterest public previews were inaccessible during the research attempt. Brand icons derive from the supplied HTML; their source notes are in `site-assets/icons/README.md`.
