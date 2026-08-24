import 'dotenv/config';

function required(name, fallback = '') {
  const value = process.env[name] ?? fallback;
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const appUrl = required('APP_URL', 'http://localhost:3000').replace(/\/$/, '');

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  appUrl,
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/appointment-lite'),
  shopline: {
    appKey: required('SHOPLINE_APP_KEY'),
    appSecret: required('SHOPLINE_APP_SECRET'),
    scopes: process.env.SHOPLINE_SCOPES || 'read_products,read_store_information',
    apiVersion: process.env.SHOPLINE_API_VERSION || 'v20260301',
    callbackUrl: `${appUrl}${process.env.SHOPLINE_CALLBACK_PATH || '/auth/callback'}`
  },
  sessionSecret: required('SESSION_SECRET', 'development-only-change-me'),
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  publicAllowedOrigins: (process.env.PUBLIC_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean),
  email: {
    resendKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Appointment Lite <bookings@example.com>',
    merchantTo: process.env.MERCHANT_NOTIFICATION_EMAIL || ''
  },
  defaultPlan: process.env.DEFAULT_PLAN || 'free'
});

export function assertProductionConfig() {
  if (config.nodeEnv !== 'production') return;
  if (config.sessionSecret === 'development-only-change-me' || config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
  if (!config.appUrl.startsWith('https://')) throw new Error('APP_URL must use HTTPS in production');
}
