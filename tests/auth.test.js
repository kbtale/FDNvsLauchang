import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import authHandler from '../api/auth.js';
import verifyHandler from '../api/verify.js';
import {
  hashPassword,
  verifyPasswordHash,
  signRoomToken,
  verifyRoomToken,
  resetRateLimiter
} from '../api/_lib/auth.js';

function createMockRes() {
  const headers = {};
  const res = {
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
  return res;
}

describe('Auth & Token Security', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimiter();
    process.env.ADMIN_PASSWORD = 'super-secret-test-password-123';
    process.env.SESSION_SECRET = 'test-hmac-signing-secret-32-bytes-min';
    process.env.NODE_ENV = 'test';
    delete process.env.VERCEL;
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('never leaks raw password inside issued token', async () => {
    const req = {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      socket: { remoteAddress: '10.0.0.1' },
      body: { password: process.env.ADMIN_PASSWORD, roomId: 'fdn-vs-lauchang' }
    };
    const res = createMockRes();
    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.includes('.')).toBe(true);

    const decodedRaw = Buffer.from(res.body.token, 'base64').toString('utf8');
    expect(decodedRaw).not.toContain(process.env.ADMIN_PASSWORD);

    const [payloadPart] = res.body.token.split('.');
    const decodedPayload = Buffer.from(payloadPart, 'base64url').toString('utf8');
    expect(decodedPayload).not.toContain(process.env.ADMIN_PASSWORD);
    const parsed = JSON.parse(decodedPayload);
    expect(parsed.roomId).toBe('fdn-vs-lauchang');
    expect(typeof parsed.exp).toBe('number');
    expect(parsed.exp).toBeGreaterThan(Date.now());
  });

  it('rejects hardcoded fallback password when ADMIN_PASSWORD is unset', async () => {
    delete process.env.ADMIN_PASSWORD;
    const req = {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      socket: { remoteAddress: '10.0.0.2' },
      body: { password: 'FDNvsLauchang2026!' }
    };
    const res = createMockRes();
    await authHandler(req, res);

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body?.success).not.toBe(true);
    expect(res.body?.token).toBeUndefined();
  });

  it('fails closed in production when SESSION_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;

    const req = {
      method: 'POST',
      headers: { host: 'app.example.com', origin: 'https://app.example.com' },
      socket: { remoteAddress: '10.0.0.3' },
      body: { password: process.env.ADMIN_PASSWORD }
    };
    const res = createMockRes();
    await authHandler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body?.token).toBeUndefined();
  });

  it('verifies valid token and rejects tampered token', async () => {
    const loginReq = {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
      socket: { remoteAddress: '10.0.0.4' },
      body: { password: process.env.ADMIN_PASSWORD, roomId: 'room-alpha' }
    };
    const loginRes = createMockRes();
    await authHandler(loginReq, loginRes);
    const token = loginRes.body.token;

    const verifyReq = {
      method: 'GET',
      query: { room: 'room-alpha' },
      headers: { authorization: `Bearer ${token}`, host: 'localhost:3000' }
    };
    const verifyRes = createMockRes();
    await verifyHandler(verifyReq, verifyRes);
    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.roomId).toBe('room-alpha');

    const [p, sig] = token.split('.');
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith('a') ? 'b' : 'a');
    const badReq = {
      method: 'GET',
      query: { room: 'room-alpha' },
      headers: { authorization: `Bearer ${p}.${tamperedSig}`, host: 'localhost:3000' }
    };
    const badRes = createMockRes();
    await verifyHandler(badReq, badRes);
    expect(badRes.statusCode).toBe(401);
    expect(badRes.body.valid).toBe(false);
  });

  it('rejects wildcard CORS on mutating auth endpoint', async () => {
    const req = {
      method: 'POST',
      headers: { host: 'app.example.com', origin: 'https://evil.example.net' },
      socket: { remoteAddress: '10.0.0.5' },
      body: { password: process.env.ADMIN_PASSWORD }
    };
    const res = createMockRes();
    await authHandler(req, res);

    expect(res.getHeader('access-control-allow-origin')).not.toBe('*');
    expect(res.statusCode).toBe(403);
  });

  it('rate limits repeated failed login attempts', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 7; i++) {
      const req = {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.0.99' },
        body: { password: 'wrong-password' }
      };
      const res = createMockRes();
      await authHandler(req, res);
      lastStatus = res.statusCode;
    }
    expect(lastStatus).toBe(429);
  });

  it('rejects expired tokens with 401', async () => {
    const expired = signRoomToken('room-exp', { now: Date.now() - 10_000, ttlMs: 1_000 });
    const check = verifyRoomToken(expired.token, { expectedRoomId: 'room-exp' });
    expect(check.valid).toBe(false);
    expect(check.status).toBe(401);
    expect(check.reason).toBe('TOKEN_EXPIRED');

    const verifyReq = {
      method: 'GET',
      query: { room: 'room-exp' },
      headers: { authorization: `Bearer ${expired.token}`, host: 'localhost:3000' }
    };
    const verifyRes = createMockRes();
    await verifyHandler(verifyReq, verifyRes);
    expect(verifyRes.statusCode).toBe(401);
  });

  it('hashes and verifies per-room passwords with salted scrypt', () => {
    const h1 = hashPassword('my-room-pin-2026');
    const h2 = hashPassword('my-room-pin-2026');
    expect(h1).not.toBe(h2);
    expect(h1.startsWith('scrypt$')).toBe(true);
    expect(verifyPasswordHash('my-room-pin-2026', h1)).toBe(true);
    expect(verifyPasswordHash('wrong-pin', h1)).toBe(false);
  });

  it('allows explicitly configured ALLOWED_ORIGINS on mutating requests', async () => {
    process.env.ALLOWED_ORIGINS = 'https://studio.example.com, https://obs.example.com';
    const req = {
      method: 'POST',
      headers: { host: 'api.example.com', origin: 'https://studio.example.com' },
      socket: { remoteAddress: '10.0.0.8' },
      body: { password: process.env.ADMIN_PASSWORD }
    };
    const res = createMockRes();
    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('access-control-allow-origin')).toBe('https://studio.example.com');
  });
});
