import {
  applyCors,
  DEFAULT_ROOM_ID,
  extractBearerToken,
  normalizeRoomId,
  verifyRoomToken
} from './_lib/auth.js';

const MAX_PAYLOAD_BYTES = 100 * 1024;
const memoryRoomStates = new Map();

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

function getRedisKey(roomId) {
  return roomId === DEFAULT_ROOM_ID ? 'fdn_lauchang_room_state' : `room:${roomId}:state`;
}

export default async function handler(req, res) {
  const cors = applyCors(req, res, { methods: 'GET, POST, OPTIONS', allowPublicRead: true });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

  const { url: redisUrl, token: redisToken } = getRedisConfig();
  const redisKey = getRedisKey(roomId);

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

      const existing = memoryRoomStates.get(roomId);
      const incomingUpdatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now();
      const monotonicUpdatedAt = existing && typeof existing.updatedAt === 'number'
        ? Math.max(incomingUpdatedAt, existing.updatedAt + 1)
        : incomingUpdatedAt;

      const stateToSave = {
        ...payload,
        roomId,
        updatedAt: monotonicUpdatedAt
      };

      if (redisUrl && redisToken) {
        try {
          await fetch(`${redisUrl}/set/${encodeURIComponent(redisKey)}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${redisToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(stateToSave)
          });
        } catch (e) {
          console.error('Redis SET error:', e);
        }
      }

      memoryRoomStates.set(roomId, stateToSave);
      return res.status(200).json({
        success: true,
        state: stateToSave,
        persistence: redisUrl && redisToken ? 'redis' : 'memory'
      });
    } catch {
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (redisUrl && redisToken) {
    try {
      const redisRes = await fetch(`${redisUrl}/get/${encodeURIComponent(redisKey)}`, {
        headers: {
          Authorization: `Bearer ${redisToken}`
        }
      });
      const redisData = await redisRes.json();
      if (redisData && redisData.result !== undefined && redisData.result !== null) {
        let parsed = redisData.result;
        while (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            break;
          }
        }
        if (parsed && typeof parsed === 'object') {
          memoryRoomStates.set(roomId, parsed);
          return res.status(200).json(parsed);
        }
      }
    } catch (e) {
      console.error('Redis GET error:', e);
    }
  }

  return res.status(200).json(memoryRoomStates.get(roomId) || {});
}
