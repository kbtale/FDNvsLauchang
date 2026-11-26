import {
  applyCors,
  DEFAULT_ROOM_ID,
  extractBearerToken,
  hashPassword,
  normalizeRoomId,
  signRoomToken,
  verifyRoomToken
} from './_lib/auth.js';
import { getRoomMeta, setRoomMeta } from './_lib/store.js';

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
  const roomId = normalizeRoomId(req.query?.room || body.roomId);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid roomId' });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const roomMeta = await getRoomMeta(roomId);
  const currentVersion = typeof roomMeta?.tokenVersion === 'number' ? roomMeta.tokenVersion : 1;
  const verification = verifyRoomToken(token, {
    expectedRoomId: roomId,
    expectedTokenVersion: roomMeta ? currentVersion : undefined
  });
  if (!verification.valid) {
    return res.status(verification.status).json({ error: verification.reason });
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';

  if (action === 'revoke') {
    const nextVersion = currentVersion + 1;
    await setRoomMeta(roomId, {
      ...(roomMeta || { roomId, createdAt: Date.now() }),
      tokenVersion: nextVersion,
      updatedAt: Date.now()
    });
    const signed = signRoomToken(roomId, { tokenVersion: nextVersion });
    return res.status(200).json({
      success: true,
      token: signed.token,
      roomId,
      tokenVersion: nextVersion,
      exp: signed.exp
    });
  }

  if (action === 'rotate-pin') {
    if (roomId === DEFAULT_ROOM_ID && !roomMeta?.passwordHash) {
      return res.status(400).json({ error: 'Update ADMIN_PASSWORD in environment variables for the default room' });
    }
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
    if (newPassword.length < 4 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New PIN must be between 4 and 128 characters' });
    }
    const nextVersion = currentVersion + 1;
    const passwordHash = hashPassword(newPassword);
    await setRoomMeta(roomId, {
      ...(roomMeta || { roomId, createdAt: Date.now() }),
      passwordHash,
      tokenVersion: nextVersion,
      updatedAt: Date.now()
    });
    const signed = signRoomToken(roomId, { tokenVersion: nextVersion });
    return res.status(200).json({
      success: true,
      token: signed.token,
      roomId,
      tokenVersion: nextVersion,
      exp: signed.exp
    });
  }

  return res.status(400).json({ error: 'Unsupported security action' });
}
