import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import roomsHandler from '../api/rooms.js';
import authHandler from '../api/auth.js';
import syncHandler from '../api/sync.js';
import { resetRateLimiter, resetRoomCreateRateLimit } from '../api/_lib/auth.js';
import { clearMemoryStore } from '../api/_lib/store.js';

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

describe('Multi-Room API & Strict Room Isolation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimiter();
    resetRoomCreateRateLimit();
    clearMemoryStore();
    process.env.ADMIN_PASSWORD = 'global-default-admin-pw';
    process.env.SESSION_SECRET = 'multi-room-test-secret-32-bytes-long';
    process.env.NODE_ENV = 'test';
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates an isolated custom room with hashed PIN and returns working URLs and token', async () => {
    const createReq = {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      body: {
        title: 'Friday Showmatch',
        roomId: 'friday-cup',
        password: 'room-pin-9999',
        bestOf: 5,
        teams: [
          { name: 'ALPHA', subtitle: 'TEAM A', color: '#10b981', logoUrl: 'https://example.com/a.png' },
          { name: 'OMEGA', subtitle: 'TEAM B', color: '#f59e0b', logoUrl: 'javascript:alert(1)' }
        ],
        items: [
          { label: 'VALORANT', color: '#ef4444', weight: 2 },
          { label: 'ROCKET LEAGUE', color: '#3b82f6', weight: 1, imageUrl: 'data:text/html,<svg>' }
        ]
      }
    };
    const createRes = createMockRes();
    await roomsHandler(createReq, createRes);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.roomId).toBe('friday-cup');
    expect(createRes.body.urls).toEqual({
      control: '/room/friday-cup/control',
      roulette: '/room/friday-cup/roulette',
      scoreboard: '/room/friday-cup/scoreboard'
    });
    expect(createRes.body.state.teams[0].logoUrl).toBe('https://example.com/a.png');
    expect(createRes.body.state.teams[1].logoUrl).toBe('');
    expect(createRes.body.state.items[1].imageUrl).toBe('');

    const getReq = {
      method: 'GET',
      query: { room: 'friday-cup' },
      headers: { host: 'localhost:3000' }
    };
    const getRes = createMockRes();
    await syncHandler(getReq, getRes);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.title).toBe('FRIDAY SHOWMATCH');
    expect(getRes.body.passwordHash).toBeUndefined();
  });

  it('enforces per-room scrypt password and blocks global ADMIN_PASSWORD on created rooms', async () => {
    const createRes = createMockRes();
    await roomsHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        body: {
          title: 'Private Cup',
          roomId: 'private-cup',
          password: 'secret-room-pin'
        }
      },
      createRes
    );
    expect(createRes.statusCode).toBe(201);

    const wrongAdminRes = createMockRes();
    await authHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.2.1' },
        body: { roomId: 'private-cup', password: process.env.ADMIN_PASSWORD }
      },
      wrongAdminRes
    );
    expect(wrongAdminRes.statusCode).toBe(401);

    const validPinRes = createMockRes();
    await authHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.2.1' },
        body: { roomId: 'private-cup', password: 'secret-room-pin' }
      },
      validPinRes
    );
    expect(validPinRes.statusCode).toBe(200);
    expect(validPinRes.body.roomId).toBe('private-cup');
  });

  it('rejects duplicate roomId creation with 409 and isolates room tokens strictly', async () => {
    const resA = createMockRes();
    await roomsHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        body: { title: 'Room One', roomId: 'iso-a', password: 'pin-room-a' }
      },
      resA
    );
    expect(resA.statusCode).toBe(201);

    const dupRes = createMockRes();
    await roomsHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        body: { title: 'Room One Dup', roomId: 'iso-a', password: 'pin-room-other' }
      },
      dupRes
    );
    expect(dupRes.statusCode).toBe(409);

    const resB = createMockRes();
    await roomsHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        body: { title: 'Room Two', roomId: 'iso-b', password: 'pin-room-b' }
      },
      resB
    );
    expect(resB.statusCode).toBe(201);

    const crossPost = createMockRes();
    await syncHandler(
      {
        method: 'POST',
        query: { room: 'iso-b' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${resA.body.token}`
        },
        body: { title: 'HIJACKED' }
      },
      crossPost
    );
    expect(crossPost.statusCode).toBe(403);
  });
});
