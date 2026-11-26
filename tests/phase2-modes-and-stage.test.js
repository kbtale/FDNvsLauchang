import { describe, it, expect } from 'vitest';
import {
  normalizeRoomState,
  parseBulkSegments,
  sortLeaderboardTeams,
  getRoomUrls,
  DEFAULT_ROOM_ID
} from '../src/lib/roomSchema.js';
import { parseRoute } from '../src/App.jsx';

describe('Phase 2 — Event Modes, Bulk Paste, Leaderboard & Stage View', () => {
  it('supports versus, leaderboard (up to 8), and wheel-only modes with drawMode', () => {
    const leaderboardRoom = normalizeRoomState(
      {
        mode: 'leaderboard',
        drawMode: 'keep',
        teams: [
          { id: '1', name: 'RED', score: 10, color: '#ef4444' },
          { id: '2', name: 'BLUE', score: 25, color: '#3b82f6' },
          { id: '3', name: 'GREEN', score: 25, color: '#10b981' },
          { id: '4', name: 'GOLD', score: 5, color: '#eab308' }
        ]
      },
      'trivia-night'
    );

    expect(leaderboardRoom.mode).toBe('leaderboard');
    expect(leaderboardRoom.drawMode).toBe('keep');
    expect(leaderboardRoom.teams).toHaveLength(4);

    const ranked = sortLeaderboardTeams(leaderboardRoom.teams);
    expect(ranked.map((t) => [t.name, t.rank])).toEqual([
      ['BLUE', 1],
      ['GREEN', 1],
      ['RED', 3],
      ['GOLD', 4]
    ]);

    const raffleRoom = normalizeRoomState({ mode: 'wheel-only', drawMode: 'keep' }, 'giveaway-1');
    expect(raffleRoom.mode).toBe('wheel-only');
    expect(raffleRoom.drawMode).toBe('keep');
  });

  it('parses bulk newline and comma-separated segment lists cleanly', () => {
    const fromLines = parseBulkSegments('Alice\nBob\n\nCharlie\nDiana');
    expect(fromLines.map((i) => i.label)).toEqual(['ALICE', 'BOB', 'CHARLIE', 'DIANA']);
    expect(fromLines.every((i) => i.weight === 1 && i.color.startsWith('#'))).toBe(true);

    const fromCommas = parseBulkSegments('Prize A, Prize B, Prize C');
    expect(fromCommas.map((i) => i.label)).toEqual(['PRIZE A', 'PRIZE B', 'PRIZE C']);

    const many = Array.from({ length: 80 }, (_, idx) => `Entry ${idx + 1}`).join('\n');
    expect(parseBulkSegments(many)).toHaveLength(64);
  });

  it('routes /stage and /room/:roomId/stage and exposes stage URL', () => {
    expect(parseRoute('/stage')).toEqual({ view: 'stage', roomId: DEFAULT_ROOM_ID, legacyRoute: true });
    expect(parseRoute('/room/lan-finals/stage')).toEqual({ view: 'stage', roomId: 'lan-finals', legacyRoute: false });
    expect(getRoomUrls('lan-finals', false).stage).toBe('/room/lan-finals/stage');
    expect(getRoomUrls(DEFAULT_ROOM_ID, true).stage).toBe('/stage');
  });
});
