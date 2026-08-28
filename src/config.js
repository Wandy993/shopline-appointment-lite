import 'dotenv/config';

function required(name, fallback = '') {
  const value = process.env[name] ?? fallback;
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const appUrl = required('APP_URL', 'http://localhost:3000').replace(/\/$/, '');

function boundedNumber(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function mergedShoplineScopes(value = '') {
  const required = ['read_products', 'read_store_information', 'read_content', 'read_orders', 'read_location'];
  const requested = String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  return [...new Set([...requested, ...required])].join(',');
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  appUrl,
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/appointment-lite'),
  mongoDbName: process.env.MONGODB_DB_NAME || 'shopline_appointment_lite',
  shopline: {
    appKey: required('SHOPLINE_APP_KEY'),
    appSecret: required('SHOPLINE_APP_SECRET'),
    scopes: mergedShoplineScopes(process.env.SHOPLINE_SCOPES || 'read_products,read_store_information,read_content'),
    apiVersion: process.env.SHOPLINE_API_VERSION || 'v20260301',
    callbackUrl: `${appUrl}${process.env.SHOPLINE_CALLBACK_PATH || '/auth/callback'}`,
    themeExtensionUuid: process.env.SHOPLINE_THEME_EXTENSION_UUID || '',
    themeBlockHandle: process.env.SHOPLINE_THEME_BLOCK_HANDLE || 'appointment-lite'
  },
  sessionSecret: required('SESSION_SECRET', 'development-only-change-me'),
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  publicAllowedOrigins: (process.env.PUBLIC_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean),
  legal: {
    operatorName: process.env.LEGAL_OPERATOR_NAME || 'Appointment Lite',
    supportEmail: process.env.LEGAL_SUPPORT_EMAIL || ''
  },
  googleCalendar: {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${appUrl}/integrations/google/callback`,
    tokenEncryptionKey: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || ''
  },
  opsHub: {
    enabled: String(process.env.OPS_HUB_ENABLED || 'false').toLowerCase() === 'true',
    ingestUrl: process.env.OPS_HUB_INGEST_URL || process.env.OPS_HUB_URL || '',
    appKey: process.env.OPS_HUB_APP_KEY || 'appointment-lite',
    ingestSecret: process.env.OPS_HUB_INGEST_SECRET || '',
    appVersion: process.env.APP_VERSION || '0.6.16',
    environment: process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development',
    timeoutMs: boundedNumber('OPS_HUB_TIMEOUT_MS', 15000, { min: 1000, max: 60000 }),
    batchSize: boundedNumber('OPS_HUB_BATCH_SIZE', 10, { min: 1, max: 50 }),
    workerIntervalMs: boundedNumber('OPS_HUB_WORKER_INTERVAL_MS', 10000, { min: 5000, max: 300000 }),
    initialSyncDelayMs: boundedNumber('OPS_HUB_INITIAL_SYNC_DELAY_MS', 15000, { min: 1000, max: 300000 }),
    heartbeatMs: boundedNumber('OPS_HUB_HEARTBEAT_MS', 300000, { min: 60000, max: 3600000 }),
    activeThrottleMs: boundedNumber('OPS_HUB_ACTIVE_THROTTLE_MS', 86400000, { min: 60000, max: 604800000 }),
    healthDedupeMs: boundedNumber('OPS_HUB_HEALTH_DEDUPE_MS', 300000, { min: 60000, max: 86400000 }),
    eventRetentionDays: boundedNumber('OPS_HUB_EVENT_RETENTION_DAYS', 45, { min: 7, max: 365 }),
    usageRetentionDays: boundedNumber('OPS_HUB_USAGE_RETENTION_DAYS', 120, { min: 30, max: 730 })
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'auto').toLowerCase(),
    resendKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Appointment Lite <bookings@example.com>',
    merchantTo: process.env.MERCHANT_NOTIFICATION_EMAIL || '',
    aliyun: {
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '',
      securityToken: process.env.ALIBABA_CLOUD_SECURITY_TOKEN || '',
      accountName: process.env.ALIYUN_DIRECTMAIL_ACCOUNT_NAME || '',
      fromAlias: process.env.ALIYUN_DIRECTMAIL_FROM_ALIAS || 'Appointment Lite',
      replyToAddress: process.env.ALIYUN_DIRECTMAIL_REPLY_TO !== 'false',
      endpoint: process.env.ALIYUN_DIRECTMAIL_ENDPOINT || 'dm.aliyuncs.com',
      regionId: process.env.ALIYUN_DIRECTMAIL_REGION_ID || 'cn-hangzhou',
      tagName: process.env.ALIYUN_DIRECTMAIL_TAG_NAME || ''
    }
  }
});

export function assertProductionConfig() {
  if (config.nodeEnv !== 'production') return;
  if (config.sessionSecret === 'development-only-change-me' || config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
  if (!config.appUrl.startsWith('https://')) throw new Error('APP_URL must use HTTPS in production');
}
