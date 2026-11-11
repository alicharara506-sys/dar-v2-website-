import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium, devices } from 'playwright';
import { stages } from '../src/build-stages.js';

const base = 'http://127.0.0.1:4327';
const screenshots = process.env.DAR_QA_DIR;
if (screenshots) await mkdir(screenshots, { recursive: true });
const submissions = [];
const upstream = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks));
  await new Promise(resolve => setTimeout(resolve, 300));
  const accepted = !data.description.includes('reject');
  submissions.push(data);
  response.writeHead(accepted ? 200 : 503, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ accepted }));
});
upstream.listen(0, '127.0.0.1');
await once(upstream, 'listening');
const server = spawn(process.execPath, ['server/start.mjs'], {
  env: {
    ...process.env,
    PORT: '4327',
    HOST: '127.0.0.1',
    DAR_SITE_URL: base,
    DAR_INQUIRY_URL: 'http://127.0.0.1:' + upstream.address().port,
    DAR_INQUIRY_TOKEN: 'browser-test-only',
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const [message] = await once(server.stdout, 'data');
assert.match(String(message), /listening on port 4327/);

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const panel = '#experience-panel';
const live = panel + '[data-mode="live"]';
const stageJump = index => '[data-stage-jump="' + index + '"]';
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
const screenshot = (page, name) => screenshots ? page.screenshot({ path: resolve(screenshots, name + '.png'), scale: 'css' }) : undefined;
const openPage = async options => (await browser.newContext(options)).newPage();

async function visit(page, path = '/') {
  const response = await page.goto(base + path);
  assert.equal(response.status(), 200);
  await page.locator('html.enhanced').waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function stageIs(page, index) {
  await page.locator(panel + '[data-stage="' + stages[index].id + '"]').waitFor();
  assert.equal(await page.locator(stageJump(index)).getAttribute('aria-current'), 'step');
}
async function jump(page, index) {
  await page.locator(stageJump(index)).click();
  await stageIs(page, index);
  await frame(page);
}
async function noHorizontalOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

try {
  const desktop = await openPage({ viewport: { width: 1440, height: 900 } });
  const problems = [];
  desktop.on('pageerror', error => problems.push(error.message));
  desktop.on('console', entry => {
    if (entry.type() !== 'error') return;
    const expectedRejection = entry.location().url.endsWith('/api/inquiry') && /status of (422|502)\b/.test(entry.text());
    if (!expectedRejection) problems.push(entry.text());
  });
  await visit(desktop);
  await desktop.locator(live).waitFor({ timeout: 30000 });
  await noHorizontalOverflow(desktop);
  await desktop.keyboard.press('Tab');
  assert.equal(await desktop.locator('a.skip').evaluate(element => element === document.activeElement), true);
  await desktop.keyboard.press('Enter');
  assert.equal(await desktop.evaluate(() => document.activeElement.id), 'main');
  await screenshot(desktop, 'desktop-hero');
  for (let index = 0; index < stages.length; index++) {
    await jump(desktop, index);
    await screenshot(desktop, 'desktop-stage-' + (index + 1));
  }
  const finishY = await desktop.evaluate(() => scrollY);
  const scrubber = desktop.locator('#stage-progress');
  await scrubber.focus();
  await desktop.keyboard.press('Home');
  await stageIs(desktop, 0);
  assert.ok(await desktop.evaluate(() => scrollY) < finishY);
  await desktop.keyboard.press('ArrowRight');
  await stageIs(desktop, 1);
  await scrubber.evaluate(input => {
    input.value = '500';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await stageIs(desktop, 5);
  await desktop.evaluate(y => window.scrollTo(0, y), finishY + 25);
  await stageIs(desktop, 7);
  await desktop.evaluate(() => window.scrollTo(0, 1));
  await stageIs(desktop, 0);
  await jump(desktop, 3);
  await desktop.reload();
  await desktop.locator(live).waitFor();
  await stageIs(desktop, 3);
  await desktop.locator('a[href="#stage-first-fix:water"]').click();
  await stageIs(desktop, 5);
  assert.match(await desktop.locator('#pin-description').textContent(), /Hot and cold/);
  await desktop.locator('#enter-3d').click();
  assert.equal(await desktop.evaluate(() => document.activeElement.id), 'villa-viewport');
  await desktop.keyboard.press('ArrowLeft');
  await desktop.keyboard.press('+');
  await desktop.keyboard.press('Escape');
  await stageIs(desktop, 5);
  await desktop.locator(live).waitFor();
  assert.equal(await desktop.evaluate(() => document.activeElement.id), 'enter-3d');
  await desktop.locator('.language summary').click();
  await desktop.locator('[data-locale][lang="fr"]').click();
  await desktop.waitForURL(url => url.pathname === '/fr/');
  await stageIs(desktop, 5);
  assert.equal(new URL(desktop.url()).hash, '#stage-first-fix:water');
  assert.match(await desktop.locator('#stage-title').textContent(), /plomberie/);
  await desktop.locator('.contact-grid a[href^="tel:"]').waitFor();
  assert.equal(await desktop.locator('.contact-grid a[href^="tel:"]').getAttribute('href'), 'tel:+96179004108');
  assert.equal(await desktop.locator('.contact-grid a[href^="mailto:"]').getAttribute('href'), 'mailto:darcontracting2026@gmail.com');

  const form = desktop.locator('.inquiry-form');
  await form.getByRole('button').click();
  await form.locator('#inquiry-name[aria-invalid="true"]').waitFor();
  assert.equal(await desktop.evaluate(() => document.activeElement.id), 'inquiry-name');
  assert.equal(await form.locator('[aria-invalid="true"]').count(), 5);
  await form.locator('[name="name"]').fill('Test Visitor');
  await form.locator('[name="reply"]').fill('visitor@example.test');
  await form.locator('[name="project"]').selectOption('0');
  await form.locator('[name="location"]').fill('Beyrouth');
  await form.locator('[name="description"]').fill('Provider should reject this test.');
  await form.getByRole('button').click();
  await form.getByText('Envoi en cours…', { exact: true }).waitFor();
  await form.getByText('L’envoi a échoué.', { exact: false }).waitFor();
  await form.locator('[name="description"]').fill('Synthetic inquiry to the local provider.');
  await form.getByRole('button').click();
  await form.getByText('Votre demande a été reçue.', { exact: false }).waitFor();
  assert.equal(submissions.at(-1).locale, 'fr');
  assert.equal(await form.locator('[name="name"]').inputValue(), '');
  const audit = await new AxeBuilder({ page: desktop }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  assert.deepEqual(audit.violations.map(item => ({ rule: item.id, nodes: item.nodes.map(node => node.target) })), []);
  assert.deepEqual(problems, []);
  if (screenshots) {
    for (const id of ['about', 'services', 'partners', 'contact']) {
      if (id === 'services') await desktop.locator('.trade-picture img').evaluate(image => image.decode());
      await desktop.locator('#' + id).screenshot({ path: resolve(screenshots, 'desktop-' + id + '.png'), scale: 'css' });
    }
  }
  await desktop.close();
  console.log('Desktop stages, scroll restoration, keyboard, deep links, locale and inquiry passed.');

  const phone = await openPage(devices['Pixel 7']);
  await visit(phone);
  await phone.locator(live).waitFor({ timeout: 30000 });
  await noHorizontalOverflow(phone);
  await screenshot(phone, 'phone-hero');
  for (let index = 0; index < stages.length; index++) {
    await jump(phone, index);
    await screenshot(phone, 'phone-stage-' + (index + 1));
  }
  await jump(phone, 5);
  await phone.locator('#enter-3d').tap();
  const viewport = phone.locator('#villa-viewport');
  const before = await viewport.screenshot({ scale: 'css' });
  const box = await viewport.boundingBox();
  const center = { x: Math.round(box.x + box.width * 0.5), y: Math.round(box.y + box.height * 0.51) };
  const initialScroll = await phone.evaluate(() => scrollY);
  const cdp = await phone.context().newCDPSession(phone);
  const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await touch('touchStart', [{ id: 1, ...center }]);
  await touch('touchMove', [{ id: 1, x: center.x + 55, y: center.y + 20 }]);
  await touch('touchEnd', []);
  await touch('touchStart', [{ id: 1, x: center.x - 28, y: center.y }, { id: 2, x: center.x + 28, y: center.y }]);
  await touch('touchMove', [{ id: 1, x: center.x - 51, y: center.y }, { id: 2, x: center.x + 51, y: center.y }]);
  await touch('touchEnd', []);
  await frame(phone);
  assert.equal(await phone.evaluate(() => scrollY), initialScroll);
  assert.notDeepEqual(await viewport.screenshot({ scale: 'css' }), before);
  await phone.locator('#reset-3d').tap();
  await phone.locator('.pin[data-pin="water"]').tap();
  assert.match(await phone.locator('#pin-description').textContent(), /Hot and cold/);
  await phone.locator('#exit-3d').tap();
  await stageIs(phone, 5);
  await phone.locator(live).waitFor();
  await phone.setViewportSize({ width: 844, height: 390 });
  await noHorizontalOverflow(phone);
  await jump(phone, 5);
  await screenshot(phone, 'phone-landscape-first-fix');
  await phone.locator('.mobile-menu summary').tap();
  await phone.locator('.mobile-menu a[href="#services"]').tap();
  await phone.waitForURL('**/#services');
  assert.equal(await phone.locator('.mobile-menu').getAttribute('open'), null);
  await phone.close();
  console.log('Mobile emulation stages, touch orbit and pinch, hotspot, exit, landscape and menu passed.');

  const rtl = await openPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const modelRequests = [];
  rtl.on('request', request => { if (request.url().endsWith('.glb')) modelRequests.push(request.url()); });
  await visit(rtl, '/ar/#stage-first-fix:power');
  await stageIs(rtl, 5);
  assert.equal(await rtl.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(await rtl.locator('.contact-grid bdi').first().getAttribute('dir'), 'ltr');
  assert.equal(await rtl.locator(panel).getAttribute('data-mode'), 'still');
  assert.equal(modelRequests.length, 0);
  await noHorizontalOverflow(rtl);
  await screenshot(rtl, 'arabic-small-first-fix');
  await jump(rtl, 7);
  await jump(rtl, 0);
  const rtlAudit = await new AxeBuilder({ page: rtl }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  assert.deepEqual(rtlAudit.violations.map(item => ({ rule: item.id, nodes: item.nodes.map(node => node.target) })), []);
  await rtl.close();

  for (const failure of ['missing-model', 'webgl-unavailable', 'context-loss']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    if (failure === 'missing-model') await page.route('**/*.glb', route => route.fulfill({ status: 404 }));
    if (failure === 'webgl-unavailable') await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.includes('webgl') ? null : getContext.call(this, type, ...args);
      };
    });
    await visit(page, '/#stage-infill');
    await stageIs(page, 4);
    if (failure === 'context-loss') {
      await page.locator(live).waitFor();
      await page.evaluate(() => {
        const context = document.querySelector('canvas').getContext('webgl2');
        context.getExtension('WEBGL_lose_context').loseContext();
      });
    }
    await page.locator('#still-status').waitFor();
    assert.equal(await page.locator(panel).getAttribute('data-mode'), 'still');
    assert.equal(await page.locator('#stage-poster img').getAttribute('src'), '/villa/stage-5-wide.webp');
    await jump(page, 6);
    assert.equal(await page.locator('#stage-poster img').getAttribute('src'), '/villa/stage-7-wide.webp');
    await page.close();
  }
  console.log('Reduced motion, 320px Arabic RTL, axe checks and three graphics failures passed.');

  const noJs = await browser.newPage({ javaScriptEnabled: false });
  assert.equal((await noJs.goto(base + '/ar/')).status(), 200);
  assert.equal(await noJs.locator('html').getAttribute('lang'), 'ar');
  await noJs.locator('#services-title').waitFor({ state: 'visible' });
  assert.equal(await noJs.locator('.contact-grid a[href^="mailto:"]').count(), 1);
  await noJs.close();
  console.log('Static localized content and direct contact without JavaScript passed.');
} finally {
  await browser.close();
  server.kill();
  upstream.close();
}
