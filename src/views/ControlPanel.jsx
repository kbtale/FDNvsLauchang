import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState, INITIAL_GAMES, fixGameName } from '../lib/sync';
import FdnLogo from '../components/FdnLogo';
import LauchangLogo from '../components/LauchangLogo';
import { Play, RotateCcw, Plus, Minus, ExternalLink, Dices, Trophy, CheckCircle2, Trash2, RotateCw, AlertTriangle, Lock, LogOut, KeyRound } from 'lucide-react';

const SESSION_TOKEN_KEY = 'fdn_lauchang_admin_token_v1';

export default function ControlPanel() {
  const [state, setState] = useState(getInitialState);
  const [syncEngine, setSyncEngine] = useState(null);
  const [newGameInput, setNewGameInput] = useState('');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      fetch('/api/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.valid) {
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const engine = new SyncEngine((newState) => {
        if (!newState.isSpinning && fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        setState(newState);
      });
      setSyncEngine(engine);
      return () => {
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        engine.destroy();
      };
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginPassword) return;
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        setIsAuthenticated(true);
        setIsLoggingIn(false);
        return;
      } else {
        setLoginError(data.error || 'Contraseña incorrecta');
        setIsLoggingIn(false);
        return;
      }
    } catch (err) {
      setLoginError('Error al conectar con el servidor de autenticación');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setIsAuthenticated(false);
    setLoginPassword('');
  };

  const triggerSpin = () => {
    if (!syncEngine || state.isSpinning || !state.remainingGames || state.remainingGames.length === 0) return;

    const randomIndex = Math.floor(Math.random() * state.remainingGames.length);
    const selectedGame = state.remainingGames[randomIndex];
    const spinSeed = Date.now();

    const spinningState = {
      ...state,
      isSpinning: true,
      winningIndex: randomIndex,
      showWinnerModal: false,
      spinSeed: spinSeed
    };

    syncEngine.broadcast(spinningState);

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      const newRemaining = state.remainingGames.filter((_, idx) => idx !== randomIndex);
      const newDrawn = [...state.drawnGames, selectedGame];
      const finalState = {
        ...spinningState,
        isSpinning: false,
        winningIndex: null,
        activeGame: selectedGame,
        remainingGames: newRemaining,
        drawnGames: newDrawn,
        showWinnerModal: true
      };
      syncEngine.broadcast(finalState);
    }, 7000);
  };

  const updateScore = (team, delta) => {
    if (!syncEngine) return;
    const key = team === 'fdn' ? 'fdnScore' : 'lauchangScore';
    const newScore = Math.max(0, state[key] + delta);
    const newState = {
      ...state,
      [key]: newScore
    };
    syncEngine.broadcast(newState);
  };

  const closeModal = () => {
    if (!syncEngine) return;
    const newState = {
      ...state,
      showWinnerModal: false
    };
    syncEngine.broadcast(newState);
  };

  const removeGameFromWheel = (gameToRemove) => {
    if (!syncEngine) return;
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
    if (!syncEngine) return;
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
    if (!syncEngine || !newGameInput.trim()) return;
    const formatted = fixGameName(newGameInput.trim().toUpperCase());
    if (state.remainingGames.includes(formatted)) return;

    const newState = {
      ...state,
      remainingGames: [...state.remainingGames, formatted]
    };
    syncEngine.broadcast(newState);
    setNewGameInput('');
  };

  const confirmResetAll = () => {
    if (!syncEngine) return;
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
    setShowResetConfirmModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-page-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-panel" style={{ maxWidth: 420, width: '100%', textAlign: 'center', borderColor: 'var(--border-highlight)' }}>
          <div style={{ display: 'inline-flex', padding: 14, borderRadius: '50%', backgroundColor: 'var(--panel-surface)', color: 'var(--accent-gold)', marginBottom: 20 }}>
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Panel de Control Protegido</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            Ingrese la contraseña del administrador para acceder.
          </p>

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <input
                type="password"
                placeholder="Contraseña de administrador..."
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: 9999,
                  backgroundColor: 'var(--panel-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
              <KeyRound size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {loginError && (
              <div style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="btn-white" style={{ width: '100%', padding: '12px' }} disabled={isLoggingIn}>
              {isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-bg" style={{ padding: '32px 16px', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="pill-badge badge-dark" style={{ marginBottom: 8 }}>
              CONTROL EN VIVO
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
              FDN VS LAUCHANG : DASHBOARD STREAM
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
            <button className="btn-danger" onClick={handleLogout} style={{ padding: '8px 16px' }}>
              <LogOut size={16} /> Salir
            </button>
          </div>
        </header>

        <div className="responsive-grid-2" style={{ marginBottom: 32 }}>
          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FdnLogo size={52} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>FDN</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>TEAM FEEDEN</p>
                </div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--accent-gold)' }}>
                {state.fdnScore}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => updateScore('fdn', 1)}
              >
                <Plus size={18} color="var(--accent-gold)" /> Puntuar +1
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
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => updateScore('lauchang', 1)}
              >
                <Plus size={18} color="var(--accent-gold)" /> Puntuar +1
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

        <div className="responsive-grid-main">
          <div className="card-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dices size={22} color="var(--accent-gold)" /> Acciones de Ruleta
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
                  <span className="pill-badge badge-dark">En juego</span>
                )}
              </div>
            )}
          </div>

          <div className="card-panel">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={22} color="var(--accent-gold)" /> Gestión de Juegos
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
                    className="pill-badge badge-dark"
                    onClick={() => removeGameFromWheel(game)}
                    title="Haz clic para quitar de la ruleta"
                    style={{ cursor: 'pointer' }}
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

            <button className="btn-danger" style={{ width: '100%' }} onClick={() => setShowResetConfirmModal(true)}>
              <RotateCcw size={16} /> Reiniciar Todo el Evento
            </button>
          </div>
        </div>
      </div>

      {showResetConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(6, 10, 8, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card-panel" style={{ maxWidth: 440, width: '100%', textAlign: 'center', borderColor: 'var(--accent-red)' }}>
            <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', backgroundColor: 'rgba(201, 50, 50, 0.15)', color: 'var(--accent-red)', marginBottom: 16 }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>¿Reiniciar Todo el Evento?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Esta acción restaurará todos los juegos a la ruleta y reiniciará los marcadores de FDN y Lauchang a 0.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowResetConfirmModal(false)}>
                Cancelar
              </button>
              <button className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmResetAll}>
                Sí, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
