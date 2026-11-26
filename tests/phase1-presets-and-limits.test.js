import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import roomsHandler from '../api/rooms.js';
import { resetRoomCreateRateLimit } from '../api/_lib/auth.js';
import { clearMemoryStore, setRoomState, CUSTOM_ROOM_TTL_SECONDS } from '../api/_lib/store.js';
import { ROOM_PRESETS, CLASSIC_PRESETS } from '../src/lib/roomSchema.js';

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: undefined,
    ended: false,
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

describe('Phase 1 — General Presets, Room Creation Rate Limiting & Sliding TTL', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetRoomCreateRateLimit();
    clearMemoryStore();
    process.env.SESSION_SECRET = 'phase1-test-secret-32-bytes-long-value';
    process.env.NODE_ENV = 'test';
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('provides general-event primary presets and separates classic FDN vs Lauchang preset', () => {
    expect(ROOM_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(ROOM_PRESETS.some((p) => p.id === 'fdn-vs-lauchang')).toBe(false);
    expect(ROOM_PRESETS.some((p) => p.id === 'versus-match')).toBe(true);
    expect(ROOM_PRESETS.some((p) => p.id === 'raffle-wheel')).toBe(true);
    expect(CLASSIC_PRESETS.some((p) => p.id === 'fdn-vs-lauchang')).toBe(true);
  });

  it('rate limits excessive room creation requests per IP with 429 and Retry-After', async () => {
    let lastRes;
    for (let i = 0; i < 12; i++) {
      const req = {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.50.1' },
        body: {
          title: `Event ${i}`,
          password: 'pin-1234'
        }
      };
      const res = createMockRes();
      await roomsHandler(req, res);
      lastRes = res;
    }
    expect(lastRes.statusCode).toBe(429);
    expect(Number(lastRes.getHeader('retry-after'))).toBeGreaterThan(0);
  });

  it('applies 30-day sliding TTL when writing custom room state to Upstash Redis', async () => {
    process.env.KV_REST_API_URL = 'https://redis.example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-redis-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'OK' })
    });
    global.fetch = fetchMock;

    await setRoomState('custom-event-1', { roomId: 'custom-event-1', title: 'LIVE EVENT', updatedAt: Date.now() });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain(`EX=${CUSTOM_ROOM_TTL_SECONDS}`);
    expect(CUSTOM_ROOM_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
  });
});
