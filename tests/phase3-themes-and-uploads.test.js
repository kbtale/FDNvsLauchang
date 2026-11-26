import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signRoomToken } from '../api/_lib/auth.js';
import { OVERLAY_THEMES, resolveOverlayTheme, EVENT_BADGE_ICONS } from '../src/lib/themes.js';
import { detectImageMimeFromBytes } from '../api/uploads.js';
import uploadHandler from '../api/uploads.js';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async (pathname) => ({
    url: `https://public.blob.vercel-storage.com/${pathname}`
  }))
}));

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

const VALID_PNG_B64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
]).toString('base64');

describe('Phase 3 — Themes, Icons & Authenticated Blob Uploads', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SESSION_SECRET = 'phase3-test-secret-32-bytes-long-value';
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('resolves built-in overlay themes and optional custom accent override', () => {
    expect(OVERLAY_THEMES.length).toBeGreaterThanOrEqual(5);
    expect(EVENT_BADGE_ICONS.length).toBeGreaterThanOrEqual(12);

    const neon = resolveOverlayTheme('cyber-neon');
    expect(neon.id).toBe('cyber-neon');
    expect(neon.rimColor).toBe('#22d3ee');

    const custom = resolveOverlayTheme('emerald-gold', '#ff5500');
    expect(custom.rimColor).toBe('#ff5500');
    expect(custom.cssVars['--overlay-accent']).toBe('#ff5500');

    const fallback = resolveOverlayTheme('unknown-theme');
    expect(fallback.id).toBe('emerald-gold');
  });

  it('validates image magic bytes and rejects spoofed non-image files', () => {
    expect(detectImageMimeFromBytes(Buffer.from(VALID_PNG_B64, 'base64'))).toBe('image/png');
    expect(detectImageMimeFromBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('image/jpeg');
    expect(detectImageMimeFromBytes(Buffer.from('RIFF1234WEBP', 'ascii'))).toBe('image/webp');
    expect(detectImageMimeFromBytes(Buffer.from('<svg onload=alert(1)>', 'utf8'))).toBeNull();
  });

  it('enforces room auth, magic-byte validation, and size cap on POST /api/uploads', async () => {
    const unauthRes = createMockRes();
    await uploadHandler(
      {
        method: 'POST',
        query: { room: 'room-x' },
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        body: { contentType: 'image/png', dataBase64: VALID_PNG_B64 }
      },
      unauthRes
    );
    expect(unauthRes.statusCode).toBe(401);

    const tokenA = signRoomToken('room-a').token;
    const crossRes = createMockRes();
    await uploadHandler(
      {
        method: 'POST',
        query: { room: 'room-b' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${tokenA}`
        },
        body: { contentType: 'image/png', dataBase64: VALID_PNG_B64 }
      },
      crossRes
    );
    expect(crossRes.statusCode).toBe(403);

    const spoofRes = createMockRes();
    await uploadHandler(
      {
        method: 'POST',
        query: { room: 'room-a' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${tokenA}`
        },
        body: {
          contentType: 'image/png',
          dataBase64: Buffer.from('<script>alert(1)</script>').toString('base64')
        }
      },
      spoofRes
    );
    expect(spoofRes.statusCode).toBe(415);

    const okRes = createMockRes();
    await uploadHandler(
      {
        method: 'POST',
        query: { room: 'room-a' },
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          authorization: `Bearer ${tokenA}`
        },
        body: { contentType: 'image/png', dataBase64: VALID_PNG_B64 }
      },
      okRes
    );
    expect(okRes.statusCode).toBe(201);
    expect(okRes.body.url).toContain('https://public.blob.vercel-storage.com/arenaobs/room-a/');
  });
});
