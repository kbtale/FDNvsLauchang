import { describe, it, expect } from 'vitest';
import {
  sanitizeMediaUrl,
  sanitizeHexColor,
  normalizeRoomState,
  ROOM_PRESETS
} from '../src/lib/roomSchema.js';
import {
  computeSliceLayout,
  computeTargetRotationForLayout,
  getSliceIndexAtPointerForLayout
} from '../src/lib/wheel.js';

describe('URL Sanitization & Room Schema', () => {
  it('allows only https URLs and safe local root paths', () => {
    expect(sanitizeMediaUrl('https://cdn.example.com/logo.png')).toBe('https://cdn.example.com/logo.png');
    expect(sanitizeMediaUrl('/LOGO FDN.png')).toBe('/LOGO FDN.png');
    expect(sanitizeMediaUrl('/games/fortnitebanner.jpg')).toBe('/games/fortnitebanner.jpg');

    expect(sanitizeMediaUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeMediaUrl('JAVASCRIPT:void(0)')).toBe('');
    expect(sanitizeMediaUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeMediaUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe('');
    expect(sanitizeMediaUrl('http://insecure.example.com/img.png')).toBe('');
    expect(sanitizeMediaUrl('//evil.example.com/logo.png')).toBe('');
    expect(sanitizeMediaUrl('/../etc/passwd')).toBe('');
  });

  it('sanitizes hex colors and upgrades legacy state cleanly', () => {
    expect(sanitizeHexColor('#0d9f67', '#ffffff')).toBe('#0d9f67');
    expect(sanitizeHexColor('red', '#0d9f67')).toBe('#0d9f67');
    expect(sanitizeHexColor('#fff', '#0d9f67')).toBe('#0d9f67');

    const upgraded = normalizeRoomState(
      {
        fdnScore: 3,
        lauchangScore: 2,
        remainingGames: ['FORTNITE', 'FALL GUYS'],
        drawnGames: ['CLASH ROYALE'],
        activeGame: 'CLASH ROYALE'
      },
      'fdn-vs-lauchang'
    );

    expect(upgraded.roomId).toBe('fdn-vs-lauchang');
    expect(upgraded.teams[0].score).toBe(3);
    expect(upgraded.teams[1].score).toBe(2);
    expect(upgraded.items.map((i) => i.label)).toEqual(['FORTNITE', 'FALL GUYS']);
    expect(upgraded.drawnItems.map((i) => i.label)).toEqual(['CLASH ROYALE']);
    expect(upgraded.activeItem.label).toBe('CLASH ROYALE');
    expect(ROOM_PRESETS.some((p) => p.id === 'fdn-vs-lauchang')).toBe(true);
  });

  it('computes accurate weighted slice landing geometry', () => {
    const items = [
      { id: '1', label: 'COMMON', weight: 4 },
      { id: '2', label: 'MEDIUM', weight: 2 },
      { id: '3', label: 'RARE', weight: 1 }
    ];
    const layout = computeSliceLayout(items);
    expect(layout).toHaveLength(3);
    expect(layout[2].endDeg).toBeCloseTo(360, 5);

    for (let i = 0; i < items.length; i++) {
      const target = computeTargetRotationForLayout({
        startRotation: 72.5,
        winningIndex: i,
        items,
        extraSpins: 7
      });
      expect(getSliceIndexAtPointerForLayout(target, items)).toBe(i);
    }
  });
});
