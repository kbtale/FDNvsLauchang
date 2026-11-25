import crypto from 'node:crypto';

export const DEFAULT_ROOM_ID = 'fdn-vs-lauchang';
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

let ephemeralDevSecret = null;
const memoryRateLimits = new Map();

export function isProduction() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV === 'production'
  );
}

export function normalizeRoomId(rawRoomId) {
  if (rawRoomId === undefined || rawRoomId === null || rawRoomId === '') {
    return DEFAULT_ROOM_ID;
  }
  const normalized = String(rawRoomId).trim().toLowerCase();
  if (!ROOM_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

export function getSessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }
  if (isProduction()) {
    return null;
  }
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralDevSecret;
}

export function getDefaultAdminPassword() {
  const configured = process.env.ADMIN_PASSWORD;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  return null;
}

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  const sameDigest = crypto.timingSafeEqual(digestA, digestB);
  return sameDigest && Buffer.byteLength(a, 'utf8') === Buffer.byteLength(b, 'utf8');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordHash(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, storedHex] = parts;
  if (!salt || !storedHex) {
    return false;
  }
  try {
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    const storedBuf = Buffer.from(storedHex, 'hex');
    if (derivedBuf.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedBuf, storedBuf);
  } catch {
    return false;
  }
}

export function signRoomToken(roomId, options = {}) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('SESSION_SECRET_MISSING');
  }
  const now = typeof options.now === 'number' ? options.now : Date.now();
  const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : TOKEN_TTL_MS;
  const payload = {
    roomId,
    iat: now,
    exp: now + ttlMs
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    roomId: payload.roomId,
    iat: payload.iat,
    exp: payload.exp
  };
}

export function verifyRoomToken(token, options = {}) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'INVALID_TOKEN', status: 401 };
  }
  const secret = getSessionSecret();
  if (!secret) {
    return { valid: false, reason: 'SERVER_MISCONFIGURED', status: 503 };
  }
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'INVALID_TOKEN', status: 401 };
  }
  const [encodedPayload, receivedSig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  const receivedBuf = Buffer.from(receivedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
    return { valid: false, reason: 'INVALID_SIGNATURE', status: 401 };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'MALFORMED_PAYLOAD', status: 401 };
  }

  if (!payload || typeof payload.roomId !== 'string' || typeof payload.exp !== 'number') {
    return { valid: false, reason: 'MALFORMED_PAYLOAD', status: 401 };
  }

  const now = typeof options.now === 'number' ? options.now : Date.now();
  if (now >= payload.exp) {
    return { valid: false, reason: 'TOKEN_EXPIRED', status: 401 };
  }

  if (options.expectedRoomId && payload.roomId !== options.expectedRoomId) {
    return { valid: false, reason: 'ROOM_MISMATCH', status: 403 };
  }

  return {
    valid: true,
    roomId: payload.roomId,
    iat: payload.iat,
    exp: payload.exp,
    status: 200
  };
}

export function extractBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || '';
  if (typeof header !== 'string') {
    return null;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].trim();
}

export function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req?.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim();
  }
  return req?.socket?.remoteAddress || 'unknown';
}

export function checkLoginRateLimit(key, now = Date.now()) {
  const entry = memoryRateLimits.get(key);
  if (!entry || now >= entry.resetAt) {
    if (entry) {
      memoryRateLimits.delete(key);
    }
    return { limited: false, retryAfterSeconds: 0 };
  }
  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key, now = Date.now()) {
  const entry = memoryRateLimits.get(key);
  if (!entry || now >= entry.resetAt) {
    memoryRateLimits.set(key, {
      attempts: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return;
  }
  entry.attempts += 1;
}

export function clearLoginRateLimit(key) {
  memoryRateLimits.delete(key);
}

export function resetRateLimiter() {
  memoryRateLimits.clear();
}

function getAllowedOrigins(req) {
  const allowed = new Set();
  const host = req?.headers?.host;
  if (typeof host === 'string' && host.trim().length > 0) {
    allowed.add(`https://${host.trim()}`);
    allowed.add(`http://${host.trim()}`);
  }
  const configured = process.env.ALLOWED_ORIGINS || '';
  configured
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((origin) => allowed.add(origin));
  return allowed;
}

export function applyCors(req, res, options = {}) {
  const methods = options.methods || 'GET, POST, OPTIONS';
  const allowPublicRead = Boolean(options.allowPublicRead);
  const origin = req?.headers?.origin;

  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (allowPublicRead && req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return { allowed: true };
  }

  res.setHeader('Vary', 'Origin');

  if (!origin) {
    return { allowed: true };
  }

  const allowedOrigins = getAllowedOrigins(req);
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return { allowed: true };
  }

  return { allowed: false };
}
