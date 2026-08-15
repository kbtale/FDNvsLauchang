import React, { useState, useEffect } from 'react';
import { SyncEngine, getInitialState, INITIAL_GAMES } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Play, RotateCcw, Plus, Minus, ExternalLink, Dices, Trophy, CheckCircle2 } from 'lucide-react';

export default function ControlPanel() {
  const [state, setState] = useState(getInitialState);
  const [syncEngine, setSyncEngine] = useState(null);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      setState(newState);
    });
    setSyncEngine(engine);
    return () => engine.destroy();
  }, []);

  const triggerSpin = () => {
    if (state.isSpinning || state.remainingGames.length === 0) return;
    const randomIndex = Math.floor(Math.random() * state.remainingGames.length);
    const newState = {
      ...state,
      isSpinning: true,
      winningIndex: randomIndex,
      showWinnerModal: false,
      spinSeed: Date.now()
    };
    syncEngine.broadcast(newState);
  };

  const handleFinishSpin = () => {
    if (state.winningIndex === null || !state.remainingGames[state.winningIndex]) return;
    const selected = state.remainingGames[state.winningIndex];
    const newRemaining = state.remainingGames.filter((_, idx) => idx !== state.winningIndex);
    const newDrawn = [...state.drawnGames, selected];

    const newState = {
      ...state,
      isSpinning: false,
      winningIndex: null,
      activeGame: selected,
      remainingGames: newRemaining,
      drawnGames: newDrawn,
      showWinnerModal: true
    };
    syncEngine.broadcast(newState);
  };

  const updateScore = (team, delta) => {
    const key = team === 'fdn' ? 'fdnScore' : 'lauchangScore';
    const newScore = Math.max(0, state[key] + delta);
    const newState = {
      ...state,
      [key]: newScore
    };
    syncEngine.broadcast(newState);
  };

  const closeModal = () => {
    const newState = {
      ...state,
      showWinnerModal: false
    };
    syncEngine.broadcast(newState);
  };

  const resetAll = () => {
    if (window.confirm('¿Seguro que deseas reiniciar todo el evento, ruleta y marcadores?')) {
      const newState = {
        remainingGames: [...INITIAL_GAMES],
        drawnGames: [],
        fdnScore: 0,
        lauchangScore: 0,
        activeGame: null,
        isSpinning: false,
        winningIndex: null,
        showWinnerModal: false,
        spinSeed: 0
      };
      syncEngine.broadcast(newState);
    }
  };

  return (
    <div className="admin-page-bg" style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div className="pill-badge badge-green" style={{ marginBottom: 8 }}>
              CONTROL EN VIVO
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
              FDN VS LAUCHANG — DASHBOARD STREAM
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a
              href="/roulette"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Overlay Ruleta <ExternalLink size={16} />
            </a>
            <a
              href="/scoreboard"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Overlay Marcador <ExternalLink size={16} />
            </a>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FdnLogo size={52} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>TEAM FDN</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Feeden</p>
                </div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--accent-green)' }}>
                {state.fdnScore}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => updateScore('fdn', 1)}
              >
                <Plus size={18} /> Puntear +1
              </button>
              <button
                className="btn-secondary"
                onClick={() => updateScore('fdn', -1)}
              >
                <Minus size={18} />
              </button>
            </div>
          </div>

          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <LauchangLogo size={52} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>TEAM LAUCHANG</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lautashe</p>
                </div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--accent-gold)' }}>
                {state.lauchangScore}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, backgroundColor: 'var(--accent-gold)' }}
                onClick={() => updateScore('lauchang', 1)}
              >
                <Plus size={18} /> Puntear +1
              </button>
              <button
                className="btn-secondary"
                onClick={() => updateScore('lauchang', -1)}
              >
                <Minus size={18} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          <div className="card-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dices size={22} color="var(--accent-green)" /> Acciones de Ruleta
              </h2>
              <span className="pill-badge badge-dark">
                Restantes: {state.remainingGames.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button
                className="btn-white"
                style={{ flex: 1, padding: '16px 24px', fontSize: 16 }}
                disabled={state.isSpinning || state.remainingGames.length === 0}
                onClick={triggerSpin}
              >
                <Play size={20} fill="currentColor" /> {state.isSpinning ? 'Girando...' : 'GIRAR RULETA'}
              </button>

              {state.isSpinning && (
                <button className="btn-secondary" onClick={handleFinishSpin}>
                  Forzar Resultado
                </button>
              )}
            </div>

            {state.activeGame && (
              <div style={{ padding: 16, backgroundColor: 'var(--panel-surface)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Juego Actual</span>
                  <h3 style={{ fontSize: 22, fontWeight: 900 }}>{state.activeGame}</h3>
                </div>
                {state.showWinnerModal ? (
                  <button className="btn-secondary" onClick={closeModal}>
                    Ocultar Modal
                  </button>
                ) : (
                  <span className="pill-badge badge-green">En juego</span>
                )}
              </div>
            )}
          </div>

          <div className="card-panel">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={22} color="var(--accent-green)" /> Estado de Juegos
            </h2>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>Juegos Disponibles</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.remainingGames.map((game) => (
                  <span key={game} className="pill-badge badge-green">
                    {game}
                  </span>
                ))}
                {state.remainingGames.length === 0 && (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Ninguno</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>Juegos Jugados (Eliminados)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.drawnGames.map((game) => (
                  <span key={game} className="pill-badge badge-dark" style={{ opacity: 0.6, textDecoration: 'line-through' }}>
                    <CheckCircle2 size={12} /> {game}
                  </span>
                ))}
                {state.drawnGames.length === 0 && (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Ninguno aún</span>
                )}
              </div>
            </div>

            <button className="btn-danger" style={{ width: '100%' }} onClick={resetAll}>
              <RotateCcw size={16} /> Reiniciar Todo el Evento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
