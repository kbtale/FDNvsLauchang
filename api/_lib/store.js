import { DEFAULT_ROOM_ID } from './auth.js';

export const CUSTOM_ROOM_TTL_SECONDS = 30 * 24 * 60 * 60;

const memoryStore = new Map();

export function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  return { url, token };
}

export function isRedisConfigured() {
  const { url, token } = getRedisConfig();
  return Boolean(url && token);
}

export function getPersistenceMode() {
  return isRedisConfigured() ? 'redis' : 'memory';
}

function readMemoryEntry(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() >= entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function writeMemoryEntry(key, value, ttlSeconds = 0) {
  const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
  memoryStore.set(key, { value, expiresAt });
}

export async function getStoreValue(key) {
  const { url, token } = getRedisConfig();
  if (url && token) {
    try {
      const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.result !== undefined && data.result !== null) {
        let parsed = data.result;
        while (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            break;
          }
        }
        if (parsed && typeof parsed === 'object') {
          writeMemoryEntry(key, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.error('Redis GET error:', e);
    }
  }
  return readMemoryEntry(key);
}

export async function setStoreValue(key, value, options = {}) {
  const ttlSeconds = typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0
    ? Math.floor(options.ttlSeconds)
    : 0;
  const { url, token } = getRedisConfig();
  if (url && token) {
    try {
      const query = ttlSeconds > 0 ? `?EX=${ttlSeconds}` : '';
      await fetch(`${url}/set/${encodeURIComponent(key)}${query}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(value)
      });
    } catch (e) {
      console.error('Redis SET error:', e);
    }
  }
  writeMemoryEntry(key, value, ttlSeconds);
}

export function getRoomMetaKey(roomId) {
  return `room:${roomId}:meta`;
}

export function getRoomStateKey(roomId) {
  return `room:${roomId}:state`;
}

export async function getRoomMeta(roomId) {
  return getStoreValue(getRoomMetaKey(roomId));
}

export async function setRoomMeta(roomId, meta) {
  const ttlSeconds = roomId === DEFAULT_ROOM_ID ? 0 : CUSTOM_ROOM_TTL_SECONDS;
  return setStoreValue(getRoomMetaKey(roomId), meta, { ttlSeconds });
}

export async function getRoomState(roomId) {
  const state = await getStoreValue(getRoomStateKey(roomId));
  if (state) {
    return state;
  }
  if (roomId === DEFAULT_ROOM_ID) {
    return getStoreValue('fdn_lauchang_room_state');
  }
  return null;
}

export async function setRoomState(roomId, state) {
  const ttlSeconds = roomId === DEFAULT_ROOM_ID ? 0 : CUSTOM_ROOM_TTL_SECONDS;
  await setStoreValue(getRoomStateKey(roomId), state, { ttlSeconds });
}

export function clearMemoryStore() {
  memoryStore.clear();
}
