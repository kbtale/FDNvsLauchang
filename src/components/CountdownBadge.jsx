import React, { useEffect, useState } from 'react';
import { Clock, Megaphone } from 'lucide-react';
import { computeRemainingTimerMs, formatCountdown } from '../lib/timer';

export function CountdownBadge({ timer, compact = false }) {
  const [remainingMs, setRemainingMs] = useState(() => computeRemainingTimerMs(timer));

  useEffect(() => {
    setRemainingMs(computeRemainingTimerMs(timer));
    if (!timer?.running) {
      return undefined;
    }
    const interval = setInterval(() => {
      setRemainingMs(computeRemainingTimerMs(timer));
    }, 200);
    return () => clearInterval(interval);
  }, [timer?.running, timer?.startedAt, timer?.remainingMs]);

  if (!timer?.visible) {
    return null;
  }

  const isUrgent = remainingMs > 0 && remainingMs <= 10_000;
  const isExpired = remainingMs === 0;

  return (
    <div
      className={`broadcast-timer-pill ${isUrgent ? 'broadcast-timer-urgent' : ''} ${isExpired ? 'broadcast-timer-expired' : ''}`}
      style={compact ? { padding: '5px 14px', fontSize: 13 } : undefined}
    >
      <Clock size={compact ? 13 : 16} />
      <span className="broadcast-timer-label">{timer.label || 'TIMER'}</span>
      <span className="broadcast-timer-digits">{formatCountdown(remainingMs)}</span>
    </div>
  );
}

export function AnnouncementTicker({ announcement, compact = false }) {
  if (!announcement?.visible || !announcement?.text?.trim()) {
    return null;
  }

  return (
    <div
      className="broadcast-ticker-bar"
      style={compact ? { padding: '6px 14px', fontSize: 12 } : undefined}
    >
      <Megaphone size={compact ? 13 : 15} color="var(--overlay-accent, #d99b26)" style={{ flexShrink: 0 }} />
      <span>{announcement.text}</span>
    </div>
  );
}
