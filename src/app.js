import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';
import { requireAdmin } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { adminPage } from './views/admin.js';
import { managePage } from './views/manage.js';

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
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use('/admin', express.static('public/admin', { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
  app.use('/manage/assets', express.static('public/manage', { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));

  app.get('/health', (req, res) => res.json({ ok: true, service: 'appointment-lite', version: '0.4.0' }));
  app.get('/', (req, res) => {
    if (req.query.handle || req.query.appkey) return res.redirect(`/auth/install?${new URLSearchParams(req.query)}`);
    res.type('html').send('<!doctype html><title>Appointment Lite</title><h1>Appointment Lite is running</h1><p>Open this app from SHOPLINE Admin to continue.</p>');
  });
  app.use('/auth', authRouter);
  app.get('/app', requireAdmin, (req, res) => res.type('html').send(adminPage()));
  app.get('/manage', (req, res) => res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).type('html').send(managePage()));
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
