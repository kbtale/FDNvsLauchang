import {
  applyCors,
  extractBearerToken,
  normalizeRoomId,
  verifyRoomToken
} from './_lib/auth.js';

export default async function handler(req, res) {
  const cors = applyCors(req, res, { methods: 'GET, POST, OPTIONS', allowPublicRead: false });

  if (req.method === 'OPTIONS') {
    if (!cors.allowed) {
      return res.status(403).end();
    }
    return res.status(200).end();
  }

  if (!cors.allowed) {
    return res.status(403).json({ valid: false, error: 'Origin not allowed' });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ valid: false });
  }

  const rawRoom = req.query?.room ?? req.body?.roomId;
  const expectedRoomId = rawRoom !== undefined && rawRoom !== '' ? normalizeRoomId(rawRoom) : null;
  if (rawRoom !== undefined && rawRoom !== '' && !expectedRoomId) {
    return res.status(400).json({ valid: false, error: 'Invalid roomId' });
  }

  const result = verifyRoomToken(token, { expectedRoomId });
  if (!result.valid) {
    return res.status(result.status).json({ valid: false, reason: result.reason });
  }

  return res.status(200).json({
    valid: true,
    roomId: result.roomId,
    exp: result.exp
  });
}
