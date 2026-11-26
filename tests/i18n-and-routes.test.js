import { describe, it, expect } from 'vitest';
import { parseRoute } from '../src/App.jsx';
import { getRoomUrls, DEFAULT_ROOM_ID } from '../src/lib/roomSchema.js';
import { resolveControlShortcut } from '../src/lib/shortcuts.js';

describe('Routing & Streamer Shortcuts', () => {
  it('routes legacy URLs to fdn-vs-lauchang and room URLs to their roomId', () => {
    expect(parseRoute('/')).toEqual({ view: 'hub', roomId: DEFAULT_ROOM_ID, legacyRoute: false });
    expect(parseRoute('/control')).toEqual({ view: 'control', roomId: DEFAULT_ROOM_ID, legacyRoute: true });
    expect(parseRoute('/roulette')).toEqual({ view: 'roulette', roomId: DEFAULT_ROOM_ID, legacyRoute: true });
    expect(parseRoute('/scoreboard')).toEqual({ view: 'scoreboard', roomId: DEFAULT_ROOM_ID, legacyRoute: true });

    expect(parseRoute('/room/Friday-Cup/control')).toEqual({ view: 'control', roomId: 'friday-cup', legacyRoute: false });
    expect(parseRoute('/room/friday-cup/roulette/')).toEqual({ view: 'roulette', roomId: 'friday-cup', legacyRoute: false });
    expect(parseRoute('/room/friday-cup/scoreboard')).toEqual({ view: 'scoreboard', roomId: 'friday-cup', legacyRoute: false });
  });

  it('builds room URLs for both legacy and custom rooms', () => {
    expect(getRoomUrls(DEFAULT_ROOM_ID, true)).toEqual({
      control: '/control',
      roulette: '/roulette',
      scoreboard: '/scoreboard',
      stage: '/stage'
    });
    expect(getRoomUrls('my-cup', false)).toEqual({
      control: '/room/my-cup/control',
      roulette: '/room/my-cup/roulette',
      scoreboard: '/room/my-cup/scoreboard',
      stage: '/room/my-cup/stage'
    });
  });

  it('resolves Space, 1, and 2 shortcuts while ignoring editable inputs and modifiers', () => {
    expect(resolveControlShortcut({ code: 'Space', key: ' ', target: { tagName: 'BODY' } })).toBe('spin');
    expect(resolveControlShortcut({ code: 'Digit1', key: '1', target: { tagName: 'DIV' } })).toBe('score-a');
    expect(resolveControlShortcut({ code: 'Digit2', key: '2', target: { tagName: 'DIV' } })).toBe('score-b');

    expect(resolveControlShortcut({ code: 'Space', key: ' ', target: { tagName: 'INPUT' } })).toBeNull();
    expect(resolveControlShortcut({ code: 'Digit1', key: '1', target: { tagName: 'TEXTAREA' } })).toBeNull();
    expect(resolveControlShortcut({ code: 'Digit2', key: '2', ctrlKey: true, target: { tagName: 'BODY' } })).toBeNull();
  });
});
