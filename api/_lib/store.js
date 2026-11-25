import { DEFAULT_ROOM_ID } from './auth.js';

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
          memoryStore.set(key, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.error('Redis GET error:', e);
    }
  }
  return memoryStore.get(key) || null;
}

export async function setStoreValue(key, value) {
  const { url, token } = getRedisConfig();
  if (url && token) {
    try {
      await fetch(`${url}/set/${encodeURIComponent(key)}`, {
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
  memoryStore.set(key, value);
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
  return setStoreValue(getRoomMetaKey(roomId), meta);
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
  await setStoreValue(getRoomStateKey(roomId), state);
}

export function clearMemoryStore() {
  memoryStore.clear();
}
