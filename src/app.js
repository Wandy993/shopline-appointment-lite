import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';
import { integrationsRouter } from './routes/integrations.js';
import { requireAdmin } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { adminPage } from './views/admin.js';
import { managePage } from './views/manage.js';
import { bookingPage } from './views/book.js';
import { homePage, privacyPage, termsPage, faqPage, preferredLegalLocale } from './views/legal.js';
import { shoplinePaidBookingWebhook } from './routes/shopline-webhooks.js';
import { subscriptionRouter } from './routes/subscription.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"], frameAncestors: ["'self'", 'https://*.myshopline.com']
    }
  }}));
  app.post('/webhooks/shopline', express.raw({ type: 'application/json', limit: '1mb' }), shoplinePaidBookingWebhook);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use('/admin', express.static('public/admin', { maxAge: 0, etag: true, setHeaders(res) { res.setHeader('Cache-Control', 'no-store'); } }));
  app.use('/assets/staff', express.static('public/staff-avatars', { maxAge: config.nodeEnv === 'production' ? '7d' : 0 }));
  app.use('/manage/assets', express.static('public/manage', { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
  app.use('/book/assets', express.static('public/book', { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
  app.use('/integration-assets', express.static('public/integrations', { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
  app.use('/legal/assets', express.static('public/legal', { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));

  app.get('/health', (req, res) => res.set('Cache-Control', 'no-store').json({ ok: true, service: 'appointment-lite', version: '0.8.1', build: '0.8.1.1-service-wizard-simplification-ui-polish.1', release: 'v0.8.1.1-service-wizard-simplification-ui-polish' }));
  const legalHeaders = { 'Cache-Control': 'public, max-age=3600', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
  app.get('/privacy', (req, res) => res.redirect(302, `/${preferredLegalLocale(req.get('accept-language'))}/privacy`));
  app.get('/terms', (req, res) => res.redirect(302, `/${preferredLegalLocale(req.get('accept-language'))}/terms`));
  app.get('/faq', (req, res) => res.redirect(302, `/${preferredLegalLocale(req.get('accept-language'))}/faq`));
  app.get('/zh-cn', (req, res) => res.set(legalHeaders).type('html').send(homePage('zh-cn')));
  app.get('/en', (req, res) => res.redirect(302, '/')); 
  app.get('/zh-cn/privacy', (req, res) => res.set(legalHeaders).type('html').send(privacyPage('zh-cn')));
  app.get('/en/privacy', (req, res) => res.set(legalHeaders).type('html').send(privacyPage('en')));
  app.get('/zh-cn/terms', (req, res) => res.set(legalHeaders).type('html').send(termsPage('zh-cn')));
  app.get('/en/terms', (req, res) => res.set(legalHeaders).type('html').send(termsPage('en')));
  app.get('/zh-cn/faq', (req, res) => res.set(legalHeaders).type('html').send(faqPage('zh-cn')));
  app.get('/en/faq', (req, res) => res.set(legalHeaders).type('html').send(faqPage('en')));
  app.get('/robots.txt', (req, res) => res.set(legalHeaders).type('text').send(`User-agent: *\nAllow: /\nSitemap: ${config.appUrl}/sitemap.xml\n`));
  app.get('/sitemap.xml', (req, res) => {
    const paths = ['/', '/en/privacy', '/en/terms', '/en/faq', '/zh-cn', '/zh-cn/privacy', '/zh-cn/terms', '/zh-cn/faq'];
    const urls = paths.map(path => `<url><loc>${config.appUrl}${path}</loc></url>`).join('');
    res.set(legalHeaders).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });
  app.get('/', (req, res) => {
    if (req.query.handle || req.query.appkey) return res.redirect(`/auth/install?${new URLSearchParams(req.query)}`);
    res.set(legalHeaders).type('html').send(homePage('en'));
  });
  app.use('/auth', authRouter);
  app.use('/subscription', subscriptionRouter);
  app.use('/integrations', integrationsRouter);
  app.get('/app', requireAdmin, (req, res) => res.set('Cache-Control', 'no-store').type('html').send(adminPage()));
  app.get('/manage', (req, res) => res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).type('html').send(managePage()));
  app.get('/book/:ruleId', (req, res) => res.set({ 'Cache-Control': 'no-store' }).type('html').send(bookingPage(req.params.ruleId)));
  app.use('/api/admin', adminRouter);
  app.use('/api/public', cors({
    origin(origin, callback) {
      if (!origin || config.publicAllowedOrigins.length === 0 || config.publicAllowedOrigins.includes(origin)) return callback(null, true);
      callback(Object.assign(new Error('Origin is not allowed'), { status: 403 }));
    },
    methods: ['GET', 'POST'], allowedHeaders: ['Content-Type']
  }), publicRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
