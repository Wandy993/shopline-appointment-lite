import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { readSignedPayload, signPayload, verifyShoplineQuery } from '../lib/signature.js';
import { Shop } from '../models/Shop.js';
import { authorizationUrl, ensureBookingCommerceWebhooks, exchangeAuthorizationCode, shoplineOrderAccessStatus, syncShopMetadata } from '../services/shopline.js';
import { reconcileRecentPaidOrdersForShop } from '../services/paid-bookings.js';
import { setSessionCookie } from '../middleware/auth.js';

export const authRouter = Router();

function validHandle(value) { return /^[a-z0-9][a-z0-9-]{1,62}$/i.test(String(value || '')); }

authRouter.get('/install', (req, res) => {
  const { handle, appkey } = req.query;
  if (!validHandle(handle) || appkey !== config.shopline.appKey || !verifyShoplineQuery(req.query, config.shopline.appSecret)) {
    return res.status(400).send('Invalid SHOPLINE installation request.');
  }
  const customField = signPayload({ handle: String(handle).toLowerCase(), nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60 * 1000 }, config.sessionSecret);
  res.redirect(authorizationUrl(String(handle).toLowerCase(), customField));
});

authRouter.get('/callback', async (req, res, next) => {
  try {
    if (!verifyShoplineQuery(req.query, config.shopline.appSecret)) return res.status(400).send('Invalid SHOPLINE callback signature.');
    const { handle, code, customField, lang = 'en' } = req.query;
    if (!validHandle(handle) || !code) return res.status(400).send('Missing OAuth callback values.');
    const state = readSignedPayload(customField, config.sessionSecret);
    if (!state || state.exp < Date.now() || state.handle !== String(handle).toLowerCase()) return res.status(400).send('OAuth state expired or invalid.');
    const token = await exchangeAuthorizationCode(handle, code);
    if (!token.accessToken) throw new Error('SHOPLINE did not return an access token');
    const shop = await Shop.findOneAndUpdate(
      { handle: String(handle).toLowerCase() },
      {
        $set: {
          accessToken: token.accessToken, tokenExpiresAt: token.expireTime ? new Date(token.expireTime) : undefined,
          scopes: String(token.scope || config.shopline.scopes).split(',').filter(Boolean), locale: lang, uninstalledAt: null
        },
        $setOnInsert: { installedAt: new Date(), adminLocale: 'en' }
      },
      { upsert: true, new: true }
    );
    setSessionCookie(res, shop);
    // Enriching store details is best-effort; it must never block installation.
    try {
      await syncShopMetadata(shop._id);
    } catch (error) { console.warn('Could not enrich shop metadata:', error.message); }

    // Existing installations must reauthorize after order-read access is added.
    // Once that permission is present, repair webhook subscriptions and reconcile
    // recently paid orders immediately so an in-flight booking does not have to
    // wait for the background scheduler. These are best-effort and never block login.
    if (shoplineOrderAccessStatus(shop).granted) {
      try {
        await ensureBookingCommerceWebhooks(shop._id);
        await reconcileRecentPaidOrdersForShop({ shop });
      } catch (error) {
        console.warn('Could not initialize SHOPLINE order reconciliation after authorization:', error.message);
      }
    }
    res.redirect('/app');
  } catch (error) { next(error); }
});
