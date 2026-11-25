export const POINTER_ANGLE_DEG = 270;
export const DEFAULT_SPIN_DURATION_MS = 5200;

export const SLICE_COLORS = [
  '#D99B26',
  '#0D9F67',
  '#C93232',
  '#1F352E',
  '#2563EB',
  '#9333EA'
];

export const BUILTIN_GAME_IMAGES = {
  FORTNITE: '/games/fortnitebanner.jpg',
  'CLASH ROYALE': '/games/clashroyalebanner.jpg',
  'COPA ROBLOX': '/games/robloxbanner.png',
  'COUNTER-STRIKE 2': '/games/counterstrikebanner.jpg',
  'FALL GUYS': '/games/fallguysbanner.jpg'
};

export function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

export function getItemWeight(item) {
  if (item && typeof item === 'object') {
    const w = Number(item.weight);
    if (Number.isFinite(w) && w > 0) {
      return Math.min(10, Math.max(1, w));
    }
  }
  return 1;
}

export function computeSliceLayout(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const weights = items.map(getItemWeight);
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let cursor = 0;

  return items.map((item, index) => {
    const weight = weights[index];
    const spanDeg = (weight / totalWeight) * 360;
    const startDeg = cursor;
    const endDeg = index === items.length - 1 ? 360 : cursor + spanDeg;
    const midDeg = startDeg + (endDeg - startDeg) / 2;
    cursor = endDeg;
    return {
      index,
      item,
      weight,
      startDeg,
      endDeg,
      midDeg,
      spanDeg: endDeg - startDeg
    };
  });
}

export function pickWeightedIndex(items, randomFn = Math.random) {
  if (!Array.isArray(items) || items.length === 0) {
    return -1;
  }
  const weights = items.map(getItemWeight);
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let threshold = randomFn() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return i;
    }
  }
  return weights.length - 1;
}

export function computeTargetRotation({
  startRotation = 0,
  winningIndex = 0,
  sliceCount = 1,
  extraSpins = 7
}) {
  if (sliceCount <= 0) {
    return startRotation;
  }
  const safeIndex = ((winningIndex % sliceCount) + sliceCount) % sliceCount;
  const sliceDeg = 360 / sliceCount;
  const targetSliceCenter = safeIndex * sliceDeg + sliceDeg / 2;
  const targetMod = normalizeAngle(POINTER_ANGLE_DEG - targetSliceCenter);
  const currentMod = normalizeAngle(startRotation);
  const deltaMod = normalizeAngle(targetMod - currentMod);
  return startRotation + extraSpins * 360 + deltaMod;
}

export function computeTargetRotationForLayout({
  startRotation = 0,
  winningIndex = 0,
  items = [],
  extraSpins = 7
}) {
  const layout = computeSliceLayout(items);
  if (layout.length === 0) {
    return startRotation;
  }
  const safeIndex = ((winningIndex % layout.length) + layout.length) % layout.length;
  const targetSliceCenter = layout[safeIndex].midDeg;
  const targetMod = normalizeAngle(POINTER_ANGLE_DEG - targetSliceCenter);
  const currentMod = normalizeAngle(startRotation);
  const deltaMod = normalizeAngle(targetMod - currentMod);
  return startRotation + extraSpins * 360 + deltaMod;
}

export function getSliceIndexAtPointer(rotationDeg, sliceCount) {
  if (sliceCount <= 0) {
    return -1;
  }
  const sliceDeg = 360 / sliceCount;
  const normalized = normalizeAngle(POINTER_ANGLE_DEG - rotationDeg);
  return Math.floor(normalized / sliceDeg) % sliceCount;
}

export function getSliceIndexAtPointerForLayout(rotationDeg, items) {
  const layout = computeSliceLayout(items);
  if (layout.length === 0) {
    return -1;
  }
  const normalized = normalizeAngle(POINTER_ANGLE_DEG - rotationDeg);
  for (let i = 0; i < layout.length; i++) {
    if (normalized >= layout[i].startDeg && normalized < layout[i].endDeg) {
      return i;
    }
  }
  return layout.length - 1;
}

export function interpolateSpinRotation({
  startRotation = 0,
  targetRotation = 0,
  spinStartedAt = 0,
  spinDurationMs = DEFAULT_SPIN_DURATION_MS,
  now = Date.now()
}) {
  if (spinDurationMs <= 0 || !spinStartedAt) {
    return { rotation: targetRotation, progress: 1, done: true };
  }
  const elapsed = now - spinStartedAt;
  if (elapsed <= 0) {
    return { rotation: startRotation, progress: 0, done: false };
  }
  if (elapsed >= spinDurationMs) {
    return { rotation: targetRotation, progress: 1, done: true };
  }
  const progress = elapsed / spinDurationMs;
  const eased = 1 - Math.pow(1 - progress, 4);
  return {
    rotation: startRotation + (targetRotation - startRotation) * eased,
    progress,
    done: false
  };
}

export function resolveSliceImage(item) {
  if (!item) {
    return null;
  }
  if (typeof item === 'object') {
    if (typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0) {
      return item.imageUrl.trim();
    }
    if (item.imageUrl === '') {
      return null;
    }
    const labelKey = typeof item.label === 'string' ? item.label.trim().toUpperCase() : '';
    return BUILTIN_GAME_IMAGES[labelKey] || null;
  }
  const key = String(item).trim().toUpperCase();
  return BUILTIN_GAME_IMAGES[key] || null;
}

export function formatScoreDelta(delta) {
  if (typeof delta !== 'number' || Number.isNaN(delta) || delta === 0) {
    return '';
  }
  return delta > 0 ? `+${delta}` : `${delta}`;
}
