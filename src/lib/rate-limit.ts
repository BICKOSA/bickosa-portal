type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RequestWindow = {
  timestamps: number[];
};

const requestStore = new Map<string, RequestWindow>();

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const record = requestStore.get(key) ?? { timestamps: [] };

  const recentRequests = record.timestamps.filter((timestamp) => timestamp > windowStart);

  if (recentRequests.length >= config.maxRequests) {
    const oldestRequest = recentRequests[0];
    const retryAfterMs = Math.max(0, config.windowMs - (now - oldestRequest));

    requestStore.set(key, { timestamps: recentRequests });

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  recentRequests.push(now);
  requestStore.set(key, { timestamps: recentRequests });

  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - recentRequests.length),
    retryAfterSeconds: 0,
  };
}
