export const DEFAULT_TIMER = {
  running: false,
  startedAt: 0,
  durationMs: 60_000,
  remainingMs: 60_000,
  visible: false,
  label: 'ROUND TIMER'
};

export function computeRemainingTimerMs(timer, now = Date.now()) {
  if (!timer || typeof timer !== 'object') {
    return 0;
  }
  const baseRemaining = typeof timer.remainingMs === 'number' && Number.isFinite(timer.remainingMs)
    ? Math.max(0, timer.remainingMs)
    : 0;
  if (!timer.running || !timer.startedAt) {
    return baseRemaining;
  }
  const elapsed = Math.max(0, now - timer.startedAt);
  return Math.max(0, baseRemaining - elapsed);
}

export function formatCountdown(ms) {
  const totalSeconds = Math.ceil(Math.max(0, Number(ms) || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function computeAdaptivePollIntervalMs({
  isSpinning = false,
  timerRunning = false,
  lastActivityAt = 0,
  now = Date.now()
} = {}) {
  if (isSpinning) {
    return 300;
  }
  if (lastActivityAt > 0 && now - lastActivityAt < 8_000) {
    return 300;
  }
  if (timerRunning) {
    return 600;
  }
  return 1800;
}
