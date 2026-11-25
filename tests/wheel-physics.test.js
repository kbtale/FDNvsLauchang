import { describe, it, expect } from 'vitest';
import {
  POINTER_ANGLE_DEG,
  computeTargetRotation,
  getSliceIndexAtPointer,
  interpolateSpinRotation,
  resolveSliceImage,
  formatScoreDelta
} from '../src/lib/wheel.js';

describe('Wheel Physics & Landing Geometry', () => {
  it('lands accurately on every winning slice for 1 to 12 segments', () => {
    for (let sliceCount = 1; sliceCount <= 12; sliceCount++) {
      for (let winningIndex = 0; winningIndex < sliceCount; winningIndex++) {
        const startRotation = winningIndex * 37.5 + 123.4;
        const targetRotation = computeTargetRotation({
          startRotation,
          winningIndex,
          sliceCount,
          extraSpins: 7
        });

        expect(targetRotation).toBeGreaterThan(startRotation + 360 * 6);
        const landedIndex = getSliceIndexAtPointer(targetRotation, sliceCount);
        expect(landedIndex).toBe(winningIndex);
      }
    }
  });

  it('handles negative and large multi-turn start rotations deterministically', () => {
    const targetA = computeTargetRotation({
      startRotation: -450,
      winningIndex: 2,
      sliceCount: 5,
      extraSpins: 7
    });
    expect(getSliceIndexAtPointer(targetA, 5)).toBe(2);

    const targetB = computeTargetRotation({
      startRotation: 14820.75,
      winningIndex: 4,
      sliceCount: 6,
      extraSpins: 7
    });
    expect(getSliceIndexAtPointer(targetB, 6)).toBe(4);
  });

  it('interpolates mid-spin overlays deterministically without jumping', () => {
    const spinStartedAt = 1_000_000;
    const spinDurationMs = 5200;
    const startRotation = 45;
    const targetRotation = computeTargetRotation({
      startRotation,
      winningIndex: 1,
      sliceCount: 5,
      extraSpins: 7
    });

    const atStart = interpolateSpinRotation({
      startRotation,
      targetRotation,
      spinStartedAt,
      spinDurationMs,
      now: spinStartedAt
    });
    expect(atStart.rotation).toBe(startRotation);
    expect(atStart.done).toBe(false);

    const atMid = interpolateSpinRotation({
      startRotation,
      targetRotation,
      spinStartedAt,
      spinDurationMs,
      now: spinStartedAt + 2600
    });
    expect(atMid.rotation).toBeGreaterThan(startRotation);
    expect(atMid.rotation).toBeLessThan(targetRotation);
    expect(atMid.progress).toBeCloseTo(0.5, 5);
    expect(atMid.done).toBe(false);

    const atEnd = interpolateSpinRotation({
      startRotation,
      targetRotation,
      spinStartedAt,
      spinDurationMs,
      now: spinStartedAt + spinDurationMs + 250
    });
    expect(atEnd.rotation).toBe(targetRotation);
    expect(atEnd.done).toBe(true);
    expect(getSliceIndexAtPointer(atEnd.rotation, 5)).toBe(1);
    expect(POINTER_ANGLE_DEG).toBe(270);
  });

  it('never falls back to Counter-Strike banner for custom wheel items', () => {
    expect(resolveSliceImage('FORTNITE')).toBe('/games/fortnitebanner.jpg');
    expect(resolveSliceImage('COUNTER-STRIKE 2')).toBe('/games/counterstrikebanner.jpg');
    expect(resolveSliceImage('MINECRAFT')).toBeNull();
    expect(resolveSliceImage('VALORANT')).toBeNull();
    expect(resolveSliceImage('CUSTOM CHALLENGE')).toBeNull();
    expect(resolveSliceImage({ label: 'MY CUSTOM GAME', imageUrl: '' })).toBeNull();
    expect(resolveSliceImage({ label: 'CUSTOM', imageUrl: 'https://example.com/banner.png' })).toBe(
      'https://example.com/banner.png'
    );
  });

  it('formats signed score deltas dynamically', () => {
    expect(formatScoreDelta(1)).toBe('+1');
    expect(formatScoreDelta(3)).toBe('+3');
    expect(formatScoreDelta(-1)).toBe('-1');
    expect(formatScoreDelta(-2)).toBe('-2');
    expect(formatScoreDelta(0)).toBe('');
  });
});
