import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { content, locales } from '../src/content.js';
import { progressAt, stageAt, stageImage, stages } from '../src/build-stages.js';
import { renderHead, renderPage } from '../src/render-page.js';
import { inquiryHandler, validateInquiry } from '../server/inquiry.mjs';
import { serviceRoutes, serviceRoute } from '../src/service-pages.js';

const data = { name: 'Test Visitor', reply: '+961 79 123 456', project: '0', location: 'Beirut', description: 'Synthetic villa inquiry.', website: '', locale: 'fr' };

async function listen(server, context) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  return 'http://127.0.0.1:' + server.address().port;
}

test('stage anchors are reversible and every locale covers all eight stages', () => {
  for (let index = 0; index < stages.length; index++) assert.equal(stageAt(progressAt(index)), index);
  assert.equal(stageAt(-10), 0);
  assert.equal(stageAt(10), 7);
  for (let index = 0; index < stages.length; index++) {
    assert.match(stageImage(index).srcset, new RegExp('stage-' + (index + 1) + '-medium\\.webp(?:\\?v=[a-z-]+)? 1000w'));
  }
  for (const locale of locales) {
    assert.equal(content[locale].stages.length, stages.length);
    const page = renderPage(locale);
    assert.match(page, /tel:\+96179004108/);
    assert.match(page, /mailto:darcontracting2026@gmail.com/);
    assert.match(page, /id="stage-poster"/);
    assert.match(page, /services\/finishing\//);
    assert.doesNotMatch(page, /href="#stage-first-fix/);
    assert.doesNotMatch(page, /<canvas|id="enter-3d"/);
    assert.doesNotMatch(page, /scene-label|AI visualization|Images générées par IA|صور مولّدة بالذكاء الاصطناعي/i);
    const head = renderHead(locale, 'https://example.test');
    assert.match(head, /rel="alternate" hreflang="x-default"/);
    assert.ok(head.includes('content="' + content[locale].shareAlt + '"'));
  }
});

test('each service is rendered and linked in all three languages', () => {
  const routes=serviceRoutes();
  assert.equal(routes.length,15);
  for(const route of routes) {
    assert.deepEqual(serviceRoute(route.path),{locale:route.locale,key:route.key});
    const html=renderPage(route.locale,route.key);
    assert.match(html,/class="service-page"/);
    assert.equal((html.match(/<h1/g)||[]).length,1);
    assert.equal((html.match(/<details>/g)||[]).length,3);
    assert.match(html,/tel:\+96179004108/);
    assert.doesNotMatch(html,/id="experience"/);
    const head=renderHead(route.locale,'https://example.test',route.key);
    assert.ok(head.includes('https://example.test'+route.path));
  }
  assert.equal(serviceRoute('/services/unknown/'),null);
});

test('validates and normalizes inquiry data without accepting malformed fields', () => {
  assert.equal(validateInquiry(data).data.project, 'construction');
  assert.deepEqual(validateInquiry({ ...data, reply: 'invalid', location: 'x', project: '0e0' }).invalid, ['reply', 'project', 'location']);
  assert.equal(validateInquiry({ ...data, locale: 'unknown', reply: 'sample@example.test' }).data.locale, 'en');
  assert.deepEqual(validateInquiry({ ...data, name: 'test\nline' }).invalid, ['name']);
});

test('missing configuration disables the inquiry form and API', async context => {
  const base = await listen(createServer(inquiryHandler({})), context);
  assert.deepEqual(await (await fetch(base)).json(), { available: false });
  assert.equal((await fetch(base, { method: 'POST' })).status, 503);
});

test('only confirms acceptance after the provider accepts, with spam and request checks', async context => {
  let mode = 'accept';
  const delivered = [];
  const upstream = await listen(createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    delivered.push({ authorization: request.headers.authorization, body: JSON.parse(Buffer.concat(chunks)) });
    response.writeHead(mode === 'refuse' ? 500 : 200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ accepted: mode === 'accept' }));
  }), context);
  const handler = inquiryHandler({ DAR_INQUIRY_URL: upstream, DAR_INQUIRY_TOKEN: 'local-test-token' });
  const base = await listen(createServer(handler), context);
  const submit = (body, origin = base) => fetch(base, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  assert.deepEqual(await (await fetch(base)).json(), { available: true });
  assert.equal((await submit(data, 'http://example.test')).status, 403);
  assert.equal((await submit({ ...data, website: 'bot' })).status, 400);
  assert.equal((await submit({ ...data, name: '' })).status, 422);
  assert.equal(delivered.length, 0);
  mode = 'unconfirmed';
  assert.equal((await submit(data)).status, 502);
  mode = 'refuse';
  assert.equal((await submit(data)).status, 502);
  mode = 'accept';
  assert.deepEqual(await (await submit(data)).json(), { accepted: true });
  assert.equal(delivered[2].authorization, 'Bearer local-test-token');
  assert.equal(delivered[2].body.locale, 'fr');
  assert.equal(delivered[2].body.website, undefined);
  for (let index = 0; index < 4; index++) assert.equal((await submit(data)).status, 200);
  assert.equal((await submit(data)).status, 429);
});
