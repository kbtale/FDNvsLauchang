import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import roomsHandler from '../api/rooms.js';
import authHandler from '../api/auth.js';
import syncHandler from '../api/sync.js';
import securityHandler from '../api/room-security.js';
import { resetRateLimiter, resetRoomCreateRateLimit } from '../api/_lib/auth.js';
import { clearMemoryStore } from '../api/_lib/store.js';
import {
  computeRemainingTimerMs,
  formatCountdown,
  computeAdaptivePollIntervalMs
} from '../src/lib/timer.js';
import {
  exportRoomConfig,
  parseImportedRoomConfig,
  createPresetRoomState
} from '../src/lib/roomSchema.js';

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

describe('Phase 4 — Timer, Announcement, JSON Import/Export, PIN Rotation & Adaptive Sync', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimiter();
    resetRoomCreateRateLimit();
    clearMemoryStore();
    process.env.SESSION_SECRET = 'phase4-test-secret-32-bytes-long-value';
    process.env.NODE_ENV = 'test';
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('computes deterministic countdown remaining time and adaptive polling intervals', () => {
    const start = 2_000_000;
    const runningTimer = { running: true, startedAt: start, durationMs: 60_000, remainingMs: 60_000 };
    expect(computeRemainingTimerMs(runningTimer, start + 15_000)).toBe(45_000);
    expect(computeRemainingTimerMs(runningTimer, start + 90_000)).toBe(0);
    expect(formatCountdown(65_000)).toBe('01:05');
    expect(formatCountdown(0)).toBe('00:00');

    expect(computeAdaptivePollIntervalMs({ isSpinning: true, timerRunning: false, lastActivityAt: start, now: start })).toBe(300);
    expect(computeAdaptivePollIntervalMs({ isSpinning: false, timerRunning: true, lastActivityAt: start - 20_000, now: start })).toBe(600);
    expect(computeAdaptivePollIntervalMs({ isSpinning: false, timerRunning: false, lastActivityAt: start - 30_000, now: start })).toBe(1800);
  });

  it('exports clean room JSON and sanitizes imported room configs', () => {
    const state = createPresetRoomState('versus-match', { roomId: 'weekly-cup', title: 'WEEKLY CUP' });
    const exported = exportRoomConfig(state);
    expect(exported.title).toBe('WEEKLY CUP');
    expect(exported.spin).toBeUndefined();

    const maliciousJson = JSON.stringify({
      ...exported,
      teams: [
        { name: 'GOOD', color: '#0d9f67', logoUrl: 'https://cdn.example.com/ok.png' },
        { name: 'BAD', color: 'not-a-color', logoUrl: 'javascript:alert(1)' }
      ]
    });
    const imported = parseImportedRoomConfig(maliciousJson, 'weekly-cup');
    expect(imported.teams[0].logoUrl).toBe('https://cdn.example.com/ok.png');
    expect(imported.teams[1].logoUrl).toBe('');
    expect(imported.teams[1].color.startsWith('#')).toBe(true);
  });

  it('rotates room PIN and immediately revokes prior session tokens via tokenVersion', async () => {
    const createRes = createMockRes();
    await roomsHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.8.1' },
        body: { title: 'Sec Event', roomId: 'sec-room', password: 'old-pin-1111' }
      },
      createRes
    );
    expect(createRes.statusCode).toBe(201);
    const oldToken = createRes.body.token;

    const rotateRes = createMockRes();
    await securityHandler(
      {
        method: 'POST',
        query: { room: 'sec-room' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${oldToken}`
        },
        body: { action: 'rotate-pin', newPassword: 'new-pin-2222' }
      },
      rotateRes
    );
    expect(rotateRes.statusCode).toBe(200);
    const freshToken = rotateRes.body.token;
    expect(freshToken).not.toBe(oldToken);

    const staleSyncRes = createMockRes();
    await syncHandler(
      {
        method: 'POST',
        query: { room: 'sec-room' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${oldToken}`
        },
        body: { title: 'SHOULD FAIL' }
      },
      staleSyncRes
    );
    expect(staleSyncRes.statusCode).toBe(401);

    const freshSyncRes = createMockRes();
    await syncHandler(
      {
        method: 'POST',
        query: { room: 'sec-room' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${freshToken}`
        },
        body: { title: 'UPDATED TITLE' }
      },
      freshSyncRes
    );
    expect(freshSyncRes.statusCode).toBe(200);

    const oldPinLogin = createMockRes();
    await authHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.8.2' },
        body: { roomId: 'sec-room', password: 'old-pin-1111' }
      },
      oldPinLogin
    );
    expect(oldPinLogin.statusCode).toBe(401);

    const newPinLogin = createMockRes();
    await authHandler(
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        socket: { remoteAddress: '10.0.8.2' },
        body: { roomId: 'sec-room', password: 'new-pin-2222' }
      },
      newPinLogin
    );
    expect(newPinLogin.statusCode).toBe(200);
  });
});
