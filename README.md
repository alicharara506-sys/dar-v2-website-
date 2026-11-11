# DAR Trading & Contracting

Production website for DAR in Beirut, Lebanon. The main page pairs verified progress and payment with a reversible eight-stage construction visualization. The English, Arabic and French pages are prerendered at `/`, `/ar/` and `/fr/`.

## Run the website

Use Node.js 22.13 or later. The handoff archive includes a compiled `dist/`, so it can be previewed immediately.

```sh
node server/start.mjs
```

Open `http://127.0.0.1:3220/`. To install the development dependencies and rebuild from source, run the following.

```sh
npm ci
npm run build
npm start
```

`npm run dev` starts Vite with live reload. For a production preview, use `npm start`. The server listens on loopback by default. Set `HOST` and `PORT` to match the deployment. Use HTTPS at the hosting layer.

Set `DAR_SITE_URL` to the public HTTPS origin at build and runtime. The build then adds canonical and alternate URLs, sharing artwork, a sitemap and robots metadata. The server negotiates Brotli or gzip for precompressed assets. Static hosting can serve the three `dist/` paths and direct contact links. Use the included Node server or an equivalent API route for inquiry delivery.

## Inquiry delivery

The phone and email links are available on all deployments. The form appears when `GET /api/inquiry` reports that a relay is configured. Set `DAR_INQUIRY_URL` to a private, trusted HTTPS relay endpoint and `DAR_INQUIRY_TOKEN` to its bearer token. Keep both in server environment settings. Loopback HTTP is supported for local tests.

The endpoint receives a JSON object with `name`, `reply`, `project`, `location`, `description` and `locale`. After it accepts the inquiry for delivery, the endpoint must respond with a successful HTTP status and JSON `{"accepted":true}`. The site sends no confirmation if the relay times out, rejects the request or omits that acknowledgement.

The server applies same-origin checks, a honeypot, validation, timeouts and per-instance rate limits. For several replicas, apply a shared limit at the reverse proxy. Set `DAR_TRUST_PROXY=1` only when a controlled proxy overwrites the inbound `X-Forwarded-For` header. Choose the actual recipient and verify delivery through the configured relay before enabling it publicly.

## Edit content and the villa

| Location | Purpose |
| --- | --- |
| `src/content.js` | Company facts, section copy, stage captions, hotspot text and form messages in English, Arabic and French |
| `src/build-stages.js` | Stage identifiers, camera poses, inspection points and normalized progress |
| `src/production.js` | Native scroll, stage controls, responsive sticky scene, touch and keyboard inspection |
| `src/villa-model.js` | Reproducible concept geometry, site, construction groups and procedural materials |
| `src/villa-renderer.js` | glTF loading, stage visibility and assembly, cutaway, lighting and camera |
| `site-assets/villa/` | Model, two still sizes for each stage, and the share image |
| `src/production.css` | Brand tokens, type, responsive layout and controls |

For a direct stage link, use `/#stage-handover`, `/ar/#stage-first-fix:power` or `/fr/#stage-finishes:tile`. The villa is an illustrative concept model. Stage choices do not define a payment schedule.

`npm run render:villa` regenerates the GLB and all same-model stills using local Chrome and the Three.js exporter. Follow it with `npm run build` to copy updated assets into `dist/`.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

The browser suite uses local Chrome, Chromium touch emulation and a local mock inquiry relay. Set `DAR_QA_DIR` to retain stage screenshots. The asset renderer uses port 4317 and browser verification uses port 4327.

## Asset provenance

- The supplied visual identity and DAR logo PNG exports informed the seven fixed WebP lockups. The guide’s construction icons are used for the four services.
- Company facts and approved excerpts come from the supplied DAR company profile. Only the DCP and HEK.HOUSE artwork from the partner pages was extracted. The source profile and its confidential page are excluded from distribution.
- The villa, textures, stills and share image were generated for this website. The illustrated work is labeled as a concept. There is no Projects section because approved DAR project records and image rights were unavailable.
- Inter and Cairo are self-hosted from Fontsource under the SIL Open Font License. Three.js is used under the MIT License. Copies are in `site-assets/licenses/`.
