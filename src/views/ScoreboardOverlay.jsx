import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import { formatScoreDelta } from '../lib/wheel';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreboardOverlay() {
  const [state, setState] = useState(getInitialState);
  const [fdnDelta, setFdnDelta] = useState(0);
  const [lauchangDelta, setLauchangDelta] = useState(0);
  const prevFdnRef = useRef(state.fdnScore);
  const prevLauchangRef = useRef(state.lauchangScore);
  const fdnTimerRef = useRef(null);
  const lauchangTimerRef = useRef(null);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      if (newState.fdnScore !== prevFdnRef.current) {
        const diff = newState.fdnScore - prevFdnRef.current;
        prevFdnRef.current = newState.fdnScore;
        if (diff !== 0) {
          setFdnDelta(diff);
          if (fdnTimerRef.current) clearTimeout(fdnTimerRef.current);
          fdnTimerRef.current = setTimeout(() => {
            setFdnDelta(0);
            fdnTimerRef.current = null;
          }, 420);
        }
      }

      if (newState.lauchangScore !== prevLauchangRef.current) {
        const diff = newState.lauchangScore - prevLauchangRef.current;
        prevLauchangRef.current = newState.lauchangScore;
        if (diff !== 0) {
          setLauchangDelta(diff);
          if (lauchangTimerRef.current) clearTimeout(lauchangTimerRef.current);
          lauchangTimerRef.current = setTimeout(() => {
            setLauchangDelta(0);
            lauchangTimerRef.current = null;
          }, 420);
        }
      }

      setState(newState);
    });

    return () => {
      if (fdnTimerRef.current) clearTimeout(fdnTimerRef.current);
      if (lauchangTimerRef.current) clearTimeout(lauchangTimerRef.current);
      engine.destroy();
    };
  }, []);

  const fdnDeltaLabel = formatScoreDelta(fdnDelta);
  const lauchangDeltaLabel = formatScoreDelta(lauchangDelta);

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
                  TEAM FEEDEN
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <AnimatePresence>
                {fdnDeltaLabel && (
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
                      color: fdnDelta < 0 ? '#fca5a5' : '#ffffff'
                    }}
                  >
                    {fdnDeltaLabel}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={state.fdnScore}
                  className="broadcast-3d-score-number"
                  initial={{ y: -25, opacity: 0, scale: 0.7 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 25, opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 650, damping: 22 }}
                >
                  {state.fdnScore}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="broadcast-3d-divider">
            <div className="broadcast-3d-vs">VS</div>
          </div>

          <div className="broadcast-3d-team-card broadcast-3d-team-lauchang">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <AnimatePresence>
                {lauchangDeltaLabel && (
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
                      color: lauchangDelta < 0 ? '#fca5a5' : '#ffffff'
                    }}
                  >
                    {lauchangDeltaLabel}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={state.lauchangScore}
                  className="broadcast-3d-score-number"
                  initial={{ y: -25, opacity: 0, scale: 0.7 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 25, opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 650, damping: 22 }}
                >
                  {state.lauchangScore}
                </motion.div>
              </AnimatePresence>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  LAUCHANG
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9, marginTop: 4, letterSpacing: 1 }}>
                  TEAM LAUTASHE
                </div>
              </div>
              <LauchangLogo size={66} />
            </div>
          </div>
        </div>

        <div className="broadcast-3d-bottom-wrapper">
          <div className="broadcast-3d-bottom-bar">
            <Gamepad2 size={20} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
            <span className="broadcast-3d-game-title">
              {state.activeGame ? state.activeGame : 'ESPERANDO RULETA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
