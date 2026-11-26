import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import { DEFAULT_ROOM_ID, sortLeaderboardTeams } from '../lib/roomSchema';
import { formatScoreDelta } from '../lib/wheel';
import TeamAvatar from '../components/TeamAvatar';
import { Gamepad2, Sparkles, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ScoreboardGraphic({ state, deltaA = 0, deltaB = 0, compact = false }) {
  const mode = state.mode || 'versus';
  const activeLabel = state.activeItem?.label || 'WAITING FOR SPIN';

  if (mode === 'wheel-only') {
    return (
      <div className={`broadcast-wheel-banner ${compact ? 'broadcast-3d-compact' : ''}`}>
        <div className="broadcast-wheel-banner-top">
          <Sparkles size={compact ? 14 : 18} color="var(--accent-gold)" />
          <span>{state.title}</span>
        </div>
        <div className="broadcast-wheel-banner-main">
          {activeLabel}
        </div>
      </div>
    );
  }

  if (mode === 'leaderboard') {
    const ranked = sortLeaderboardTeams(state.teams || []);
    return (
      <div className={`broadcast-leaderboard ${compact ? 'broadcast-leaderboard-compact' : ''}`}>
        <div className="broadcast-leaderboard-header">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={compact ? 15 : 18} color="var(--accent-gold)" />
            {state.title}
          </span>
          <span className="broadcast-leaderboard-active">{activeLabel}</span>
        </div>
        <div className="broadcast-leaderboard-rows">
          {ranked.map((team) => (
            <div
              key={team.id}
              className="broadcast-leaderboard-row"
              style={{ borderLeft: `5px solid ${team.color}` }}
            >
              <span className={`leaderboard-rank ${team.rank === 1 ? 'leaderboard-rank-gold' : ''}`}>
                #{team.rank}
              </span>
              <TeamAvatar
                name={team.name}
                logoUrl={team.logoUrl}
                color={team.color}
                textColor={team.textColor}
                size={compact ? 30 : 40}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="leaderboard-name">{team.name}</div>
                {team.subtitle && <div className="leaderboard-sub">{team.subtitle}</div>}
              </div>
              <div className="leaderboard-score">{team.score}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const teamA = state.teams?.[0] || {
    name: 'TEAM A',
    subtitle: '',
    color: '#0d9f67',
    textColor: '#ffffff',
    logoUrl: '',
    score: 0
  };
  const teamB = state.teams?.[1] || {
    name: 'TEAM B',
    subtitle: '',
    color: '#d99b26',
    textColor: '#091210',
    logoUrl: '',
    score: 0
  };

  const bestOf = Number(state.bestOf) || 0;
  const winsNeeded = bestOf > 0 ? Math.ceil(bestOf / 2) : 0;
  const deltaALabel = formatScoreDelta(deltaA);
  const deltaBLabel = formatScoreDelta(deltaB);

  return (
    <div className={`broadcast-3d-scoreboard ${compact ? 'broadcast-3d-compact' : ''}`}>
      <div className="broadcast-3d-main-bar">
        <div
          className="broadcast-3d-team-card broadcast-3d-team-left"
          style={{ backgroundColor: teamA.color, color: teamA.textColor }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16, minWidth: 0 }}>
            <TeamAvatar
              name={teamA.name}
              logoUrl={teamA.logoUrl}
              color={teamA.color}
              textColor={teamA.textColor}
              size={compact ? 40 : 66}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: compact ? 17 : 28,
                  fontWeight: 900,
                  letterSpacing: -0.5,
                  lineHeight: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.35)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {teamA.name}
              </div>
              {teamA.subtitle && (
                <div style={{ fontSize: compact ? 10 : 12, fontWeight: 800, opacity: 0.9, marginTop: 4, letterSpacing: 1 }}>
                  {teamA.subtitle}
                </div>
              )}
              {winsNeeded > 0 && (
                <div className="series-pips">
                  {Array.from({ length: winsNeeded }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`series-pip ${idx < teamA.score ? 'series-pip-filled' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <AnimatePresence>
              {deltaALabel && (
                <motion.div
                  className="combat-float-text"
                  initial={{ opacity: 0, y: 15, scale: 0.5 }}
                  animate={{ opacity: 1, y: -42, scale: 1.5 }}
                  exit={{ opacity: 0, y: -65, scale: 1.1 }}
                  transition={{ duration: 0.36, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    zIndex: 9999,
                    color: deltaA < 0 ? '#fca5a5' : '#ffffff'
                  }}
                >
                  {deltaALabel}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={teamA.score}
                className="broadcast-3d-score-number"
                initial={{ y: -25, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 25, opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 650, damping: 22 }}
              >
                {teamA.score}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="broadcast-3d-divider">
          <div className="broadcast-3d-vs">VS</div>
          {bestOf > 0 && (
            <span className="broadcast-3d-bo-tag">BO{bestOf}</span>
          )}
        </div>

        <div
          className="broadcast-3d-team-card broadcast-3d-team-right"
          style={{ backgroundColor: teamB.color, color: teamB.textColor }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <AnimatePresence>
              {deltaBLabel && (
                <motion.div
                  className="combat-float-text"
                  initial={{ opacity: 0, y: 15, scale: 0.5 }}
                  animate={{ opacity: 1, y: -42, scale: 1.5 }}
                  exit={{ opacity: 0, y: -65, scale: 1.1 }}
                  transition={{ duration: 0.36, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 9999,
                    color: deltaB < 0 ? '#fca5a5' : '#ffffff'
                  }}
                >
                  {deltaBLabel}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={teamB.score}
                className="broadcast-3d-score-number"
                initial={{ y: -25, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 25, opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 650, damping: 22 }}
              >
                {teamB.score}
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16, textAlign: 'right', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: compact ? 17 : 28,
                  fontWeight: 900,
                  letterSpacing: -0.5,
                  lineHeight: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.35)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {teamB.name}
              </div>
              {teamB.subtitle && (
                <div style={{ fontSize: compact ? 10 : 12, fontWeight: 800, opacity: 0.9, marginTop: 4, letterSpacing: 1 }}>
                  {teamB.subtitle}
                </div>
              )}
              {winsNeeded > 0 && (
                <div className="series-pips series-pips-right">
                  {Array.from({ length: winsNeeded }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`series-pip ${idx < teamB.score ? 'series-pip-filled' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <TeamAvatar
              name={teamB.name}
              logoUrl={teamB.logoUrl}
              color={teamB.color}
              textColor={teamB.textColor}
              size={compact ? 40 : 66}
            />
          </div>
        </div>
      </div>

      <div className="broadcast-3d-bottom-wrapper">
        <div className="broadcast-3d-bottom-bar">
          <Gamepad2 size={compact ? 15 : 20} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
          <span className="broadcast-3d-game-title" style={compact ? { fontSize: 13 } : undefined}>
            {activeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ScoreboardOverlay({ roomId = DEFAULT_ROOM_ID }) {
  const [state, setState] = useState(() => getInitialState(roomId));
  const [deltaA, setDeltaA] = useState(0);
  const [deltaB, setDeltaB] = useState(0);
  const prevARef = useRef(state.teams?.[0]?.score || 0);
  const prevBRef = useRef(state.teams?.[1]?.score || 0);
  const timerARef = useRef(null);
  const timerBRef = useRef(null);

  useEffect(() => {
    const initial = getInitialState(roomId);
    setState(initial);
    prevARef.current = initial.teams?.[0]?.score || 0;
    prevBRef.current = initial.teams?.[1]?.score || 0;

    const engine = new SyncEngine(
      (newState) => {
        const scoreA = newState.teams?.[0]?.score || 0;
        const scoreB = newState.teams?.[1]?.score || 0;

        if (scoreA !== prevARef.current) {
          const diff = scoreA - prevARef.current;
          prevARef.current = scoreA;
          if (diff !== 0) {
            setDeltaA(diff);
            if (timerARef.current) clearTimeout(timerARef.current);
            timerARef.current = setTimeout(() => {
              setDeltaA(0);
              timerARef.current = null;
            }, 420);
          }
        }

        if (scoreB !== prevBRef.current) {
          const diff = scoreB - prevBRef.current;
          prevBRef.current = scoreB;
          if (diff !== 0) {
            setDeltaB(diff);
            if (timerBRef.current) clearTimeout(timerBRef.current);
            timerBRef.current = setTimeout(() => {
              setDeltaB(0);
              timerBRef.current = null;
            }, 420);
          }
        }

        setState(newState);
      },
      { roomId }
    );

    return () => {
      if (timerARef.current) clearTimeout(timerARef.current);
      if (timerBRef.current) clearTimeout(timerBRef.current);
      engine.destroy();
    };
  }, [roomId]);

  return (
    <div className="overlay-container transparent-bg" style={{ alignItems: 'flex-start', paddingTop: 20 }}>
      <ScoreboardGraphic state={state} deltaA={deltaA} deltaB={deltaB} />
    </div>
  );
}
