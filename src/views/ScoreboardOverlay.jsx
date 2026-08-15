import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreboardOverlay() {
  const [state, setState] = useState(getInitialState);
  const [fdnBump, setFdnBump] = useState(false);
  const [lauchangBump, setLauchangBump] = useState(false);
  const prevFdnRef = useRef(state.fdnScore);
  const prevLauchangRef = useRef(state.lauchangScore);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      if (newState.fdnScore !== prevFdnRef.current) {
        if (newState.fdnScore > prevFdnRef.current) {
          setFdnBump(true);
          setTimeout(() => setFdnBump(false), 570);
        }
        prevFdnRef.current = newState.fdnScore;
      }

      if (newState.lauchangScore !== prevLauchangRef.current) {
        if (newState.lauchangScore > prevLauchangRef.current) {
          setLauchangBump(true);
          setTimeout(() => setLauchangBump(false), 570);
        }
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
                  TEAM FEEDEN
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <AnimatePresence>
                {fdnBump && (
                  <motion.div
                    className="combat-float-text"
                    initial={{ opacity: 0, y: 15, scale: 0.5 }}
                    animate={{ opacity: 1, y: -42, scale: 1.5 }}
                    exit={{ opacity: 0, y: -65, scale: 1.1 }}
                    transition={{ duration: 0.57, ease: 'easeOut' }}
                    style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999 }}
                  >
                    +1
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
                {lauchangBump && (
                  <motion.div
                    className="combat-float-text"
                    initial={{ opacity: 0, y: 15, scale: 0.5 }}
                    animate={{ opacity: 1, y: -42, scale: 1.5 }}
                    exit={{ opacity: 0, y: -65, scale: 1.1 }}
                    transition={{ duration: 0.57, ease: 'easeOut' }}
                    style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999 }}
                  >
                    +1
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
