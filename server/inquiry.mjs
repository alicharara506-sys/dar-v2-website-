import { isIP } from 'node:net';
import { locales } from '../src/content.js';
import { inquiryFields } from '../src/inquiry-form.js';

const projectTypes = ['construction', 'finishing', 'plumbing', 'electrical', 'design-management', 'other'];
const fields = new Set([...inquiryFields, 'website', 'locale']);

export function validateInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !fields.has(key))) return { invalid: inquiryFields };
  const get = key => typeof body[key] === 'string' ? body[key].trim() : '';
  const name = get('name');
  const reply = get('reply');
  const project = get('project');
  const location = get('location');
  const description = get('description');
  const locale = get('locale');
  const invalid = [];
  const safeSingleLine = value => !/[\x00-\x1f\x7f]/.test(value);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply);
  const digitCount = reply.replace(/\D/g, '').length;
  const validPhone = /^\+?[0-9(). -]+$/.test(reply) && digitCount >= 7 && digitCount <= 15;
  if (name.length < 2 || name.length > 100 || !safeSingleLine(name)) invalid.push('name');
  if (reply.length > 140 || !safeSingleLine(reply) || (!validEmail && !validPhone)) invalid.push('reply');
  if (!/^[0-5]$/.test(project)) invalid.push('project');
  if (location.length < 2 || location.length > 150 || !safeSingleLine(location)) invalid.push('location');
  if (description.length < 10 || description.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(description)) invalid.push('description');
  if (invalid.length) return { invalid };
  return {
    data: { name, reply, project: projectTypes[Number(project)], location, description, locale: locales.includes(locale) ? locale : 'en' },
  };
}

async function readBody(request) {
  const cap = 24 * 1024;
  if (Number(request.headers['content-length']) > cap) throw new Error('oversize');
  let length = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > cap) throw new Error('oversize');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function inquiryHandler(env = process.env) {
  const endpoint = env.DAR_INQUIRY_URL ? new URL(env.DAR_INQUIRY_URL) : null;
  const origin = env.DAR_SITE_URL ? new URL(env.DAR_SITE_URL).origin : '';
  const token = env.DAR_INQUIRY_TOKEN;
  const local = endpoint && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname);
  const available = Boolean(endpoint && token && !endpoint.username && !endpoint.password && (endpoint.protocol === 'https:' || local && endpoint.protocol === 'http:'));
  const rate = new Map();
  let inFlight = 0;
  const ttl = 10 * 60 * 1000;

  function json(response, status, body) {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    response.end(JSON.stringify(body));
  }
  return async (request, response) => {
    if (request.method === 'GET') return json(response, 200, { available });
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      return json(response, 405, { accepted: false });
    }
    if (!available) return json(response, 503, { accepted: false });
    const source = request.headers.origin;
    if (source !== (origin || 'http://' + request.headers.host)) return json(response, 403, { accepted: false });
    if (request.headers['content-type']?.split(';')[0] !== 'application/json') return json(response, 415, { accepted: false });
    const forwarded = request.headers['x-forwarded-for']?.split(',')[0].trim();
    const ip = env.DAR_TRUST_PROXY === '1' && isIP(forwarded || '') ? forwarded : request.socket.remoteAddress || '';
    const now = Date.now();
    let record = rate.get(ip);
    if (!record || record.expires <= now) {
      if (rate.size >= 2048) {
        for (const [key, item] of rate) if (item.expires <= now) rate.delete(key);
        if (rate.size >= 2048) return json(response, 429, { accepted: false });
      }
      record = { expires: now + ttl, attempts: 0, sent: 0, busy: false };
      rate.set(ip, record);
    }
    if (record.attempts >= 30 || record.sent >= 5 || record.busy || inFlight >= 12) return json(response, 429, { accepted: false });
    record.attempts++;
    let body;
    try {
      body = await readBody(request);
    } catch (error) {
      if (error.message === 'oversize') request.resume();
      return json(response, error.message === 'oversize' ? 413 : 400, { accepted: false });
    }
    if (typeof body?.website !== 'string' || body.website !== '') return json(response, 400, { accepted: false });
    const { data, invalid } = validateInquiry(body);
    if (invalid) return json(response, 422, { fields: invalid });
    if (record.busy || inFlight >= 12) return json(response, 429, { accepted: false });

    record.busy = true;
    inFlight++;
    try {
      const delivery = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(data),
        redirect: 'error',
        signal: AbortSignal.timeout(8500),
      });
      if (!delivery.ok || (await delivery.json()).accepted !== true) return json(response, 502, { accepted: false });
      record.sent++;
      return json(response, 200, { accepted: true });
    } catch {
      return json(response, 502, { accepted: false });
    } finally {
      record.busy = false;
      inFlight--;
    }
  };
}
