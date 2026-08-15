import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Gamepad2, Trophy, Flame } from 'lucide-react';

export default function ScoreboardOverlay() {
  const [state, setState] = useState(getInitialState);
  const [fdnBump, setFdnBump] = useState(false);
  const [lauchangBump, setLauchangBump] = useState(false);
  const prevFdnRef = useRef(state.fdnScore);
  const prevLauchangRef = useRef(state.lauchangScore);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      if (newState.fdnScore !== prevFdnRef.current) {
        setFdnBump(true);
        setTimeout(() => setFdnBump(false), 450);
        prevFdnRef.current = newState.fdnScore;
      }
      if (newState.lauchangScore !== prevLauchangRef.current) {
        setLauchangBump(true);
        setTimeout(() => setLauchangBump(false), 450);
        prevLauchangRef.current = newState.lauchangScore;
      }
      setState(newState);
    });
    return () => engine.destroy();
  }, []);

  const playedCount = state.drawnGames ? state.drawnGames.length : 0;

  return (
    <div className="overlay-container transparent-bg" style={{ alignItems: 'flex-start', paddingTop: 24 }}>
      <div className="broadcast-scoreboard">
        <div className="broadcast-main-bar">
          <div className="broadcast-team-card broadcast-team-fdn">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <FdnLogo size={58} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
                  FDN
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, marginTop: 4, letterSpacing: 1 }}>
                  TEAM FEEDEN
                </div>
              </div>
            </div>
            <div className={`broadcast-score-number ${fdnBump ? 'animate-score-pop' : ''}`}>
              {state.fdnScore}
            </div>
          </div>

          <div className="broadcast-center-divider">
            <div className="broadcast-vs-text">VS</div>
          </div>

          <div className="broadcast-team-card broadcast-team-lauchang">
            <div className={`broadcast-score-number ${lauchangBump ? 'animate-score-pop' : ''}`}>
              {state.lauchangScore}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
                  LAUCHANG
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, marginTop: 4, letterSpacing: 1 }}>
                  TEAM LAUTASHE
                </div>
              </div>
              <LauchangLogo size={58} />
            </div>
          </div>
        </div>

        <div className="broadcast-bottom-bar">
          <div className="broadcast-status-item">
            <Trophy size={16} color="var(--accent-green)" />
            <span>RONDA {playedCount + 1} / 5</span>
          </div>

          <div className="broadcast-status-item">
            <Gamepad2 size={16} color="var(--accent-gold)" />
            <span>{state.activeGame ? `EN JUEGO: ${state.activeGame}` : 'ESPERANDO RULETA'}</span>
            <div className="broadcast-status-dots" style={{ marginLeft: 8 }}>
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className={`broadcast-dot ${idx < playedCount ? 'broadcast-dot-active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="broadcast-status-item">
            <Flame size={16} color="#d93838" />
            <span>BEST OF 5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
