import crypto from 'node:crypto';
import {
  applyCors,
  extractBearerToken,
  normalizeRoomId,
  verifyRoomToken
} from './_lib/auth.js';
import {
  getPersistenceMode,
  getRoomState,
  setRoomState
} from './_lib/store.js';
import { normalizeRoomState } from '../src/lib/roomSchema.js';

const MAX_PAYLOAD_BYTES = 100 * 1024;

function computeEtag(state) {
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify(state))
    .digest('base64url');
  return `"${hash}"`;
}

function stripSensitive(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const { passwordHash, password, ...safe } = obj;
  return safe;
}

export default async function handler(req, res) {
  const cors = applyCors(req, res, { methods: 'GET, POST, OPTIONS', allowPublicRead: true });
  const persistence = getPersistenceMode();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-ArenaOBS-Persistence', persistence);
  res.setHeader('Access-Control-Expose-Headers', 'X-ArenaOBS-Persistence, ETag');

  if (req.method === 'OPTIONS') {
    if (!cors.allowed) {
      return res.status(403).end();
    }
    return res.status(200).end();
  }

  const roomId = normalizeRoomId(req.query?.room);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid roomId' });
  }

  if (req.method === 'POST') {
    if (!cors.allowed) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const verification = verifyRoomToken(token, { expectedRoomId: roomId });
    if (!verification.valid) {
      return res.status(verification.status).json({ error: verification.reason });
    }

    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ error: 'Invalid state payload' });
      }

      const serialized = JSON.stringify(payload);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
        return res.status(413).json({ error: 'Payload too large' });
      }

      const existing = await getRoomState(roomId);
      const incomingUpdatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now();
      const monotonicUpdatedAt = existing && typeof existing.updatedAt === 'number'
        ? Math.max(incomingUpdatedAt, existing.updatedAt + 1)
        : incomingUpdatedAt;

      const isLegacyPayload = !Array.isArray(payload.teams) && !Array.isArray(payload.items);
      const normalized = normalizeRoomState(payload, roomId);
      const stateToSave = isLegacyPayload
        ? {
            ...stripSensitive(payload),
            ...normalized,
            roomId,
            updatedAt: monotonicUpdatedAt
          }
        : {
            ...normalized,
            roomId,
            updatedAt: monotonicUpdatedAt
          };

      await setRoomState(roomId, stateToSave);
      return res.status(200).json({
        success: true,
        state: stateToSave,
        persistence
      });
    } catch {
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stored = await getRoomState(roomId);
  const safeState = stored ? stripSensitive(stored) : {};

  const etag = computeEtag(safeState);
  res.setHeader('ETag', etag);

  const ifNoneMatch = req.headers?.['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    return res.status(304).end();
  }

  const sinceParam = Number(req.query?.since);
  if (
    Number.isFinite(sinceParam) &&
    sinceParam > 0 &&
    typeof safeState.updatedAt === 'number' &&
    safeState.updatedAt <= sinceParam
  ) {
    return res.status(200).json({ unchanged: true, updatedAt: safeState.updatedAt, persistence });
  }

  return res.status(200).json(safeState);
}
