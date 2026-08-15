import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';

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
        setTimeout(() => setFdnBump(false), 400);
        prevFdnRef.current = newState.fdnScore;
      }
      if (newState.lauchangScore !== prevLauchangRef.current) {
        setLauchangBump(true);
        setTimeout(() => setLauchangBump(false), 400);
        prevLauchangRef.current = newState.lauchangScore;
      }
      setState(newState);
    });
    return () => engine.destroy();
  }, []);

  return (
    <div className="overlay-container transparent-bg" style={{ alignItems: 'flex-start', paddingTop: 20 }}>
      <div
        className="card-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '12px 28px',
          borderRadius: 9999,
          backgroundColor: '#0d2620',
          border: '2px solid #194439'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FdnLogo size={42} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.5, color: '#ffffff' }}>
              FDN
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
              TEAM FEEDEN
            </div>
          </div>
          <div
            className={fdnBump ? 'animate-score-bump' : ''}
            style={{
              backgroundColor: '#0d9f67',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 900,
              padding: '4px 18px',
              borderRadius: 12,
              marginLeft: 8,
              minWidth: 48,
              textAlign: 'center'
            }}
          >
            {state.fdnScore}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 900,
              padding: '2px 10px',
              borderRadius: 9999,
              letterSpacing: 1
            }}
          >
            VS
          </span>
          {state.activeGame && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--accent-green)',
                fontWeight: 800,
                marginTop: 4,
                textTransform: 'uppercase',
                maxWidth: 120,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {state.activeGame}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            className={lauchangBump ? 'animate-score-bump' : ''}
            style={{
              backgroundColor: '#e5a93c',
              color: '#091210',
              fontSize: 26,
              fontWeight: 900,
              padding: '4px 18px',
              borderRadius: 12,
              marginRight: 8,
              minWidth: 48,
              textAlign: 'center'
            }}
          >
            {state.lauchangScore}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.5, color: '#ffffff' }}>
              LAUCHANG
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
              TEAM LAUTASHE
            </div>
          </div>
          <LauchangLogo size={42} />
        </div>
      </div>
    </div>
  );
}
