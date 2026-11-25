import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import syncHandler from '../api/sync.js';
import authHandler from '../api/auth.js';
import { signRoomToken, resetRateLimiter } from '../api/_lib/auth.js';

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

describe('POST /api/sync Auth Enforcement', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimiter();
    process.env.ADMIN_PASSWORD = 'sync-test-password-456';
    process.env.SESSION_SECRET = 'sync-test-session-secret-32-bytes-long';
    process.env.NODE_ENV = 'test';
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 401 when POST /api/sync has no Authorization header', async () => {
    const req = {
      method: 'POST',
      query: { room: 'fdn-vs-lauchang' },
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      body: { fdnScore: 999, remainingGames: ['HACKED'] }
    };
    const res = createMockRes();
    await syncHandler(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when POST /api/sync has a tampered token', async () => {
    const req = {
      method: 'POST',
      query: { room: 'fdn-vs-lauchang' },
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        authorization: 'Bearer fake.signature'
      },
      body: { fdnScore: 5, remainingGames: ['FORTNITE'] }
    };
    const res = createMockRes();
    await syncHandler(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when POST /api/sync has an expired token', async () => {
    const expired = signRoomToken('fdn-vs-lauchang', { now: Date.now() - 50_000, ttlMs: 1_000 });
    const req = {
      method: 'POST',
      query: { room: 'fdn-vs-lauchang' },
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        authorization: `Bearer ${expired.token}`
      },
      body: { fdnScore: 9 }
    };
    const res = createMockRes();
    await syncHandler(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when a valid token for Room A is posted to Room B', async () => {
    const loginReq = {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      socket: { remoteAddress: '10.0.1.1' },
      body: { password: process.env.ADMIN_PASSWORD, roomId: 'room-a' }
    };
    const loginRes = createMockRes();
    await authHandler(loginReq, loginRes);
    const tokenA = loginRes.body.token;

    const req = {
      method: 'POST',
      query: { room: 'room-b' },
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        authorization: `Bearer ${tokenA}`
      },
      body: { fdnScore: 2, remainingGames: ['FORTNITE'] }
    };
    const res = createMockRes();
    await syncHandler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('allows authenticated POST /api/sync for matching room and serves GET publicly', async () => {
    const loginReq = {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      socket: { remoteAddress: '10.0.1.2' },
      body: { password: process.env.ADMIN_PASSWORD, roomId: 'fdn-vs-lauchang' }
    };
    const loginRes = createMockRes();
    await authHandler(loginReq, loginRes);
    const token = loginRes.body.token;

    const postReq = {
      method: 'POST',
      query: { room: 'fdn-vs-lauchang' },
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        authorization: `Bearer ${token}`
      },
      body: { fdnScore: 3, lauchangScore: 1, remainingGames: ['FORTNITE'] }
    };
    const postRes = createMockRes();
    await syncHandler(postReq, postRes);

    expect(postRes.statusCode).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.state.fdnScore).toBe(3);

    const getReq = {
      method: 'GET',
      query: { room: 'fdn-vs-lauchang' },
      headers: { host: 'localhost:3000' }
    };
    const getRes = createMockRes();
    await syncHandler(getReq, getRes);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.fdnScore).toBe(3);
  });
});
