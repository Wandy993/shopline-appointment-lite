const RATE_LIMIT_ERROR = {
  error: 'RATE_LIMITED',
  message: 'Too many attempts. Please wait a minute.'
};

function requestKey(req) {
  const forwarded = req.get?.('x-forwarded-for') || req.headers?.['x-forwarded-for'] || '';
  const forwardedIp = String(forwarded).split(',')[0].trim();
  const ip = req.get?.('cf-connecting-ip')
    || req.headers?.['cf-connecting-ip']
    || req.ip
    || forwardedIp
    || 'unknown';
  return 'booking:' + String(ip).slice(0, 200);
}

function rejectRequest(res, limit, windowMs) {
  res.set('RateLimit-Limit', String(limit));
  res.set('RateLimit-Remaining', '0');
  res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
  return res.status(429).json(RATE_LIMIT_ERROR);
}

export function createBookingRateLimitMiddleware({ limit = 10, windowMs = 60_000 } = {}) {
  const localCounters = new Map();
  let operations = 0;

  return async function bookingRateLimit(req, res, next) {
    const key = requestKey(req);
    const cloudflareLimiter = req.app?.locals?.bookingRateLimiter;

    if (cloudflareLimiter && typeof cloudflareLimiter.limit === 'function') {
      try {
        const result = await cloudflareLimiter.limit({ key });
        if (!result?.success) return rejectRequest(res, limit, windowMs);
        res.set('RateLimit-Limit', String(limit));
        return next();
      } catch (error) {
        return next(error);
      }
    }

    // Local development/test fallback only. It deliberately has no timer:
    // Cloudflare Workers disallow background timers during global initialization.
    const now = Date.now();
    let counter = localCounters.get(key);
    if (!counter || counter.resetAt <= now) {
      counter = { count: 0, resetAt: now + windowMs };
      localCounters.set(key, counter);
    }

    if (counter.count >= limit) {
      return rejectRequest(res, limit, Math.max(1, counter.resetAt - now));
    }

    counter.count += 1;
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - counter.count)));

    operations += 1;
    if (localCounters.size > 1000 && operations % 64 === 0) {
      for (const [entryKey, entry] of localCounters) {
        if (entry.resetAt <= now) localCounters.delete(entryKey);
      }
    }

    return next();
  };
}
