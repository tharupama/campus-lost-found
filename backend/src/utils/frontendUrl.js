const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function isLocalUrl(value) {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function trimTrailingSlash(url) {
  return String(url).replace(/\/+$/, '');
}

function configuredUrl() {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.PUBLIC_FRONTEND_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return candidates.find((value) => !isLocalUrl(value)) || candidates[0] || '';
}

function requestUrl(req) {
  if (!req || typeof req.get !== 'function') return '';

  const origin = req.get('origin');
  if (origin && origin !== 'null') return trimTrailingSlash(origin);

  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function frontendBase(req) {
  const configured = configuredUrl();
  if (configured && !isLocalUrl(configured)) return trimTrailingSlash(configured);

  const fromRequest = requestUrl(req);
  if (fromRequest) return fromRequest;

  return trimTrailingSlash(configured || 'http://localhost:5173');
}

function frontendUrl(link = '', req) {
  const base = frontendBase(req);
  if (!link) return base;
  return `${base}${String(link).startsWith('/') ? '' : '/'}${link}`;
}

module.exports = { frontendUrl, isLocalUrl };
