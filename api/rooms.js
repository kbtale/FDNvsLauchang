import crypto from 'node:crypto';
import {
  applyCors,
  checkRoomCreateRateLimit,
  DEFAULT_ROOM_ID,
  getClientIp,
  getSessionSecret,
  hashPassword,
  normalizeRoomId,
  recordRoomCreate,
  signRoomToken
} from './_lib/auth.js';
import {
  getPersistenceMode,
  getRoomMeta,
  setRoomMeta,
  setRoomState
} from './_lib/store.js';
import { createPresetRoomState, getRoomUrls } from '../src/lib/roomSchema.js';

function slugifyTitle(title) {
  const base = String(title || 'arena')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base || 'room'}-${suffix}`;
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

  const secret = getSessionSecret();
  if (!secret) {
    return res.status(503).json({ error: 'Server authentication not configured' });
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRoomCreateRateLimit(clientIp);
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many rooms created from this IP, try again later' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  if (password.length < 4 || password.length > 128) {
    return res.status(400).json({ error: 'Room admin PIN must be between 4 and 128 characters' });
  }

  const title = typeof body.title === 'string' && body.title.trim().length > 0
    ? body.title.trim().slice(0, 64)
    : 'CUSTOM SHOWMATCH';

  let roomId;
  if (body.roomId !== undefined && String(body.roomId).trim() !== '') {
    roomId = normalizeRoomId(body.roomId);
    if (!roomId) {
      return res.status(400).json({ error: 'Room code must use lowercase letters, numbers, hyphens, or underscores' });
    }
    if (roomId === DEFAULT_ROOM_ID) {
      return res.status(409).json({ error: 'Default room code is reserved' });
    }
    const existingMeta = await getRoomMeta(roomId);
    if (existingMeta) {
      return res.status(409).json({ error: 'Room code already exists' });
    }
  } else {
    roomId = slugifyTitle(title);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existingMeta = await getRoomMeta(roomId);
      if (!existingMeta) break;
      roomId = slugifyTitle(title);
    }
  }

  const presetId = typeof body.presetId === 'string' ? body.presetId : 'versus-match';
  const initialState = createPresetRoomState(presetId, {
    roomId,
    title,
    mode: body.mode,
    drawMode: body.drawMode,
    bestOf: body.bestOf,
    teams: body.teams,
    items: body.items,
    soundEnabled: body.soundEnabled,
    updatedAt: Date.now()
  });

  if (initialState.items.length === 0) {
    return res.status(400).json({ error: 'At least one wheel segment is required' });
  }

  const passwordHash = hashPassword(password);
  await setRoomMeta(roomId, {
    roomId,
    passwordHash,
    tokenVersion: 1,
    createdAt: Date.now()
  });
  await setRoomState(roomId, initialState);
  recordRoomCreate(clientIp);

  const signed = signRoomToken(roomId);
  return res.status(201).json({
    success: true,
    roomId,
    token: signed.token,
    exp: signed.exp,
    persistence: getPersistenceMode(),
    state: initialState,
    urls: getRoomUrls(roomId, false)
  });
}
