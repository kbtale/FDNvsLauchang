import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import {
  applyCors,
  extractBearerToken,
  normalizeRoomId,
  verifyRoomToken
} from './_lib/auth.js';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

export function detectImageMimeFromBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 3) {
    return null;
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export default async function handler(req, res) {
  const cors = applyCors(req, res, { methods: 'POST, OPTIONS', allowPublicRead: false });

  if (req.method === 'OPTIONS') {
    if (!cors.allowed) {
      return res.status(403).end();
    }
    return res.status(200).end();
  }

  if (!cors.allowed) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const roomId = normalizeRoomId(req.query?.room || req.body?.roomId);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid roomId' });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const verification = verifyRoomToken(token, { expectedRoomId: roomId });
  if (!verification.valid) {
    return res.status(verification.status).json({ error: verification.reason });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Blob storage not configured (set BLOB_READ_WRITE_TOKEN)' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const rawBase64 = typeof body.dataBase64 === 'string' ? body.dataBase64.trim() : '';
  if (!rawBase64) {
    return res.status(400).json({ error: 'Missing image payload' });
  }

  const cleanedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
  let buffer;
  try {
    buffer = Buffer.from(cleanedBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 image data' });
  }

  if (buffer.length === 0) {
    return res.status(400).json({ error: 'Empty image payload' });
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'Image exceeds 2 MB size limit' });
  }

  const detectedMime = detectImageMimeFromBytes(buffer);
  if (!detectedMime || !MIME_TO_EXT[detectedMime]) {
    return res.status(415).json({ error: 'Only PNG, JPEG, and WebP images are allowed' });
  }

  const ext = MIME_TO_EXT[detectedMime];
  const pathname = `arenaobs/${roomId}/${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: detectedMime
    });
    return res.status(201).json({
      success: true,
      url: blob.url,
      contentType: detectedMime,
      size: buffer.length
    });
  } catch {
    return res.status(500).json({ error: 'Failed to store uploaded image' });
  }
}
