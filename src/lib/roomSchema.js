import { BUILTIN_GAME_IMAGES, DEFAULT_SPIN_DURATION_MS, SLICE_COLORS } from './wheel.js';

export const DEFAULT_ROOM_ID = 'fdn-vs-lauchang';
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function sanitizeHexColor(value, fallback = '#0d9f67') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

export function pickContrastingTextColor(hexColor) {
  const safe = sanitizeHexColor(hexColor, '#0d9f67');
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#091210' : '#ffffff';
}

export function sanitizeMediaUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 512) {
    return '';
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return '';
  }
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('..') || trimmed.includes('\\')) {
      return '';
    }
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export function fixLegacyGameName(name) {
  if (!name) return '';
  const upper = String(name).trim().toUpperCase();
  if (
    upper === 'CS' ||
    upper === 'COUNTER STRIKE' ||
    upper === 'COUNTER STRIKE 2' ||
    upper === 'COUNTER-STRIKE' ||
    upper === 'COUNTER-STRIKE 2'
  ) {
    return 'COUNTER-STRIKE 2';
  }
  return upper;
}

export function getTeamMonogram(name) {
  const clean = String(name || 'T').trim().toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.slice(0, 2);
  }
  return clean.slice(0, 2) || 'TM';
}

export const ROOM_PRESETS = [
  {
    id: 'versus-match',
    name: '1v1 Versus Match',
    badge: 'Head-to-Head',
    description: 'Sports, esports, debates, or trivia duels with Best-of-N series tracking.',
    title: 'LIVE SHOWMATCH',
    bestOf: 5,
    teams: [
      {
        id: 'a',
        name: 'TEAM ALPHA',
        subtitle: 'HOME SIDE',
        color: '#2563eb',
        textColor: '#ffffff',
        logoUrl: '',
        score: 0
      },
      {
        id: 'b',
        name: 'TEAM OMEGA',
        subtitle: 'AWAY SIDE',
        color: '#e11d48',
        textColor: '#ffffff',
        logoUrl: '',
        score: 0
      }
    ],
    items: [
      { id: '1', label: 'ROUND 1 · SPEED', color: '#2563eb', imageUrl: '', weight: 1 },
      { id: '2', label: 'ROUND 2 · SKILL', color: '#0d9f67', imageUrl: '', weight: 1 },
      { id: '3', label: 'ROUND 3 · STRATEGY', color: '#d99b26', imageUrl: '', weight: 1 },
      { id: '4', label: 'ROUND 4 · WILDCARD', color: '#7c3aed', imageUrl: '', weight: 1 },
      { id: '5', label: 'TIEBREAKER', color: '#e11d48', imageUrl: '', weight: 1 }
    ]
  },
  {
    id: 'raffle-wheel',
    name: 'Giveaway & Raffle',
    badge: 'Picker',
    description: 'Prize draws, viewer raffles, sponsor giveaways, and weighted random picks.',
    title: 'LIVE GIVEAWAY',
    bestOf: 0,
    teams: [
      {
        id: 'a',
        name: 'HOST',
        subtitle: 'STAGE',
        color: '#0d9f67',
        textColor: '#ffffff',
        logoUrl: '',
        score: 0
      },
      {
        id: 'b',
        name: 'AUDIENCE',
        subtitle: 'WINNERS',
        color: '#d99b26',
        textColor: '#091210',
        logoUrl: '',
        score: 0
      }
    ],
    items: [
      { id: '1', label: 'GRAND PRIZE', color: '#d99b26', imageUrl: '', weight: 1 },
      { id: '2', label: 'GIFT CARD', color: '#0d9f67', imageUrl: '', weight: 2 },
      { id: '3', label: 'MERCH PACK', color: '#2563eb', imageUrl: '', weight: 2 },
      { id: '4', label: 'VIP SHOUTOUT', color: '#7c3aed', imageUrl: '', weight: 3 },
      { id: '5', label: 'MYSTERY BOX', color: '#e11d48', imageUrl: '', weight: 1 },
      { id: '6', label: 'BONUS SPIN', color: '#0891b2', imageUrl: '', weight: 2 }
    ]
  },
  {
    id: 'party-leaderboard',
    name: 'Trivia & Party Night',
    badge: 'Event Night',
    description: 'Interactive trivia categories, quiz rounds, and group party events.',
    title: 'TRIVIA & PARTY NIGHT',
    bestOf: 7,
    teams: [
      {
        id: 'a',
        name: 'TEAM SOLAR',
        subtitle: 'GOLD SQUAD',
        color: '#eab308',
        textColor: '#091210',
        logoUrl: '',
        score: 0
      },
      {
        id: 'b',
        name: 'TEAM NOVA',
        subtitle: 'CYAN SQUAD',
        color: '#06b6d4',
        textColor: '#091210',
        logoUrl: '',
        score: 0
      }
    ],
    items: [
      { id: '1', label: 'POP CULTURE', color: '#7c3aed', imageUrl: '', weight: 1 },
      { id: '2', label: 'MUSIC & FILM', color: '#e11d48', imageUrl: '', weight: 1 },
      { id: '3', label: 'SCIENCE & TECH', color: '#2563eb', imageUrl: '', weight: 1 },
      { id: '4', label: 'SPORTS', color: '#0d9f67', imageUrl: '', weight: 1 },
      { id: '5', label: 'LIGHTNING ROUND', color: '#d99b26', imageUrl: '', weight: 1 }
    ]
  },
  {
    id: 'workshop-wheel',
    name: 'Variety & Challenges',
    badge: 'Creator',
    description: 'Stream challenges, live Q&A topics, karaoke picks, or classroom prompts.',
    title: 'LIVE CHALLENGE WHEEL',
    bestOf: 0,
    teams: [
      {
        id: 'a',
        name: 'CREATOR',
        subtitle: 'LIVE HOST',
        color: '#7c3aed',
        textColor: '#ffffff',
        logoUrl: '',
        score: 0
      },
      {
        id: 'b',
        name: 'COMMUNITY',
        subtitle: 'CHAT PICKS',
        color: '#0d9f67',
        textColor: '#ffffff',
        logoUrl: '',
        score: 0
      }
    ],
    items: [
      { id: '1', label: 'AUDIENCE PICK', color: '#7c3aed', imageUrl: '', weight: 2 },
      { id: '2', label: 'SPEED CHALLENGE', color: '#d99b26', imageUrl: '', weight: 2 },
      { id: '3', label: 'Q&A HOT SEAT', color: '#2563eb', imageUrl: '', weight: 1 },
      { id: '4', label: 'HARD MODE', color: '#c93232', imageUrl: '', weight: 1 },
      { id: '5', label: 'CO-OP ROUND', color: '#0d9f67', imageUrl: '', weight: 2 }
    ]
  }
];

export const CLASSIC_PRESETS = [
  {
    id: 'fdn-vs-lauchang',
    name: 'FDN vs Lauchang',
    badge: 'Classic Event',
    description: 'The original 5-game broadcast showdown with classic FDN and Lauchang routes.',
    title: 'FDN VS LAUCHANG',
    bestOf: 5,
    teams: [
      {
        id: 'a',
        name: 'FDN',
        subtitle: 'TEAM FEEDEN',
        color: '#0d9f67',
        textColor: '#ffffff',
        logoUrl: '/LOGO FDN.png',
        score: 0
      },
      {
        id: 'b',
        name: 'LAUCHANG',
        subtitle: 'TEAM LAUTASHE',
        color: '#d99b26',
        textColor: '#091210',
        logoUrl: '/LOGO LAUTASHE.jpeg',
        score: 0
      }
    ],
    items: [
      { id: '1', label: 'FORTNITE', color: '#d99b26', imageUrl: '/games/fortnitebanner.jpg', weight: 1 },
      { id: '2', label: 'CLASH ROYALE', color: '#0d9f67', imageUrl: '/games/clashroyalebanner.jpg', weight: 1 },
      { id: '3', label: 'COPA ROBLOX', color: '#c93232', imageUrl: '/games/robloxbanner.png', weight: 1 },
      { id: '4', label: 'COUNTER-STRIKE 2', color: '#1f352e', imageUrl: '/games/counterstrikebanner.jpg', weight: 1 },
      { id: '5', label: 'FALL GUYS', color: '#0d9f67', imageUrl: '/games/fallguysbanner.jpg', weight: 1 }
    ]
  }
];

export const ALL_PRESETS = [...ROOM_PRESETS, ...CLASSIC_PRESETS];

export function normalizeItem(raw, index = 0) {
  if (typeof raw === 'string') {
    const label = fixLegacyGameName(raw);
    return {
      id: `item-${index + 1}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label,
      color: SLICE_COLORS[index % SLICE_COLORS.length].toLowerCase(),
      imageUrl: BUILTIN_GAME_IMAGES[label] || '',
      weight: 1
    };
  }
  const rawLabel = typeof raw?.label === 'string' ? raw.label : String(raw?.name || '');
  const label = rawLabel.trim().toUpperCase().slice(0, 48);
  const safeImageUrl = sanitizeMediaUrl(raw?.imageUrl || '');
  const parsedWeight = Number(raw?.weight);
  const weight = Number.isFinite(parsedWeight)
    ? Math.max(1, Math.min(10, Math.round(parsedWeight)))
    : 1;
  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 48) : `item-${index + 1}`,
    label,
    color: sanitizeHexColor(raw?.color, SLICE_COLORS[index % SLICE_COLORS.length].toLowerCase()),
    imageUrl: safeImageUrl,
    weight
  };
}

export function normalizeTeam(raw, fallback) {
  const color = sanitizeHexColor(raw?.color, fallback.color);
  const textColor = raw?.textColor
    ? sanitizeHexColor(raw.textColor, pickContrastingTextColor(color))
    : pickContrastingTextColor(color);
  const parsedScore = Number(raw?.score);
  const score = Number.isFinite(parsedScore) ? Math.max(0, Math.min(999, Math.round(parsedScore))) : fallback.score;
  const rawName = typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : fallback.name;
  const rawSubtitle = typeof raw?.subtitle === 'string' ? raw.subtitle.trim() : fallback.subtitle;
  const logoUrl = raw?.logoUrl !== undefined ? sanitizeMediaUrl(raw.logoUrl) : fallback.logoUrl;

  return {
    id: fallback.id,
    name: rawName.toUpperCase().slice(0, 24),
    subtitle: rawSubtitle.toUpperCase().slice(0, 32),
    color,
    textColor,
    logoUrl,
    score
  };
}

export function createPresetRoomState(presetId = 'versus-match', overrides = {}) {
  const preset = ALL_PRESETS.find((p) => p.id === presetId) || ROOM_PRESETS[0];
  const roomId = overrides.roomId || preset.id;
  const teamsInput = Array.isArray(overrides.teams) && overrides.teams.length === 2
    ? overrides.teams
    : preset.teams;
  const teams = [
    normalizeTeam(teamsInput[0], preset.teams[0]),
    normalizeTeam(teamsInput[1], preset.teams[1])
  ];

  const itemsInput = Array.isArray(overrides.items) && overrides.items.length > 0
    ? overrides.items
    : preset.items;
  const items = itemsInput
    .map((item, idx) => normalizeItem(item, idx))
    .filter((item) => item.label.length > 0)
    .slice(0, 32);

  const parsedBestOf = overrides.bestOf !== undefined ? Number(overrides.bestOf) : preset.bestOf;
  const bestOf = Number.isFinite(parsedBestOf)
    ? Math.max(0, Math.min(15, Math.round(parsedBestOf)))
    : preset.bestOf;

  const rawTitle = typeof overrides.title === 'string' && overrides.title.trim()
    ? overrides.title.trim()
    : preset.title;

  return {
    roomId,
    title: rawTitle.toUpperCase().slice(0, 64),
    teams,
    bestOf,
    items,
    drawnItems: [],
    activeItem: null,
    history: [],
    soundEnabled: overrides.soundEnabled !== false,
    spin: {
      isSpinning: false,
      spinSeed: 0,
      spinStartedAt: 0,
      spinDurationMs: DEFAULT_SPIN_DURATION_MS,
      startRotation: 0,
      targetRotation: 0,
      winningIndex: null,
      wheelItems: []
    },
    showWinnerModal: false,
    updatedAt: typeof overrides.updatedAt === 'number' ? overrides.updatedAt : Date.now()
  };
}

export function normalizeRoomState(raw, roomId = DEFAULT_ROOM_ID) {
  const base = createPresetRoomState(
    roomId === DEFAULT_ROOM_ID ? DEFAULT_ROOM_ID : 'versus-match',
    { roomId, updatedAt: 0 }
  );

  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return base;
  }

  const hasNewTeams = Array.isArray(raw.teams) && raw.teams.length === 2;
  const teams = hasNewTeams
    ? [normalizeTeam(raw.teams[0], base.teams[0]), normalizeTeam(raw.teams[1], base.teams[1])]
    : [
        normalizeTeam({ ...base.teams[0], score: typeof raw.fdnScore === 'number' ? raw.fdnScore : base.teams[0].score }, base.teams[0]),
        normalizeTeam({ ...base.teams[1], score: typeof raw.lauchangScore === 'number' ? raw.lauchangScore : base.teams[1].score }, base.teams[1])
      ];

  let items;
  if (Array.isArray(raw.items)) {
    items = raw.items.map((item, idx) => normalizeItem(item, idx)).filter((item) => item.label.length > 0).slice(0, 32);
  } else if (Array.isArray(raw.remainingGames)) {
    items = raw.remainingGames.map((item, idx) => normalizeItem(item, idx)).filter((item) => item.label.length > 0).slice(0, 32);
  } else {
    items = base.items;
  }

  let drawnItems;
  if (Array.isArray(raw.drawnItems)) {
    drawnItems = raw.drawnItems.map((item, idx) => normalizeItem(item, idx)).filter((item) => item.label.length > 0).slice(0, 64);
  } else if (Array.isArray(raw.drawnGames)) {
    drawnItems = raw.drawnGames.map((item, idx) => normalizeItem(item, idx)).filter((item) => item.label.length > 0).slice(0, 64);
  } else {
    drawnItems = [];
  }

  let activeItem = null;
  if (raw.activeItem && typeof raw.activeItem === 'object' && raw.activeItem.label) {
    activeItem = normalizeItem(raw.activeItem, 0);
  } else if (typeof raw.activeItem === 'string' && raw.activeItem.trim()) {
    activeItem = normalizeItem(raw.activeItem, 0);
  } else if (typeof raw.activeGame === 'string' && raw.activeGame.trim()) {
    activeItem = normalizeItem(raw.activeGame, 0);
  }

  const rawSpin = raw.spin && typeof raw.spin === 'object' ? raw.spin : {};
  const wheelItemsSource = Array.isArray(rawSpin.wheelItems) && rawSpin.wheelItems.length > 0
    ? rawSpin.wheelItems
    : Array.isArray(raw.wheelGames) && raw.wheelGames.length > 0
      ? raw.wheelGames
      : [];
  const wheelItems = wheelItemsSource.map((item, idx) => normalizeItem(item, idx)).filter((item) => item.label.length > 0);

  const targetRotation = typeof rawSpin.targetRotation === 'number'
    ? rawSpin.targetRotation
    : typeof raw.targetRotation === 'number'
      ? raw.targetRotation
      : typeof raw.wheelRotation === 'number'
        ? raw.wheelRotation
        : 0;

  const startRotation = typeof rawSpin.startRotation === 'number'
    ? rawSpin.startRotation
    : typeof raw.startRotation === 'number'
      ? raw.startRotation
      : targetRotation;

  const spin = {
    isSpinning: Boolean(rawSpin.isSpinning ?? raw.isSpinning),
    spinSeed: Number(rawSpin.spinSeed ?? raw.spinSeed ?? 0) || 0,
    spinStartedAt: Number(rawSpin.spinStartedAt ?? raw.spinStartedAt ?? 0) || 0,
    spinDurationMs: Number(rawSpin.spinDurationMs ?? raw.spinDurationMs ?? DEFAULT_SPIN_DURATION_MS) || DEFAULT_SPIN_DURATION_MS,
    startRotation,
    targetRotation,
    winningIndex: typeof (rawSpin.winningIndex ?? raw.winningIndex) === 'number'
      ? (rawSpin.winningIndex ?? raw.winningIndex)
      : null,
    wheelItems
  };

  const history = Array.isArray(raw.history)
    ? raw.history.slice(0, 50).map((entry) => ({
        id: String(entry?.id || `${Date.now()}`),
        type: String(entry?.type || 'event'),
        label: String(entry?.label || '').slice(0, 80),
        detail: String(entry?.detail || '').slice(0, 120),
        timestamp: Number(entry?.timestamp) || Date.now()
      }))
    : [];

  const parsedBestOf = raw.bestOf !== undefined ? Number(raw.bestOf) : base.bestOf;
  const bestOf = Number.isFinite(parsedBestOf)
    ? Math.max(0, Math.min(15, Math.round(parsedBestOf)))
    : base.bestOf;

  const title = typeof raw.title === 'string' && raw.title.trim()
    ? raw.title.trim().toUpperCase().slice(0, 64)
    : base.title;

  return {
    roomId,
    title,
    teams,
    bestOf,
    items,
    drawnItems,
    activeItem,
    history,
    soundEnabled: raw.soundEnabled !== false,
    spin,
    showWinnerModal: Boolean(raw.showWinnerModal),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0
  };
}

export function getTokenStorageKey(roomId = DEFAULT_ROOM_ID) {
  return `arenaobs_room_token:${roomId}`;
}

export function getRoomUrls(roomId = DEFAULT_ROOM_ID, legacyDefault = false) {
  if (legacyDefault && roomId === DEFAULT_ROOM_ID) {
    return {
      control: '/control',
      roulette: '/roulette',
      scoreboard: '/scoreboard'
    };
  }
  const encoded = encodeURIComponent(roomId);
  return {
    control: `/room/${encoded}/control`,
    roulette: `/room/${encoded}/roulette`,
    scoreboard: `/room/${encoded}/scoreboard`
  };
}
