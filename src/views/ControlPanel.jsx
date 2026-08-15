import React, { useState, useEffect } from 'react';
import { SyncEngine, getInitialState, INITIAL_GAMES, fixGameName } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Play, RotateCcw, Plus, Minus, ExternalLink, Dices, Trophy, CheckCircle2, Trash2, RotateCw } from 'lucide-react';

export default function ControlPanel() {
  const [state, setState] = useState(getInitialState);
  const [syncEngine, setSyncEngine] = useState(null);
  const [newGameInput, setNewGameInput] = useState('');

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

  const removeGameFromWheel = (gameToRemove) => {
    const updatedRemaining = state.remainingGames.filter((g) => g !== gameToRemove);
    const updatedDrawn = state.drawnGames.includes(gameToRemove) ? state.drawnGames : [...state.drawnGames, gameToRemove];
    const newState = {
      ...state,
      remainingGames: updatedRemaining,
      drawnGames: updatedDrawn
    };
    syncEngine.broadcast(newState);
  };

  const restoreGameToWheel = (gameToRestore) => {
    const updatedDrawn = state.drawnGames.filter((g) => g !== gameToRestore);
    const updatedRemaining = state.remainingGames.includes(gameToRestore) ? state.remainingGames : [...state.remainingGames, gameToRestore];
    const newState = {
      ...state,
      remainingGames: updatedRemaining,
      drawnGames: updatedDrawn
    };
    syncEngine.broadcast(newState);
  };

  const handleAddCustomGame = (e) => {
    e.preventDefault();
    if (!newGameInput.trim()) return;
    const formatted = fixGameName(newGameInput.trim().toUpperCase());
    if (state.remainingGames.includes(formatted)) return;

    const newState = {
      ...state,
      remainingGames: [...state.remainingGames, formatted]
    };
    syncEngine.broadcast(newState);
    setNewGameInput('');
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
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>FDN</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>TEAM FEEDEN</p>
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
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>LAUCHANG</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>TEAM LAUTASHE</p>
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
              <Trophy size={22} color="var(--accent-green)" /> Gestión de Juegos
            </h2>

            <form onSubmit={handleAddCustomGame} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Añadir nuevo juego..."
                value={newGameInput}
                onChange={(e) => setNewGameInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 9999,
                  backgroundColor: 'var(--panel-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: 13,
                  fontWeight: 600
                }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '10px 16px' }}>
                <Plus size={16} /> Añadir
              </button>
            </form>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                En Ruleta (haz clic para quitar):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.remainingGames.map((game) => (
                  <button
                    key={game}
                    className="pill-badge badge-green"
                    onClick={() => removeGameFromWheel(game)}
                    title="Haz clic para quitar de la ruleta"
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {game} <Trash2 size={12} style={{ opacity: 0.8 }} />
                  </button>
                ))}
                {state.remainingGames.length === 0 && (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Ninguno en ruleta</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                Eliminados (haz clic para restaurar):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.drawnGames.map((game) => (
                  <button
                    key={game}
                    className="pill-badge badge-dark"
                    onClick={() => restoreGameToWheel(game)}
                    title="Haz clic para devolver a la ruleta"
                    style={{ cursor: 'pointer', opacity: 0.8 }}
                  >
                    <CheckCircle2 size={12} /> {game} <RotateCw size={12} style={{ marginLeft: 4 }} />
                  </button>
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
