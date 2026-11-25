import React, { useState, useEffect, useRef } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import {
  DEFAULT_ROOM_ID,
  createPresetRoomState,
  getRoomUrls,
  getTokenStorageKey,
  pickContrastingTextColor,
  sanitizeMediaUrl
} from '../lib/roomSchema';
import {
  DEFAULT_SPIN_DURATION_MS,
  SLICE_COLORS,
  computeTargetRotationForLayout,
  pickWeightedIndex
} from '../lib/wheel';
import TeamAvatar from '../components/TeamAvatar';
import { navigateTo } from '../App';
import {
  Play,
  RotateCcw,
  Plus,
  Minus,
  ExternalLink,
  Dices,
  Trophy,
  CheckCircle2,
  Trash2,
  RotateCw,
  AlertTriangle,
  Lock,
  LogOut,
  KeyRound,
  Volume2,
  VolumeX,
  Settings,
  Home
} from 'lucide-react';

const LEGACY_TOKEN_KEY = 'fdn_lauchang_admin_token_v1';

function readStoredToken(roomId) {
  const scoped = sessionStorage.getItem(getTokenStorageKey(roomId));
  if (scoped) return scoped;
  if (roomId === DEFAULT_ROOM_ID) {
    return sessionStorage.getItem(LEGACY_TOKEN_KEY);
  }
  return null;
}

function clearStoredToken(roomId) {
  sessionStorage.removeItem(getTokenStorageKey(roomId));
  if (roomId === DEFAULT_ROOM_ID) {
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

export default function ControlPanel({ roomId = DEFAULT_ROOM_ID, legacyRoute = false }) {
  const [state, setState] = useState(() => getInitialState(roomId));
  const stateRef = useRef(state);
  const [syncEngine, setSyncEngine] = useState(null);
  const [newGameInput, setNewGameInput] = useState('');
  const [newGameColor, setNewGameColor] = useState('#0d9f67');
  const [newGameWeight, setNewGameWeight] = useState(1);
  const [newGameImageUrl, setNewGameImageUrl] = useState('');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showSettingsEditor, setShowSettingsEditor] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncMeta, setSyncMeta] = useState({ connected: true, persistence: null });
  const spinTimerRef = useRef(null);

  const roomUrls = getRoomUrls(roomId, legacyRoute);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setState(getInitialState(roomId));
    setIsAuthenticated(false);
    const token = readStoredToken(roomId);
    if (token) {
      fetch(`/api/verify?room=${encodeURIComponent(roomId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.valid && data.roomId === roomId) {
            setIsAuthenticated(true);
          } else {
            clearStoredToken(roomId);
          }
        })
        .catch(() => {});
    }
  }, [roomId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSyncEngine(null);
      return undefined;
    }

    const engine = new SyncEngine(
      (newState) => {
        setState(newState);
      },
      {
        roomId,
        getAuthToken: () => readStoredToken(roomId),
        onUnauthorized: () => {
          clearStoredToken(roomId);
          setIsAuthenticated(false);
        },
        onMetaUpdate: (meta) => {
          setSyncMeta((prev) => ({
            connected: meta.connected,
            persistence: meta.persistence || prev.persistence
          }));
        }
      }
    );
    setSyncEngine(engine);

    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      engine.destroy();
    };
  }, [isAuthenticated, roomId]);

  useEffect(() => {
    let safetyTimer = null;
    if (state.spin?.isSpinning && syncEngine) {
      safetyTimer = setTimeout(() => {
        if (stateRef.current.spin?.isSpinning) {
          const latest = stateRef.current;
          syncEngine.broadcast({
            ...latest,
            spin: {
              ...latest.spin,
              isSpinning: false
            }
          });
        }
      }, 7500);
    }
    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [state.spin?.isSpinning, syncEngine]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginPassword) return;
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, password: loginPassword })
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem(getTokenStorageKey(roomId), data.token);
        setIsAuthenticated(true);
        setIsLoggingIn(false);
        return;
      }
      setLoginError(data.error || 'Invalid password');
      setIsLoggingIn(false);
    } catch {
      setLoginError('Failed to reach authentication server');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken(roomId);
    setIsAuthenticated(false);
    setLoginPassword('');
  };

  const triggerSpin = () => {
    const current = stateRef.current;
    if (!syncEngine || current.spin?.isSpinning || !current.items || current.items.length === 0) return;

    const wheelPool = current.items.map((item) => ({ ...item }));
    const winningIndex = pickWeightedIndex(wheelPool);
    if (winningIndex < 0) return;

    const selectedItem = wheelPool[winningIndex];
    const spinStartedAt = Date.now();
    const spinDurationMs = DEFAULT_SPIN_DURATION_MS;
    const startRotation = current.spin?.targetRotation || 0;
    const targetRotation = computeTargetRotationForLayout({
      startRotation,
      winningIndex,
      items: wheelPool,
      extraSpins: 7
    });

    const spinPayload = {
      isSpinning: true,
      spinSeed: spinStartedAt,
      spinStartedAt,
      spinDurationMs,
      startRotation,
      targetRotation,
      winningIndex,
      wheelItems: wheelPool
    };

    syncEngine.broadcast({
      ...current,
      showWinnerModal: false,
      spin: spinPayload
    });

    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    spinTimerRef.current = setTimeout(() => {
      const latest = stateRef.current;
      const remaining = (latest.items || []).filter((item) => item.id !== selectedItem.id);
      const alreadyDrawn = (latest.drawnItems || []).some((item) => item.id === selectedItem.id);
      const drawn = alreadyDrawn
        ? latest.drawnItems
        : [...(latest.drawnItems || []), selectedItem];
      const historyEntry = {
        id: `spin-${spinStartedAt}`,
        type: 'spin',
        label: selectedItem.label,
        detail: `${latest.teams[0].name} ${latest.teams[0].score} - ${latest.teams[1].score} ${latest.teams[1].name}`,
        timestamp: Date.now()
      };

      syncEngine.broadcast({
        ...latest,
        items: remaining,
        drawnItems: drawn,
        activeItem: selectedItem,
        showWinnerModal: true,
        history: [historyEntry, ...(latest.history || [])].slice(0, 50),
        spin: {
          ...spinPayload,
          isSpinning: false,
          winningIndex: null
        }
      });
      spinTimerRef.current = null;
    }, spinDurationMs + 150);
  };

  const updateScore = (teamIndex, delta) => {
    if (!syncEngine) return;
    const latest = stateRef.current;
    const updatedTeams = latest.teams.map((team, idx) => {
      if (idx !== teamIndex) return team;
      return { ...team, score: Math.max(0, (team.score || 0) + delta) };
    });
    const team = updatedTeams[teamIndex];
    const historyEntry = {
      id: `score-${Date.now()}`,
      type: 'score',
      label: `${team.name} ${delta > 0 ? `+${delta}` : delta}`,
      detail: `${updatedTeams[0].name} ${updatedTeams[0].score} - ${updatedTeams[1].score} ${updatedTeams[1].name}`,
      timestamp: Date.now()
    };

    syncEngine.broadcast({
      ...latest,
      teams: updatedTeams,
      history: [historyEntry, ...(latest.history || [])].slice(0, 50)
    });
  };

  const toggleSound = () => {
    if (!syncEngine) return;
    const latest = stateRef.current;
    syncEngine.broadcast({
      ...latest,
      soundEnabled: latest.soundEnabled === false
    });
  };

  const closeModal = () => {
    if (!syncEngine) return;
    syncEngine.broadcast({
      ...stateRef.current,
      showWinnerModal: false
    });
  };

  const removeItemFromWheel = (itemToRemove) => {
    if (!syncEngine || state.spin?.isSpinning) return;
    const latest = stateRef.current;
    const updatedItems = latest.items.filter((item) => item.id !== itemToRemove.id);
    const alreadyDrawn = latest.drawnItems.some((item) => item.id === itemToRemove.id);
    syncEngine.broadcast({
      ...latest,
      items: updatedItems,
      drawnItems: alreadyDrawn ? latest.drawnItems : [...latest.drawnItems, itemToRemove]
    });
  };

  const restoreItemToWheel = (itemToRestore) => {
    if (!syncEngine || state.spin?.isSpinning) return;
    const latest = stateRef.current;
    const updatedDrawn = latest.drawnItems.filter((item) => item.id !== itemToRestore.id);
    const alreadyInWheel = latest.items.some((item) => item.id === itemToRestore.id);
    syncEngine.broadcast({
      ...latest,
      items: alreadyInWheel ? latest.items : [...latest.items, itemToRestore],
      drawnItems: updatedDrawn
    });
  };

  const handleAddCustomSegment = (e) => {
    e.preventDefault();
    if (!syncEngine || state.spin?.isSpinning || !newGameInput.trim()) return;
    const label = newGameInput.trim().toUpperCase().slice(0, 48);
    const latest = stateRef.current;
    const newItem = {
      id: `seg-${Date.now()}`,
      label,
      color: newGameColor || SLICE_COLORS[latest.items.length % SLICE_COLORS.length].toLowerCase(),
      imageUrl: sanitizeMediaUrl(newGameImageUrl),
      weight: Math.max(1, Math.min(10, Number(newGameWeight) || 1))
    };

    syncEngine.broadcast({
      ...latest,
      items: [...latest.items, newItem]
    });
    setNewGameInput('');
    setNewGameImageUrl('');
    setNewGameWeight(1);
  };

  const updateRoomSetting = (patch) => {
    if (!syncEngine) return;
    syncEngine.broadcast({
      ...stateRef.current,
      ...patch
    });
  };

  const updateTeamMeta = (teamIndex, field, value) => {
    if (!syncEngine) return;
    const latest = stateRef.current;
    const updatedTeams = latest.teams.map((team, idx) => {
      if (idx !== teamIndex) return team;
      const next = { ...team, [field]: field === 'logoUrl' ? sanitizeMediaUrl(value) : value };
      if (field === 'color') {
        next.textColor = pickContrastingTextColor(value);
      }
      return next;
    });
    syncEngine.broadcast({
      ...latest,
      teams: updatedTeams
    });
  };

  const confirmResetAll = () => {
    if (!syncEngine) return;
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    const latest = stateRef.current;
    const restoredItems = [...latest.items, ...latest.drawnItems];
    const fallbackPreset = createPresetRoomState(roomId === DEFAULT_ROOM_ID ? DEFAULT_ROOM_ID : 'bo5-showmatch', { roomId });
    syncEngine.broadcast({
      ...latest,
      teams: latest.teams.map((team) => ({ ...team, score: 0 })),
      items: restoredItems.length > 0 ? restoredItems : fallbackPreset.items,
      drawnItems: [],
      activeItem: null,
      history: [],
      showWinnerModal: false,
      spin: {
        isSpinning: false,
        spinSeed: 0,
        spinStartedAt: 0,
        spinDurationMs: DEFAULT_SPIN_DURATION_MS,
        startRotation: 0,
        targetRotation: 0,
        winningIndex: null,
        wheelItems: []
      }
    });
    setShowResetConfirmModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-page-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-panel" style={{ maxWidth: 420, width: '100%', textAlign: 'center', borderColor: 'var(--border-highlight)' }}>
          <div style={{ display: 'inline-flex', padding: 14, borderRadius: '50%', backgroundColor: 'var(--panel-surface)', color: 'var(--accent-gold)', marginBottom: 18 }}>
            <Lock size={30} />
          </div>

          <div className="pill-badge badge-dark" style={{ marginBottom: 12 }}>
            ROOM · {roomId}
          </div>
          <h2 style={{ fontSize: 23, fontWeight: 900, marginBottom: 8 }}>Protected Control Panel</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            Enter the room administrator PIN or password to unlock live controls.
          </p>

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <input
                type="password"
                placeholder="Room PIN / Admin Password..."
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="studio-input"
                style={{ paddingLeft: 42, borderRadius: 9999 }}
              />
              <KeyRound size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {loginError && (
              <div style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="btn-white" style={{ width: '100%', padding: '12px' }} disabled={isLoggingIn}>
              {isLoggingIn ? 'Verifying...' : 'Unlock Control Panel'}
            </button>
          </form>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', marginTop: 12 }}
            onClick={() => navigateTo('/')}
          >
            <Home size={15} /> Back to Room Hub
          </button>
        </div>
      </div>
    );
  }

  const isSpinning = Boolean(state.spin?.isSpinning);
  const teamA = state.teams[0];
  const teamB = state.teams[1];
  const winsNeeded = state.bestOf > 0 ? Math.ceil(state.bestOf / 2) : 0;

  return (
    <div className="admin-page-bg" style={{ padding: '28px 16px 48px', position: 'relative' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <button type="button" className="pill-badge badge-dark" onClick={() => navigateTo('/')} style={{ cursor: 'pointer' }}>
                <Home size={13} /> HUB
              </button>
              <span className="pill-badge badge-dark">ROOM · {roomId}</span>
              {syncMeta.persistence && (
                <span className="pill-badge badge-dark" style={{ borderColor: syncMeta.persistence === 'redis' ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
                  {syncMeta.persistence === 'redis' ? 'REDIS SYNC' : 'MEMORY MODE'}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
              {state.title}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={roomUrls.roulette} target="_blank" rel="noreferrer" className="btn-secondary">
              Roulette <ExternalLink size={15} />
            </a>
            <a href={roomUrls.scoreboard} target="_blank" rel="noreferrer" className="btn-secondary">
              Scoreboard <ExternalLink size={15} />
            </a>
            <button type="button" className="btn-secondary" onClick={toggleSound}>
              {state.soundEnabled !== false ? <Volume2 size={15} color="var(--accent-gold)" /> : <VolumeX size={15} />}
              {state.soundEnabled !== false ? 'Audio ON' : 'Audio OFF'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowSettingsEditor((v) => !v)}>
              <Settings size={15} color="var(--accent-gold)" /> Room Setup
            </button>
            <button type="button" className="btn-danger" onClick={handleLogout} style={{ padding: '8px 16px' }}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        {showSettingsEditor && (
          <div className="card-panel" style={{ marginBottom: 28, borderColor: 'var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={18} color="var(--accent-gold)" /> Live Room Branding & Format
              </h2>
              <button type="button" className="btn-secondary" style={{ padding: '6px 14px' }} onClick={() => setShowSettingsEditor(false)}>
                Done
              </button>
            </div>

            <div className="responsive-grid-2" style={{ marginBottom: 16 }}>
              <label className="studio-field">
                <span>Event Title</span>
                <input
                  type="text"
                  className="studio-input"
                  value={state.title}
                  onChange={(e) => updateRoomSetting({ title: e.target.value })}
                  maxLength={64}
                />
              </label>
              <label className="studio-field">
                <span>Match Format (Best-of-N)</span>
                <select
                  className="studio-input"
                  value={state.bestOf}
                  onChange={(e) => updateRoomSetting({ bestOf: Number(e.target.value) })}
                >
                  <option value={0}>Freeplay</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                  <option value={9}>Best of 9</option>
                </select>
              </label>
            </div>

            <div className="responsive-grid-2">
              {state.teams.map((team, idx) => (
                <div key={team.id} className="card-panel-active" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <TeamAvatar name={team.name} logoUrl={team.logoUrl} color={team.color} textColor={team.textColor} size={38} />
                    <strong style={{ fontSize: 14 }}>{idx === 0 ? 'Team A' : 'Team B'}</strong>
                    <input
                      type="color"
                      value={team.color}
                      onChange={(e) => updateTeamMeta(idx, 'color', e.target.value)}
                      style={{ marginLeft: 'auto', width: 38, height: 30, border: 'none', background: 'transparent', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      className="studio-input"
                      value={team.name}
                      onChange={(e) => updateTeamMeta(idx, 'name', e.target.value)}
                      placeholder="Team Name"
                    />
                    <input
                      type="text"
                      className="studio-input"
                      value={team.subtitle}
                      onChange={(e) => updateTeamMeta(idx, 'subtitle', e.target.value)}
                      placeholder="Subtitle"
                    />
                  </div>
                  <input
                    type="text"
                    className="studio-input"
                    value={team.logoUrl}
                    onChange={(e) => updateTeamMeta(idx, 'logoUrl', e.target.value)}
                    placeholder="Logo URL (https://... or /...)"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="responsive-grid-2" style={{ marginBottom: 28 }}>
          {[teamA, teamB].map((team, idx) => (
            <div key={team.id} className="card-panel" style={{ borderTop: `3px solid ${team.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <TeamAvatar
                    name={team.name}
                    logoUrl={team.logoUrl}
                    color={team.color}
                    textColor={team.textColor}
                    size={54}
                  />
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800 }}>{team.name}</h2>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {team.subtitle || (idx === 0 ? 'TEAM A' : 'TEAM B')}
                      {winsNeeded > 0 ? ` · First to ${winsNeeded}` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--accent-gold)' }}>
                  {team.score}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, opacity: isSpinning ? 0.5 : 1 }}
                  disabled={isSpinning}
                  onClick={() => updateScore(idx, 1)}
                >
                  <Plus size={18} color="var(--accent-gold)" /> Score +1
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ opacity: isSpinning ? 0.5 : 1 }}
                  disabled={isSpinning}
                  onClick={() => updateScore(idx, -1)}
                >
                  <Minus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="responsive-grid-main">
          <div className="card-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dices size={22} color="var(--accent-gold)" /> Roulette Actions
              </h2>
              <span className="pill-badge badge-dark">
                Remaining: {state.items.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button
                type="button"
                className="btn-white"
                style={{ flex: 1, padding: '16px 24px', fontSize: 16 }}
                disabled={isSpinning || state.items.length === 0}
                onClick={triggerSpin}
              >
                <Play size={20} fill="currentColor" /> {isSpinning ? 'Spinning...' : 'SPIN WHEEL'}
              </button>
            </div>

            {state.activeItem && (
              <div style={{ padding: 16, backgroundColor: 'var(--panel-surface)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Segment</span>
                  <h3 style={{ fontSize: 22, fontWeight: 900 }}>{state.activeItem.label}</h3>
                </div>
                {state.showWinnerModal ? (
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Hide Winner Card
                  </button>
                ) : (
                  <span className="pill-badge badge-dark">Active</span>
                )}
              </div>
            )}
          </div>

          <div className="card-panel">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={22} color="var(--accent-gold)" /> Wheel Segments
            </h2>

            <form onSubmit={handleAddCustomSegment} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="color"
                  value={newGameColor}
                  onChange={(e) => setNewGameColor(e.target.value)}
                  disabled={isSpinning}
                  style={{ width: 38, height: 38, border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  placeholder="Add custom game or challenge..."
                  value={newGameInput}
                  disabled={isSpinning}
                  onChange={(e) => setNewGameInput(e.target.value)}
                  className="studio-input"
                  style={{ flex: 1 }}
                />
                <select
                  className="studio-input"
                  value={newGameWeight}
                  disabled={isSpinning}
                  onChange={(e) => setNewGameWeight(Number(e.target.value))}
                  style={{ width: 68 }}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((w) => (
                    <option key={w} value={w}>{w}x</option>
                  ))}
                </select>
                <button type="submit" className="btn-secondary" disabled={isSpinning} style={{ padding: '8px 14px' }}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <input
                type="text"
                placeholder="Optional https:// banner image URL (leave blank for clean color slice)"
                value={newGameImageUrl}
                disabled={isSpinning}
                onChange={(e) => setNewGameImageUrl(e.target.value)}
                className="studio-input"
              />
            </form>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                On Wheel (click to remove):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="pill-badge badge-dark"
                    disabled={isSpinning}
                    onClick={() => removeItemFromWheel(item)}
                    style={{ cursor: isSpinning ? 'not-allowed' : 'pointer', opacity: isSpinning ? 0.5 : 1 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                    {item.label}
                    {item.weight > 1 ? ` (${item.weight}x)` : ''}
                    <Trash2 size={12} style={{ opacity: 0.8 }} />
                  </button>
                ))}
                {state.items.length === 0 && (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Wheel is empty</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                Drawn (click to restore):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.drawnItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="pill-badge badge-dark"
                    disabled={isSpinning}
                    onClick={() => restoreItemToWheel(item)}
                    style={{ cursor: isSpinning ? 'not-allowed' : 'pointer', opacity: isSpinning ? 0.5 : 1 }}
                  >
                    <CheckCircle2 size={12} /> {item.label} <RotateCw size={12} style={{ marginLeft: 4 }} />
                  </button>
                ))}
                {state.drawnItems.length === 0 && (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>None yet</span>
                )}
              </div>
            </div>

            <button type="button" className="btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResetConfirmModal(true)}>
              <RotateCcw size={16} /> Reset Scores & Wheel
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
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Reset Scores & Wheel?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              This restores all drawn segments to the wheel and resets both team scores to 0.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowResetConfirmModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmResetAll}>
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
