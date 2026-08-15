import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Gamepad2 } from 'lucide-react';

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

  return (
    <div className="overlay-container transparent-bg" style={{ alignItems: 'flex-start', paddingTop: 20 }}>
      <div className="broadcast-3d-scoreboard">
        <div className="broadcast-3d-main-bar">
          <div className="broadcast-3d-team-card broadcast-3d-team-fdn">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <FdnLogo size={66} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  FDN
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9, marginTop: 4, letterSpacing: 1 }}>
                  FEEDEN
                </div>
              </div>
            </div>
            <div className={`broadcast-3d-score-number ${fdnBump ? 'animate-score-pop' : ''}`}>
              {state.fdnScore}
            </div>
          </div>

          <div className="broadcast-3d-divider">
            <div className="broadcast-3d-vs">VS</div>
          </div>

          <div className="broadcast-3d-team-card broadcast-3d-team-lauchang">
            <div className={`broadcast-3d-score-number ${lauchangBump ? 'animate-score-pop' : ''}`}>
              {state.lauchangScore}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  LAUCHANG
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9, marginTop: 4, letterSpacing: 1 }}>
                  LAUTASHE
                </div>
              </div>
              <LauchangLogo size={66} />
            </div>
          </div>
        </div>

        <div className="broadcast-3d-bottom-bar">
          <div className="broadcast-3d-game-badge">
            <Gamepad2 size={18} color="var(--accent-green)" />
            <span>{state.activeGame ? `JUEGO EN CURSO: ${state.activeGame}` : 'ESPERANDO RULETA'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
