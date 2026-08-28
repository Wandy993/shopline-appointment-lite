import { config } from '../config.js';
import { hmacHex, readSignedPayload, safeEqual, signPayload } from '../lib/signature.js';
import { Shop } from '../models/Shop.js';
import { queueShopActive } from '../services/ops-hub.js';

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(parts => parts.length === 2));
}

export function sessionCookie(shop) {
  return signPayload({ shopId: String(shop._id), handle: shop.handle, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }, config.sessionSecret);
}

export function csrfToken(shopId) { return hmacHex(`${shopId}:csrf`, config.sessionSecret); }

export async function requireAdmin(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const session = readSignedPayload(cookies.al_session, config.sessionSecret);
    if (!session || session.exp < Date.now()) return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Please reopen the app from SHOPLINE Admin.' });
    const shop = await Shop.findOne({ _id: session.shopId, handle: session.handle, uninstalledAt: null });
    if (!shop) return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Shop session is no longer valid.' });
    req.shop = shop;
    req.csrfToken = csrfToken(shop._id);
    void queueShopActive(shop);
    next();
  } catch (error) { next(error); }
}

export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!safeEqual(String(req.headers['x-csrf-token'] || ''), csrfToken(req.shop._id))) {
    return res.status(403).json({ error: 'CSRF_INVALID', message: 'Security token expired. Refresh the page and try again.' });
  }
  next();
}

export function setSessionCookie(res, shop) {
  const secure = config.nodeEnv === 'production';
  res.cookie('al_session', sessionCookie(shop), {
    httpOnly: true, secure, sameSite: config.cookieSameSite, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/'
  });
}
