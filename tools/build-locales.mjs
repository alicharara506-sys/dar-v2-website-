import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { renderHead, renderPage } from '../src/render-page.js';
import { locales } from '../src/content.js';
import { serviceRoutes } from '../src/service-pages.js';

const origin = process.env.DAR_SITE_URL ? new URL(process.env.DAR_SITE_URL).origin : '';
const dist = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', dist), 'utf8');
const routes = [...locales.map(locale => ({locale, key:'', path: locale === 'en' ? '/' : '/'+locale+'/'})), ...serviceRoutes()];
for (const {locale, key, path} of routes) {
  const target = new URL('.' + path, dist);
  await mkdir(target, { recursive: true });
  const html = template
    .replace(/<html lang="en" dir="ltr">/, '<html lang="' + locale + '" dir="' + (locale === 'ar' ? 'rtl' : 'ltr') + '">')
    .replace(/<!-- DAR HEAD -->[\s\S]*?<!-- \/DAR HEAD -->/, () => renderHead(locale, origin, key))
    .replace(/<!-- DAR PAGE -->[\s\S]*?<!-- \/DAR PAGE -->/, () => renderPage(locale, key));
  await writeFile(new URL('index.html', target), html);
}
if (origin) {
  const items = routes.map(({path}) => '<url><loc>' + origin + path + '</loc></url>');
  await writeFile(new URL('sitemap.xml', dist), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + items.join('') + '</urlset>\n');
  await writeFile(new URL('robots.txt', dist), 'User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n');
}

const brotli = promisify(brotliCompress);
const zip = promisify(gzip);
for (const item of await readdir(dist, { withFileTypes: true, recursive: true })) {
  if (!item.isFile() || !/\.(js|css|html|glb|svg|xml)$/.test(item.name)) continue;
  const path = join(item.parentPath, item.name);
  const bytes = await readFile(path);
  if (bytes.byteLength < 1024) continue;
  const [br, gz] = await Promise.all([brotli(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }), zip(bytes)]);
  await Promise.all([writeFile(path + '.br', br), writeFile(path + '.gz', gz)]);
}
