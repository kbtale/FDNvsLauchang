import {
  applyCors,
  checkLoginRateLimit,
  clearLoginRateLimit,
  constantTimeEqual,
  getClientIp,
  getDefaultAdminPassword,
  getSessionSecret,
  normalizeRoomId,
  recordFailedLogin,
  signRoomToken
} from './_lib/auth.js';

export default async function handler(req, res) {
  const cors = applyCors(req, res, { methods: 'POST, OPTIONS', allowPublicRead: false });

  if (req.method === 'OPTIONS') {
    if (!cors.allowed) {
      return res.status(403).end();
    }
    return res.status(200).end();
  }

  if (!cors.allowed) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const roomId = normalizeRoomId(body.roomId || req.query?.room);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid roomId' });
  }

  const secret = getSessionSecret();
  const configuredPassword = getDefaultAdminPassword();
  if (!secret || !configuredPassword) {
    return res.status(503).json({ error: 'Server authentication not configured' });
  }

  const rateKey = `${getClientIp(req)}:${roomId}`;
  const limitStatus = checkLoginRateLimit(rateKey);
  if (limitStatus.limited) {
    res.setHeader('Retry-After', String(limitStatus.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many login attempts, try again later' });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !constantTimeEqual(password, configuredPassword)) {
    recordFailedLogin(rateKey);
    return res.status(401).json({ error: 'Invalid administrator password' });
  }

  clearLoginRateLimit(rateKey);
  const signed = signRoomToken(roomId);
  return res.status(200).json({
    success: true,
    token: signed.token,
    roomId: signed.roomId,
    exp: signed.exp
  });
}
