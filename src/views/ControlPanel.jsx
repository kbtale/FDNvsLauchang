import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@ui-sdk/react/alert-dialog';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { toast } from '@ui-sdk/react/toast';
import { SyncEngine, getInitialState } from '../lib/sync';
import {
  DEFAULT_ROOM_ID,
  MAX_LEADERBOARD_TEAMS,
  MAX_SEGMENTS,
  createPresetRoomState,
  getRoomUrls,
  getTokenStorageKey,
  parseBulkSegments,
  pickContrastingTextColor,
  sanitizeMediaUrl
} from '../lib/roomSchema';
import {
  DEFAULT_SPIN_DURATION_MS,
  SLICE_COLORS,
  computeTargetRotationForLayout,
  pickWeightedIndex
} from '../lib/wheel';
import { useI18n } from '../lib/i18n';
import { resolveControlShortcut } from '../lib/shortcuts';
import TeamAvatar from '../components/TeamAvatar';
import RouletteWheel from '../components/RouletteWheel';
import { ScoreboardGraphic } from './ScoreboardOverlay';
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
  Settings,
  Home,
  Copy,
  Undo2,
  History,
  MonitorPlay,
  Languages,
  Database,
  Keyboard
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
  const { lang, setLang, t } = useI18n();
  const [state, setState] = useState(() => getInitialState(roomId));
  const stateRef = useRef(state);
  const [syncEngine, setSyncEngine] = useState(null);
  const [newGameInput, setNewGameInput] = useState('');
  const [newGameColor, setNewGameColor] = useState('#0d9f67');
  const [newGameWeight, setNewGameWeight] = useState(1);
  const [newGameImageUrl, setNewGameImageUrl] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncMeta, setSyncMeta] = useState({ connected: true, persistence: null });
  const [undoCount, setUndoCount] = useState(0);
  const undoStackRef = useRef([]);
  const spinTimerRef = useRef(null);

  const roomUrls = getRoomUrls(roomId, legacyRoute);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setState(getInitialState(roomId));
    setIsAuthenticated(false);
    undoStackRef.current = [];
    setUndoCount(0);
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

  const pushUndoSnapshot = useCallback((snapshot) => {
    undoStackRef.current = [structuredClone(snapshot), ...undoStackRef.current].slice(0, 20);
    setUndoCount(undoStackRef.current.length);
  }, []);

  const handleUndo = useCallback(() => {
    if (!syncEngine || stateRef.current.spin?.isSpinning || undoStackRef.current.length === 0) return;
    const [previous, ...rest] = undoStackRef.current;
    undoStackRef.current = rest;
    setUndoCount(rest.length);
    syncEngine.broadcast({
      ...previous,
      spin: {
        ...previous.spin,
        isSpinning: false
      }
    });
    toast.info(t('undoSuccess'));
  }, [syncEngine, t]);

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

  const triggerSpin = useCallback(() => {
    const current = stateRef.current;
    if (!syncEngine || current.spin?.isSpinning || !current.items || current.items.length === 0) return;

    pushUndoSnapshot(current);
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
      const keepOnWheel = latest.drawMode === 'keep';
      const remaining = keepOnWheel
        ? latest.items
        : (latest.items || []).filter((item) => item.id !== selectedItem.id);
      const alreadyDrawn = (latest.drawnItems || []).some((item) => item.id === selectedItem.id);
      const drawn = keepOnWheel || alreadyDrawn
        ? latest.drawnItems
        : [...(latest.drawnItems || []), selectedItem];
      const scoreSummary = latest.mode === 'wheel-only'
        ? latest.title
        : latest.teams.slice(0, 2).map((tm) => `${tm.name} ${tm.score}`).join(' - ');
      const historyEntry = {
        id: `spin-${spinStartedAt}`,
        type: 'spin',
        label: selectedItem.label,
        detail: scoreSummary,
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
  }, [syncEngine, pushUndoSnapshot]);

  const updateScore = useCallback((teamIndex, delta) => {
    if (!syncEngine || stateRef.current.spin?.isSpinning) return;
    const latest = stateRef.current;
    pushUndoSnapshot(latest);
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
  }, [syncEngine, pushUndoSnapshot]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const handleKeyDown = (event) => {
      const action = resolveControlShortcut(event);
      if (!action) return;
      if (action === 'spin') {
        event.preventDefault();
        triggerSpin();
      } else if (action === 'score-a') {
        event.preventDefault();
        updateScore(0, 1);
      } else if (action === 'score-b') {
        event.preventDefault();
        updateScore(1, 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, triggerSpin, updateScore]);

  const setSoundEnabled = (enabled) => {
    if (!syncEngine) return;
    syncEngine.broadcast({
      ...stateRef.current,
      soundEnabled: Boolean(enabled)
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
    pushUndoSnapshot(latest);
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
    pushUndoSnapshot(latest);
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
    pushUndoSnapshot(latest);
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
    toast.success(t('segmentAdded'), { description: label });
  };

  const handleBulkImport = (replaceExisting) => {
    if (!syncEngine || state.spin?.isSpinning) return;
    const latest = stateRef.current;
    const parsed = parseBulkSegments(bulkText, replaceExisting ? 0 : latest.items.length);
    if (parsed.length === 0) return;
    pushUndoSnapshot(latest);
    const nextItems = (replaceExisting ? parsed : [...latest.items, ...parsed]).slice(0, MAX_SEGMENTS);
    syncEngine.broadcast({
      ...latest,
      items: nextItems,
      drawnItems: replaceExisting ? [] : latest.drawnItems
    });
    setBulkText('');
    setShowBulkPaste(false);
    toast.success(`Imported ${parsed.length} segments`);
  };

  const addLeaderboardTeam = () => {
    if (!syncEngine) return;
    const latest = stateRef.current;
    if (latest.teams.length >= MAX_LEADERBOARD_TEAMS) return;
    const idx = latest.teams.length;
    const color = SLICE_COLORS[idx % SLICE_COLORS.length].toLowerCase();
    syncEngine.broadcast({
      ...latest,
      teams: [
        ...latest.teams,
        {
          id: `p-${Date.now()}-${idx}`,
          name: `PLAYER ${idx + 1}`,
          subtitle: '',
          color,
          textColor: pickContrastingTextColor(color),
          logoUrl: '',
          score: 0
        }
      ]
    });
  };

  const removeLeaderboardTeam = (idx) => {
    if (!syncEngine) return;
    const latest = stateRef.current;
    if (latest.teams.length <= 2) return;
    syncEngine.broadcast({
      ...latest,
      teams: latest.teams.filter((_, i) => i !== idx)
    });
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
    pushUndoSnapshot(latest);
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
    toast.success(t('resetSuccess'));
  };

  const copyObsUrl = async (path, label) => {
    const fullUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success(t('copied'), { description: `${label} · ${fullUrl}` });
    } catch {
      toast.info(label, { description: fullUrl });
    }
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
          <h2 style={{ fontSize: 23, fontWeight: 900, marginBottom: 8 }}>{t('protectedTitle')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            {t('protectedDesc')}
          </p>

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <input
                type="password"
                placeholder={t('pinPlaceholder')}
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
              {isLoggingIn ? t('verifying') : t('unlockPanel')}
            </button>
          </form>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', marginTop: 12 }}
            onClick={() => navigateTo('/')}
          >
            <Home size={15} /> {t('backToHub')}
          </button>
        </div>
      </div>
    );
  }

  const isSpinning = Boolean(state.spin?.isSpinning);
  const winsNeeded = state.bestOf > 0 ? Math.ceil(state.bestOf / 2) : 0;
  const fullRouletteUrl = `${window.location.origin}${roomUrls.roulette}`;
  const fullScoreboardUrl = `${window.location.origin}${roomUrls.scoreboard}`;
  const fullStageUrl = `${window.location.origin}${roomUrls.stage}`;
  const visibleTeams = state.mode === 'versus' ? state.teams.slice(0, 2) : state.teams;

  return (
    <div className="admin-page-bg" style={{ padding: '24px 16px 56px', position: 'relative' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <button type="button" className="pill-badge badge-dark" onClick={() => navigateTo('/')} style={{ cursor: 'pointer' }}>
                <Home size={13} /> {t('hub')}
              </button>
              <span className="pill-badge badge-dark">ROOM · {roomId}</span>
              <span
                className="pill-badge badge-dark"
                style={{
                  borderColor: !syncMeta.connected
                    ? 'var(--accent-red)'
                    : syncMeta.persistence === 'redis'
                      ? 'var(--accent-green)'
                      : 'var(--accent-gold)'
                }}
              >
                <Database size={12} />
                {!syncMeta.connected
                  ? t('offlineMode')
                  : syncMeta.persistence === 'redis'
                    ? t('redisSync')
                    : t('memoryMode')}
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
              {state.title}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label className="studio-switch-label">
              <Volume2 size={15} color="var(--accent-gold)" />
              <span>{t('audioOn')}</span>
              <Switch
                className="studio-switch"
                checked={state.soundEnabled !== false}
                onCheckedChange={setSoundEnabled}
              >
                <SwitchThumb className="studio-switch-thumb" />
              </Switch>
            </label>

            <div className="lang-toggle" role="group" aria-label="Language">
              <Languages size={14} color="var(--accent-gold)" />
              <button type="button" className={lang === 'en' ? 'lang-btn lang-btn-active' : 'lang-btn'} onClick={() => setLang('en')}>EN</button>
              <button type="button" className={lang === 'es' ? 'lang-btn lang-btn-active' : 'lang-btn'} onClick={() => setLang('es')}>ES</button>
            </div>

            <button type="button" className="btn-danger" onClick={handleLogout} style={{ padding: '8px 16px' }}>
              <LogOut size={15} /> {t('logout')}
            </button>
          </div>
        </header>

        {syncMeta.persistence === 'memory' && (
          <div className="memory-banner" role="status">
            <AlertTriangle size={16} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
            <span>{t('memoryWarning')}</span>
          </div>
        )}

        <Tabs defaultValue="live" className="studio-tabs">
          <TabsList aria-label="Control Sections" className="studio-tabs-list">
            <TabsTab value="live" className="studio-tab">
              <Dices size={15} /> {t('tabLive')}
            </TabsTab>
            <TabsTab value="obs" className="studio-tab">
              <MonitorPlay size={15} /> {t('tabObs')}
            </TabsTab>
            <TabsTab value="history" className="studio-tab">
              <History size={15} /> {t('tabHistory')} ({state.history?.length || 0})
            </TabsTab>
            <TabsTab value="branding" className="studio-tab">
              <Settings size={15} /> {t('tabSettings')}
            </TabsTab>
            <TabsIndicator className="studio-tabs-indicator" />
          </TabsList>

          <TabsPanel value="live">
            {state.mode !== 'wheel-only' && (
              <div className="responsive-grid-2" style={{ marginBottom: 24 }}>
                {visibleTeams.map((team, idx) => (
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
                            {team.subtitle || `SIDE ${idx + 1}`}
                            {state.mode === 'versus' && winsNeeded > 0 ? ` · ${t('firstTo')} ${winsNeeded}` : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--accent-gold)' }}>
                        {team.score}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ flex: 1, opacity: isSpinning ? 0.5 : 1 }}
                        disabled={isSpinning}
                        onClick={() => updateScore(idx, 1)}
                      >
                        <Plus size={18} color="var(--accent-gold)" /> {t('scorePlusOne')}
                        {idx < 2 && <kbd className="kbd-chip">{idx + 1}</kbd>}
                      </button>
                      {state.mode === 'leaderboard' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ opacity: isSpinning ? 0.5 : 1, padding: '10px 14px' }}
                          disabled={isSpinning}
                          onClick={() => updateScore(idx, 5)}
                        >
                          +5
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ opacity: isSpinning ? 0.5 : 1 }}
                        disabled={isSpinning}
                        aria-label={`Decrease ${team.name} score`}
                        onClick={() => updateScore(idx, -1)}
                      >
                        <Minus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="responsive-grid-main">
              <div className="card-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dices size={22} color="var(--accent-gold)" /> {t('rouletteActions')}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label className="studio-switch-label" style={{ padding: '5px 10px', fontSize: 12 }}>
                      <span>Keep on Wheel</span>
                      <Switch
                        className="studio-switch"
                        checked={state.drawMode === 'keep'}
                        onCheckedChange={(checked) => updateRoomSetting({ drawMode: checked ? 'keep' : 'eliminate' })}
                      >
                        <SwitchThumb className="studio-switch-thumb" />
                      </Switch>
                    </label>
                    <span className="pill-badge badge-dark">
                      {t('remaining')}: {state.items.length}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <button
                    type="button"
                    className="btn-white"
                    style={{ flex: 1, padding: '16px 24px', fontSize: 16 }}
                    disabled={isSpinning || state.items.length === 0}
                    onClick={triggerSpin}
                  >
                    <Play size={20} fill="currentColor" /> {isSpinning ? t('spinning') : t('spinWheel')}
                    <kbd className="kbd-chip kbd-chip-dark">Space</kbd>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isSpinning || undoCount === 0}
                    style={{ opacity: isSpinning || undoCount === 0 ? 0.45 : 1 }}
                    onClick={handleUndo}
                  >
                    <Undo2 size={17} /> {t('undo')}
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
                  <Keyboard size={14} color="var(--accent-gold)" /> {t('shortcutsHint')}
                </div>

                {state.activeItem && (
                  <div style={{ padding: 16, backgroundColor: 'var(--panel-surface)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('activeSegment')}</span>
                      <h3 style={{ fontSize: 22, fontWeight: 900 }}>{state.activeItem.label}</h3>
                    </div>
                    {state.showWinnerModal ? (
                      <button type="button" className="btn-secondary" onClick={closeModal}>
                        {t('hideWinnerCard')}
                      </button>
                    ) : (
                      <span className="pill-badge badge-dark">{t('active')}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="card-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={22} color="var(--accent-gold)" /> {t('wheelSegments')}
                  </h2>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '7px 12px', fontSize: 12.5 }}
                    disabled={isSpinning}
                    onClick={() => setShowBulkPaste((v) => !v)}
                  >
                    Bulk Paste
                  </button>
                </div>

                {showBulkPaste && (
                  <div className="bulk-paste-box" style={{ marginBottom: 16 }}>
                    <textarea
                      className="studio-input"
                      rows={4}
                      placeholder="Paste one item per line (or comma-separated)..."
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn-white" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={() => handleBulkImport(true)}>
                        Replace Wheel
                      </button>
                      <button type="button" className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={() => handleBulkImport(false)}>
                        Append
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddCustomSegment} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="color"
                      aria-label="New segment color"
                      value={newGameColor}
                      onChange={(e) => setNewGameColor(e.target.value)}
                      disabled={isSpinning}
                      style={{ width: 38, height: 38, border: 'none', background: 'transparent', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      placeholder={t('newSegmentPlaceholder')}
                      value={newGameInput}
                      disabled={isSpinning}
                      onChange={(e) => setNewGameInput(e.target.value)}
                      className="studio-input"
                      style={{ flex: 1 }}
                    />
                    <select
                      className="studio-input"
                      aria-label="New segment weight"
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
                      <Plus size={16} /> {t('add')}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Optional https:// banner image URL"
                    value={newGameImageUrl}
                    disabled={isSpinning}
                    onChange={(e) => setNewGameImageUrl(e.target.value)}
                    className="studio-input"
                  />
                </form>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                    {t('onWheel')}
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
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t('wheelEmpty')}</span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                    {t('drawn')}
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
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t('noneYet')}</span>
                    )}
                  </div>
                </div>

                <AlertDialog
                  onOpenChange={(open, details) => {
                    if (!open && details.returnValue === 'confirm') {
                      confirmResetAll();
                    }
                  }}
                >
                  <AlertDialogTrigger className="btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
                    <RotateCcw size={16} /> {t('resetAll')}
                  </AlertDialogTrigger>
                  <AlertDialogBackdrop className="studio-dialog-backdrop" />
                  <AlertDialogContent className="studio-dialog-content">
                    <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', backgroundColor: 'rgba(201, 50, 50, 0.15)', color: 'var(--accent-red)', marginBottom: 14 }}>
                      <AlertTriangle size={28} />
                    </div>
                    <AlertDialogTitle style={{ fontSize: 21, fontWeight: 900, marginBottom: 10 }}>
                      {t('resetConfirmTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>
                      {t('resetConfirmDesc')}
                    </AlertDialogDescription>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <AlertDialogClose className="btn-secondary" style={{ flex: 1 }}>
                        {t('cancel')}
                      </AlertDialogClose>
                      <AlertDialogClose value="confirm" className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                        {t('yesReset')}
                      </AlertDialogClose>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </TabsPanel>

          <TabsPanel value="obs">
            <div className="responsive-grid-2" style={{ marginBottom: 24 }}>
              <div className="card-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dices size={18} color="var(--accent-gold)" /> {t('rouletteOverlay')}
                  </h3>
                  <span className="pill-badge badge-dark">600 × 600 px</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {t('recommendedSize')}: <strong>600 × 600</strong> (transparent background)
                </p>
                <div className="obs-url-box">{fullRouletteUrl}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button type="button" className="btn-white" style={{ flex: 1 }} onClick={() => copyObsUrl(roomUrls.roulette, 'Roulette (600×600)')}>
                    <Copy size={15} /> {t('copyUrl')}
                  </button>
                  <a href={roomUrls.roulette} target="_blank" rel="noreferrer" className="btn-secondary">
                    {t('openPreview')} <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="card-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={18} color="var(--accent-gold)" /> {t('scoreboardOverlay')}
                  </h3>
                  <span className="pill-badge badge-dark">920 × 220 px</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {t('recommendedSize')}: <strong>920 × 220</strong> (transparent background)
                </p>
                <div className="obs-url-box">{fullScoreboardUrl}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button type="button" className="btn-white" style={{ flex: 1 }} onClick={() => copyObsUrl(roomUrls.scoreboard, 'Scoreboard (920×220)')}>
                    <Copy size={15} /> {t('copyUrl')}
                  </button>
                  <a href={roomUrls.scoreboard} target="_blank" rel="noreferrer" className="btn-secondary">
                    {t('openPreview')} <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            <div className="card-panel" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MonitorPlay size={18} color="var(--accent-gold)" /> Live Stage / Projector View
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    Full-screen combined wheel + scoreboard display for live venues, LAN screens, and watch parties.
                  </p>
                </div>
                <span className="pill-badge badge-dark">1920 × 1080 Full Screen</span>
              </div>
              <div className="obs-url-box">{fullStageUrl}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-white" onClick={() => copyObsUrl(roomUrls.stage, 'Stage View')}>
                  <Copy size={15} /> {t('copyUrl')}
                </button>
                <a href={roomUrls.stage} target="_blank" rel="noreferrer" className="btn-secondary">
                  Open Stage Screen <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="card-panel">
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MonitorPlay size={18} color="var(--accent-gold)" /> {t('liveMiniPreview')}
              </h3>
              <div className="mini-preview-stage">
                <div style={{ width: '100%', maxWidth: 660, margin: '0 auto 22px' }}>
                  <ScoreboardGraphic state={state} compact />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <RouletteWheel
                    items={state.items}
                    teams={state.teams}
                    title={state.title}
                    spin={state.spin}
                    showWinnerModal={state.showWinnerModal}
                    activeItem={state.activeItem}
                    soundEnabled={false}
                    size={280}
                  />
                </div>
              </div>
            </div>
          </TabsPanel>

          <TabsPanel value="history">
            <div className="card-panel">
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={20} color="var(--accent-gold)" /> {t('tabHistory')}
              </h2>
              {(!state.history || state.history.length === 0) ? (
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t('noHistory')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {state.history.map((entry) => (
                    <div key={entry.id} className="history-row">
                      <span className="pill-badge badge-dark" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                        {entry.type}
                      </span>
                      <strong style={{ fontSize: 14 }}>{entry.label}</strong>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {entry.detail}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsPanel>

          <TabsPanel value="branding">
            <div className="card-panel">
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={20} color="var(--accent-gold)" /> {t('tabSettings')}
              </h2>

              <div className="studio-form-row" style={{ marginBottom: 18 }}>
                <label className="studio-field">
                  <span>{t('eventTitle')}</span>
                  <input
                    type="text"
                    className="studio-input"
                    value={state.title}
                    onChange={(e) => updateRoomSetting({ title: e.target.value })}
                    maxLength={64}
                  />
                </label>
                <label className="studio-field">
                  <span>Event Mode</span>
                  <select
                    className="studio-input"
                    value={state.mode || 'versus'}
                    onChange={(e) => updateRoomSetting({ mode: e.target.value })}
                  >
                    <option value="versus">1v1 Versus</option>
                    <option value="leaderboard">Leaderboard (2–8)</option>
                    <option value="wheel-only">Wheel Only / Raffle</option>
                  </select>
                </label>
                <label className="studio-field">
                  <span>Draw Mode</span>
                  <select
                    className="studio-input"
                    value={state.drawMode || 'eliminate'}
                    onChange={(e) => updateRoomSetting({ drawMode: e.target.value })}
                  >
                    <option value="eliminate">Eliminate Winner</option>
                    <option value="keep">Keep on Wheel</option>
                  </select>
                </label>
                {state.mode === 'versus' && (
                  <label className="studio-field">
                    <span>{t('matchFormat')}</span>
                    <select
                      className="studio-input"
                      value={state.bestOf}
                      onChange={(e) => updateRoomSetting({ bestOf: Number(e.target.value) })}
                    >
                      <option value={0}>{t('freeplay')}</option>
                      <option value={3}>Best of 3</option>
                      <option value={5}>Best of 5</option>
                      <option value={7}>Best of 7</option>
                      <option value={9}>Best of 9</option>
                    </select>
                  </label>
                )}
              </div>

              {state.mode === 'leaderboard' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                    Participants ({state.teams.length}/{MAX_LEADERBOARD_TEAMS})
                  </strong>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '7px 14px', fontSize: 13 }}
                    disabled={state.teams.length >= MAX_LEADERBOARD_TEAMS}
                    onClick={addLeaderboardTeam}
                  >
                    <Plus size={14} /> Add Participant
                  </button>
                </div>
              )}

              <div className="responsive-grid-2">
                {visibleTeams.map((team, idx) => (
                  <div key={team.id} className="card-panel-active" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <TeamAvatar name={team.name} logoUrl={team.logoUrl} color={team.color} textColor={team.textColor} size={42} />
                      <strong style={{ fontSize: 15 }}>{state.mode === 'versus' ? (idx === 0 ? 'Team A' : 'Team B') : `Participant #${idx + 1}`}</strong>
                      <input
                        type="color"
                        aria-label={`${team.name} color`}
                        value={team.color}
                        onChange={(e) => updateTeamMeta(idx, 'color', e.target.value)}
                        style={{ marginLeft: 'auto', width: 38, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
                      />
                      {state.mode === 'leaderboard' && state.teams.length > 2 && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 8px' }}
                          onClick={() => removeLeaderboardTeam(idx)}
                          aria-label={`Remove ${team.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}
