import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = new URL('../site-assets/villa/', import.meta.url);
await mkdir(root, { recursive: true });
const vite = await createServer({ configFile: false, publicDir: 'site-assets', optimizeDeps: { entries: ['tools/villa-render.html'] }, server: { host: '127.0.0.1', port: 4317, strictPort: true, open: false } });
await vite.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', error => console.error(error));
  await page.goto('http://127.0.0.1:4317/tools/villa-render.html');
  await page.waitForFunction(() => window.exportVilla);
  const binary = await page.evaluate(() => window.exportVilla());
  await writeFile(new URL('mount-lebanon.glb', root), Buffer.from(binary, 'base64'));
  for (const size of [{ name: 'wide', width: 1280, height: 760 }, { name: 'small', width: 720, height: 600 }]) {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (let stage = 0; stage < 8; stage++) {
      const image = await page.evaluate(index => window.captureStage(index), stage);
      await writeFile(new URL('stage-' + (stage + 1) + '-' + size.name + '.webp', root), Buffer.from(image, 'base64'));
    }
  }
  await page.setViewportSize({ width: 1200, height: 680 });
  const share = await page.evaluate(() => window.captureShare());
  await writeFile(new URL('share.webp', root), Buffer.from(share, 'base64'));
} finally {
  await browser.close();
  await vite.close();
}
