const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch {
    return '';
  }
}

function isLocalUrl(value) {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isUsableUrl(value) {
  const url = normalizeUrl(value);
  if (!url) return false;
  if (process.env.NODE_ENV === 'production' && isLocalUrl(url)) return false;
  return true;
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

  return candidates.find((value) => isUsableUrl(value)) || candidates[0] || '';
}

function requestOrigin(req) {
  if (!req || typeof req.get !== 'function') return '';

  const origin = req.get('origin');
  if (isUsableUrl(origin) && origin !== 'null') return normalizeUrl(origin);

  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return host ? normalizeUrl(`${proto}://${host}`) : '';
}

function frontendBase(req, clientOrigin) {
  const fromClient = isUsableUrl(clientOrigin) ? normalizeUrl(clientOrigin) : '';
  if (fromClient) return fromClient;

  const configured = configuredUrl();
  if (isUsableUrl(configured)) return normalizeUrl(configured);

  const fromRequest = requestOrigin(req);
  if (fromRequest) return fromRequest;

  return normalizeUrl(configured) || 'http://localhost:5173';
}

function frontendUrl(link = '', req, clientOrigin) {
  const base = frontendBase(req, clientOrigin);
  if (!link) return base;
  return `${base}${String(link).startsWith('/') ? '' : '/'}${link}`;
}

module.exports = { frontendUrl, isLocalUrl, normalizeUrl };
