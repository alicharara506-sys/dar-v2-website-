import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { inquiryHandler } from './inquiry.mjs';

const root = fileURLToPath(new URL('../dist', import.meta.url));
await stat(resolve(root, 'index.html'));
const inquiry = inquiryHandler();
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function representation(request, path, info) {
  const accepted = (request.headers['accept-encoding'] || '').split(',').map(header => {
    const [name, preference] = header.trim().split(';');
    return { name, q: preference ? Number(preference.trim().slice(2)) : 1 };
  }).filter(({ name, q }) => (name === 'br' || name === 'gzip') && q > 0);
  accepted.sort((a, b) => b.q - a.q || (a.name === 'br' ? -1 : 1));
  for (const { name } of accepted) {
    const compressed = path + (name === 'br' ? '.br' : '.gz');
    const file = await stat(compressed).catch(() => null);
    if (file?.isFile()) return { path: compressed, size: file.size, encoding: name };
  }
  return { path, size: info.size, encoding: null };
}

const server = createServer({ requestTimeout: 20000, headersTimeout: 10000 }, async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (path === '/api/inquiry') {
      await inquiry(request, response);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    if (path === '/ar' || path === '/fr') {
      response.writeHead(308, { Location: path + '/' + url.search }).end();
      return;
    }
    if (/^\/(?:ar\/|fr\/)?services\/[a-z-]+$/.test(path)) {
      response.writeHead(308, { Location: path + '/' + url.search }).end();
      return;
    }
    const pagePath = path.endsWith('/') ? path + 'index.html' : path;
    const file = resolve(root, '.' + pagePath);
    const type = contentTypes[extname(file)];
    if (!file.startsWith(root + sep) || !type || /[\0\\]/.test(path)) {
      response.writeHead(404).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      response.writeHead(404).end();
      return;
    }
    const resource = await representation(request, file, info);
    response.writeHead(200, {
      'Content-Type': type,
      'Content-Length': resource.size,
      Vary: 'Accept-Encoding',
      ...(resource.encoding ? { 'Content-Encoding': resource.encoding } : {}),
      'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    if (request.method === 'HEAD') response.end();
    else await pipeline(createReadStream(resource.path), response);
  } catch (error) {
    if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500).end();
    else response.destroy();
  }
});
const port = Number(process.env.PORT || 3220);
server.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log('DAR website listening on port ' + port);
});
