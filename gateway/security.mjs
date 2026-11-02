// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-gateway (OpenAI / GPT-6 Astra Pro; self-reported)
const encoder = new TextEncoder();
export class HttpError extends Error {
  constructor(status, code, message = code) { super(message); this.status = status; this.code = code; }
}
export function requireValue(value, status = 400, code = 'invalid_request') {
  if (!value) throw new HttpError(status, code);
}
export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
export function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
export async function sha256(value, encoding = 'hex') {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return encoding === 'base64url' ? base64url(bytes) : [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function constantEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function bearer(request) {
  const match = /^Bearer ([A-Za-z0-9_-]{40,128})$/.exec(request.headers.get('authorization') || '');
  requireValue(match, 401, 'invalid_token'); return match[1];
}
export function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
}
export function errorResponse(error) {
  return json({ error: error instanceof HttpError ? error.code : 'internal_error' }, error instanceof HttpError ? error.status : 500);
}
export async function boundedText(request, limit = 16384) {
  const declared = Number(request.headers.get('content-length'));
  requireValue(!declared || declared <= limit, 413, 'request_too_large');
  const reader = request.body?.getReader(); if (!reader) return '';
  let total = 0; const parts = [];
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; total += value.length; if (total > limit) { await reader.cancel(); throw new HttpError(413, 'request_too_large'); } parts.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0; for (const p of parts) { bytes.set(p, offset); offset += p.length; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new HttpError(400, 'invalid_encoding'); }
}
export async function body(request, limit = 16384) {
  requireValue((request.headers.get('content-type') || '').split(';')[0].trim() === 'application/json', 415, 'unsupported_media_type');
  try { const value = JSON.parse(await boundedText(request, limit)); requireValue(value && typeof value === 'object' && !Array.isArray(value)); return value; }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'invalid_json'); }
}
export async function form(request) {
  requireValue((request.headers.get('content-type') || '').split(';')[0].trim() === 'application/x-www-form-urlencoded', 415, 'unsupported_media_type');
  const params = new URLSearchParams(await boundedText(request));
  requireValue([...params.keys()].length <= 20);
  for (const key of params.keys()) requireValue(params.getAll(key).length === 1);
  return Object.fromEntries(params);
}
export function safeOrigin(value) {
  const u = new URL(value); requireValue(u.protocol === 'https:' && !u.username && !u.password && u.pathname === '/' && !u.search && !u.hash, 503, 'invalid_configuration'); return u.origin;
}
export function configured(env) {
  const origin = safeOrigin(env.PUBLIC_ORIGIN), dashboard = safeOrigin(env.DASHBOARD_ORIGIN);
  requireValue(env.REGISTRY && env.ACCESS_ISSUER && env.ACCESS_AUDIENCE, 503, 'identity_not_configured');
  return { origin, dashboard, resource: origin + '/mcp' };
}
export function sameOriginMutation(request, origin) {
  requireValue(request.headers.get('origin') === origin, 403, 'origin_rejected');
}
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
export function html(value, nonce, status = 200, redirectOrigin = '') {
  // Only a previously registered and validated redirect origin is allowed on consent pages.
  const formAction = redirectOrigin ? "'self' " + new URL(redirectOrigin).origin : "'self'";
  return new Response(value, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'nonce-" + nonce + "'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action " + formAction + "; frame-ancestors 'none'", 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' } });
}
function decodePart(part) {
  requireValue(/^[A-Za-z0-9_-]+$/.test(part), 401, 'invalid_identity');
  const str = part.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(str + '='.repeat((4 - str.length % 4) % 4)), c => c.charCodeAt(0));
}
// The edge header is not trusted on its own. Every request verifies signature, issuer,
// audience, expiry, and the explicitly configured private identity policy.
export async function verifyAccess(request, env, fetcher = fetch) {
  const jwt = request.headers.get('cf-access-jwt-assertion');
  requireValue(jwt && jwt.length <= 16384, 401, 'identity_required');
  try {
    const parts = jwt.split('.'); requireValue(parts.length === 3, 401, 'invalid_identity');
    const h = JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
    const c = JSON.parse(new TextDecoder().decode(decodePart(parts[1])));
    requireValue(h.alg === 'RS256' && typeof h.kid === 'string', 401, 'invalid_identity');
    const iss = safeOrigin(env.ACCESS_ISSUER);
    requireValue(new URL(iss).hostname.endsWith('.cloudflareaccess.com'), 503, 'invalid_configuration');
    const now = Math.floor(Date.now() / 1000);
    requireValue(c.type === 'app' && c.iss === iss && Array.isArray(c.aud) && c.aud.includes(env.ACCESS_AUDIENCE) && Number.isFinite(c.exp) && c.exp > now && (!c.nbf || c.nbf <= now + 5) && Number.isFinite(c.iat) && c.iat <= now + 5, 401, 'invalid_identity');
    const response = await fetcher(iss + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
    requireValue(response.ok, 503, 'identity_keys_unavailable');
    const keys = JSON.parse(await boundedText(response, 32768));
    requireValue(Array.isArray(keys.keys) && keys.keys.length <= 20, 503, 'identity_keys_unavailable');
    const jwk = keys.keys.find(k => k.kid === h.kid && k.kty === 'RSA');
    requireValue(jwk, 401, 'invalid_identity');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    requireValue(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodePart(parts[2]), encoder.encode(parts[0] + '.' + parts[1])), 401, 'invalid_identity');
    const emails = (env.ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const human = typeof c.sub === 'string' && c.sub && typeof c.email === 'string' && emails.includes(c.email.toLowerCase());
    const service = env.ENVIRONMENT === 'staging' && env.STAGING_SERVICE_ID && c.sub === '' && !c.email && c.common_name === env.STAGING_SERVICE_ID;
    requireValue(human || service, 403, 'identity_not_allowed');
    return { userId: await sha256(iss + '\n' + (human ? 'user:' + c.sub : 'service:' + c.common_name)), kind: human ? 'user' : 'staging-service' };
  } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(401, 'invalid_identity'); }
}
