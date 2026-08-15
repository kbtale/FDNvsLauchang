import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function ScoreboardOverlay() {
  const [state, setState] = useState(getInitialState);
  const [fdnBump, setFdnBump] = useState(false);
  const [lauchangBump, setLauchangBump] = useState(false);
  const prevFdnRef = useRef(state.fdnScore);
  const prevLauchangRef = useRef(state.lauchangScore);

  const fireScoreSparks = (xOrigin) => {
    confetti({
      particleCount: 35,
      spread: 60,
      startVelocity: 25,
      origin: { x: xOrigin, y: 0.15 },
      colors: ['#D99B26', '#0D9F67', '#FFFFFF']
    });
  };

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      if (newState.fdnScore !== prevFdnRef.current) {
        if (newState.fdnScore > prevFdnRef.current) {
          setFdnBump(true);
          fireScoreSparks(0.25);
          setTimeout(() => setFdnBump(false), 900);
        }
        prevFdnRef.current = newState.fdnScore;
      }

      if (newState.lauchangScore !== prevLauchangRef.current) {
        if (newState.lauchangScore > prevLauchangRef.current) {
          setLauchangBump(true);
          fireScoreSparks(0.75);
          setTimeout(() => setLauchangBump(false), 900);
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
            {fdnBump && <div className="score-flash-ring" />}

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

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence>
                {fdnBump && (
                  <motion.div
                    className="combat-float-text"
                    initial={{ opacity: 0, y: 10, scale: 0.5, rotate: -8 }}
                    animate={{ opacity: 1, y: -45, scale: 1.4, rotate: 0 }}
                    exit={{ opacity: 0, y: -65, scale: 1.1 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                    style={{ right: 0 }}
                  >
                    +1 PUNTO!
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={state.fdnScore}
                  className="broadcast-3d-score-number"
                  initial={{ y: -30, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
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
            {lauchangBump && <div className="score-flash-ring" />}

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence>
                {lauchangBump && (
                  <motion.div
                    className="combat-float-text"
                    initial={{ opacity: 0, y: 10, scale: 0.5, rotate: 8 }}
                    animate={{ opacity: 1, y: -45, scale: 1.4, rotate: 0 }}
                    exit={{ opacity: 0, y: -65, scale: 1.1 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                    style={{ left: 0 }}
                  >
                    +1 PUNTO!
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={state.lauchangScore}
                  className="broadcast-3d-score-number"
                  initial={{ y: -30, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
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
