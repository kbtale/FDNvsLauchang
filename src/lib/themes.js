const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const OVERLAY_THEMES = [
  {
    id: 'emerald-gold',
    name: 'Broadcast Emerald & Gold',
    rimColor: '#d99b26',
    pinColor: '#d99b26',
    outerRingBg: '#080d0b',
    innerBorderColor: '#1e2b27',
    hubBg: '#0b120f',
    frameBg: '#070e0c',
    frameBorder: '#233a33',
    cardBg: '#0c1411',
    textColor: '#ffffff',
    mutedColor: '#849690',
    stageBg: 'radial-gradient(circle at top, #13241e 0%, #070b0a 65%, #040706 100%)'
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    rimColor: '#22d3ee',
    pinColor: '#f43f5e',
    outerRingBg: '#0b0a1a',
    innerBorderColor: '#312e81',
    hubBg: '#0f1026',
    frameBg: '#090918',
    frameBorder: '#3b378f',
    cardBg: '#12122b',
    textColor: '#f8fafc',
    mutedColor: '#94a3b8',
    stageBg: 'radial-gradient(circle at top, #1e1b4b 0%, #090918 65%, #04040c 100%)'
  },
  {
    id: 'minimal-light',
    name: 'Minimal Studio Light',
    rimColor: '#2563eb',
    pinColor: '#2563eb',
    outerRingBg: '#f1f5f9',
    innerBorderColor: '#cbd5e1',
    hubBg: '#ffffff',
    frameBg: '#ffffff',
    frameBorder: '#cbd5e1',
    cardBg: '#f8fafc',
    textColor: '#0f172a',
    mutedColor: '#475569',
    stageBg: 'radial-gradient(circle at top, #e2e8f0 0%, #f8fafc 65%, #e2e8f0 100%)'
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    rimColor: '#facc15',
    pinColor: '#ec4899',
    outerRingBg: '#1b0b2e',
    innerBorderColor: '#581c87',
    hubBg: '#240b3f',
    frameBg: '#140824',
    frameBorder: '#6b21a8',
    cardBg: '#1e0b36',
    textColor: '#ffffff',
    mutedColor: '#d8b4fe',
    stageBg: 'radial-gradient(circle at top, #3b0764 0%, #140824 65%, #090312 100%)'
  },
  {
    id: 'warm-festival',
    name: 'Warm Festival',
    rimColor: '#f97316',
    pinColor: '#fbbf24',
    outerRingBg: '#1a0f0a',
    innerBorderColor: '#431407',
    hubBg: '#1f120b',
    frameBg: '#140c08',
    frameBorder: '#7c2d12',
    cardBg: '#1f130c',
    textColor: '#fff7ed',
    mutedColor: '#fdba74',
    stageBg: 'radial-gradient(circle at top, #431407 0%, #140c08 65%, #0a0503 100%)'
  }
];

export const EVENT_BADGE_ICONS = [
  '🏆', '🎯', '🔥', '⚡', '🎮',
  '🎲', '🎁', '🎵', '🎤', '🎬',
  '🍕', '💎', '🚀', '👑', '🌟',
  '⚽', '🏀', '🧠', '🎉', '🛡️'
];

export function resolveOverlayTheme(themeId = 'emerald-gold', customAccentColor = '') {
  const base = OVERLAY_THEMES.find((t) => t.id === themeId) || OVERLAY_THEMES[0];
  const hasCustomAccent = typeof customAccentColor === 'string' && HEX_RE.test(customAccentColor.trim());
  const accent = hasCustomAccent ? customAccentColor.trim().toLowerCase() : base.rimColor;

  return {
    ...base,
    rimColor: accent,
    pinColor: hasCustomAccent ? accent : base.pinColor,
    cssVars: {
      '--overlay-accent': accent,
      '--overlay-frame-bg': base.frameBg,
      '--overlay-frame-border': base.frameBorder,
      '--overlay-card-bg': base.cardBg,
      '--overlay-text': base.textColor,
      '--overlay-muted': base.mutedColor,
      '--overlay-stage-bg': base.stageBg
    }
  };
}
