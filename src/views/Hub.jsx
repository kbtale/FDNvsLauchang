import React, { useState } from 'react';
import {
  Dices,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  Rocket,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  ArrowRight,
  Copy,
  Languages
} from 'lucide-react';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { toast } from '@ui-sdk/react/toast';
import TeamAvatar from '../components/TeamAvatar';
import {
  CLASSIC_PRESETS,
  DEFAULT_ROOM_ID,
  MAX_LEADERBOARD_TEAMS,
  MAX_SEGMENTS,
  ROOM_PRESETS,
  getRoomUrls,
  getTokenStorageKey,
  parseBulkSegments,
  pickContrastingTextColor,
  sanitizeMediaUrl
} from '../lib/roomSchema';
import { SLICE_COLORS } from '../lib/wheel';
import { EVENT_BADGE_ICONS, OVERLAY_THEMES } from '../lib/themes';
import { useI18n } from '../lib/i18n';
import { navigateTo } from '../App';

function generateRandomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function Hub() {
  const { lang, setLang, t } = useI18n();
  const defaultPreset = ROOM_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);
  const [mode, setMode] = useState(defaultPreset.mode || 'versus');
  const [drawMode, setDrawMode] = useState(defaultPreset.drawMode || 'eliminate');
  const [theme, setTheme] = useState(defaultPreset.theme || 'emerald-gold');
  const [title, setTitle] = useState(defaultPreset.title);
  const [customRoomId, setCustomRoomId] = useState('');
  const [password, setPassword] = useState(() => generateRandomPin());
  const [bestOf, setBestOf] = useState(defaultPreset.bestOf);
  const [teams, setTeams] = useState(() => defaultPreset.teams.map((tm) => ({ ...tm })));
  const [items, setItems] = useState(() => defaultPreset.items.map((it) => ({ ...it })));
  const [newSegmentLabel, setNewSegmentLabel] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  const applyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setMode(preset.mode || 'versus');
    setDrawMode(preset.drawMode || 'eliminate');
    setTitle(preset.title);
    setBestOf(preset.bestOf);
    setTeams(preset.teams.map((tm) => ({ ...tm })));
    setItems(preset.items.map((it) => ({ ...it })));
    setCreateError('');
    setCreatedRoom(null);
  };

  const addParticipant = () => {
    if (teams.length >= MAX_LEADERBOARD_TEAMS) return;
    const idx = teams.length;
    const color = SLICE_COLORS[idx % SLICE_COLORS.length].toLowerCase();
    setTeams((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${idx}`,
        name: `PLAYER ${idx + 1}`,
        subtitle: '',
        color,
        textColor: pickContrastingTextColor(color),
        logoUrl: '',
        score: 0
      }
    ]);
  };

  const removeParticipant = (index) => {
    setTeams((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleBulkImport = (replaceExisting) => {
    const parsed = parseBulkSegments(bulkText, replaceExisting ? 0 : items.length);
    if (parsed.length === 0) return;
    setItems((prev) => (replaceExisting ? parsed : [...prev, ...parsed]).slice(0, MAX_SEGMENTS));
    setBulkText('');
    setShowBulkPaste(false);
    toast.success(`Imported ${parsed.length} segments`);
  };

  const updateTeamField = (index, field, value) => {
    setTeams((prev) =>
      prev.map((team, i) => {
        if (i !== index) return team;
        const next = { ...team, [field]: value };
        if (field === 'color') {
          next.textColor = pickContrastingTextColor(value);
        }
        return next;
      })
    );
  };

  const updateItemField = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addSegment = () => {
    const clean = newSegmentLabel.trim().toUpperCase();
    if (!clean) return;
    setItems((prev) => [
      ...prev,
      {
        id: `seg-${Date.now()}-${prev.length}`,
        label: clean,
        color: SLICE_COLORS[prev.length % SLICE_COLORS.length].toLowerCase(),
        imageUrl: '',
        weight: 1
      }
    ]);
    setNewSegmentLabel('');
  };

  const removeSegment = (index) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const copyAbsoluteUrl = async (path, label) => {
    const fullUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success(t('copied'), { description: `${label} · ${fullUrl}` });
    } catch {
      toast.info(label, { description: fullUrl });
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!password || password.trim().length < 4) {
      setCreateError('Admin PIN must be at least 4 characters.');
      return;
    }
    if (items.length === 0) {
      setCreateError('Add at least one wheel segment.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: selectedPresetId,
          mode,
          drawMode,
          theme,
          title,
          roomId: customRoomId.trim() || undefined,
          password: password.trim(),
          bestOf: mode === 'versus' ? (Number(bestOf) || 0) : 0,
          teams: teams.map((tm) => ({
            ...tm,
            logoUrl: sanitizeMediaUrl(tm.logoUrl)
          })),
          items: items.map((it) => ({
            ...it,
            imageUrl: sanitizeMediaUrl(it.imageUrl)
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.error || 'Could not create room.');
        setIsCreating(false);
        return;
      }

      sessionStorage.setItem(getTokenStorageKey(data.roomId), data.token);
      setCreatedRoom({
        roomId: data.roomId,
        urls: data.urls,
        pin: password.trim(),
        persistence: data.persistence
      });
      toast.success(t('roomReady'), { description: `Room ${data.roomId}` });
      setIsCreating(false);
    } catch {
      setCreateError('Network error while creating room.');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (targetView) => {
    const clean = joinCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) return;
    const urls = getRoomUrls(clean, clean === DEFAULT_ROOM_ID);
    if (targetView === 'control') {
      navigateTo(urls.control);
    } else {
      window.open(urls[targetView], '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="admin-page-bg" style={{ padding: '36px 20px 64px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="pill-badge badge-dark" style={{ marginBottom: 10 }}>
              <Sparkles size={14} color="var(--accent-gold)" /> {t('studioBadge')}
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, marginBottom: 6 }}>
              {t('hubTitle')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
              {t('hubSubtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lang-toggle" role="group" aria-label="Language">
              <Languages size={14} color="var(--accent-gold)" />
              <button
                type="button"
                className={lang === 'en' ? 'lang-btn lang-btn-active' : 'lang-btn'}
                onClick={() => setLang('en')}
              >
                EN
              </button>
              <button
                type="button"
                className={lang === 'es' ? 'lang-btn lang-btn-active' : 'lang-btn'}
                onClick={() => setLang('es')}
              >
                ES
              </button>
            </div>
          </div>
        </header>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 12 }}>
            {t('presetsTitle')}
          </h2>

          <div className="preset-grid">
            {ROOM_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const isClassic = preset.id === DEFAULT_ROOM_ID;
              return (
                <div
                  key={preset.id}
                  className={`card-panel preset-card ${isSelected ? 'preset-card-active' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="pill-badge badge-dark" style={{ fontSize: 11, padding: '4px 10px' }}>
                      {preset.badge}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TeamAvatar name={preset.teams[0].name} logoUrl={preset.teams[0].logoUrl} color={preset.teams[0].color} size={26} />
                      <TeamAvatar name={preset.teams[1].name} logoUrl={preset.teams[1].logoUrl} color={preset.teams[1].color} size={26} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>{preset.name}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 14 }}>
                    {preset.description}
                  </p>

                  {isClassic ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-white"
                        style={{ padding: '7px 12px', fontSize: 12 }}
                        onClick={() => navigateTo('/control')}
                      >
                        <Sliders size={13} /> {t('openClassic')}
                      </button>
                      <a href="/roulette" target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '7px 10px', fontSize: 12 }}>
                        <Dices size={13} />
                      </a>
                      <a href="/scoreboard" target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '7px 10px', fontSize: 12 }}>
                        <Trophy size={13} />
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {isSelected ? t('selectedTemplate') : t('loadTemplate')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {createdRoom && (
          <div className="card-panel" style={{ marginBottom: 28, borderColor: 'var(--accent-green)', backgroundColor: '#10221c' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="pill-badge badge-dark" style={{ marginBottom: 8, borderColor: 'var(--accent-green)' }}>
                  ROOM · {createdRoom.roomId}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
                  {t('roomReady')}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {t('savePinHint')} <strong style={{ color: '#ffffff' }}>{createdRoom.pin}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-white"
                  onClick={() => navigateTo(createdRoom.urls.control)}
                >
                  <Sliders size={16} /> {t('openControlPanel')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copyAbsoluteUrl(createdRoom.urls.roulette, 'Roulette (600×600)')}
                >
                  <Copy size={14} /> Roulette (600×600)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copyAbsoluteUrl(createdRoom.urls.scoreboard, 'Scoreboard (920×220)')}
                >
                  <Copy size={14} /> Scoreboard
                </button>
                <a href={createdRoom.urls.stage} target="_blank" rel="noreferrer" className="btn-secondary">
                  Stage View <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="create" className="studio-tabs">
          <TabsList aria-label="Room Studio" className="studio-tabs-list">
            <TabsTab value="create" className="studio-tab">
              <Rocket size={15} /> {t('createRoomTitle')}
            </TabsTab>
            <TabsTab value="join" className="studio-tab">
              <ExternalLink size={15} /> {t('control')} / Join Room
            </TabsTab>
            <TabsIndicator className="studio-tabs-indicator" />
          </TabsList>

          <TabsPanel value="create" keepMounted>
            <form onSubmit={handleCreateRoom} className="card-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 21, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Rocket size={20} color="var(--accent-gold)" /> {t('createRoomTitle')}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {t('createRoomSubtitle')}
                  </p>
                </div>
                <button type="submit" className="btn-white" disabled={isCreating} style={{ padding: '12px 24px' }}>
                  {isCreating ? t('creatingRoom') : t('launchRoom')} <ArrowRight size={16} />
                </button>
              </div>

              <div className="studio-form-row" style={{ marginBottom: 22 }}>
                <label className="studio-field">
                  <span>{t('eventTitle')}</span>
                  <input
                    type="text"
                    className="studio-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={64}
                    required
                  />
                </label>

                <label className="studio-field">
                  <span>{t('customRoomCode')}</span>
                  <input
                    type="text"
                    className="studio-input"
                    placeholder={t('autoGeneratedPlaceholder')}
                    value={customRoomId}
                    onChange={(e) => setCustomRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    maxLength={48}
                  />
                </label>

                <label className="studio-field">
                  <span>{t('roomAdminPin')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="studio-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={4}
                      maxLength={64}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0 12px', borderRadius: 10 }}
                      onClick={() => setPassword(generateRandomPin())}
                      aria-label="Generate random PIN"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </label>

                <label className="studio-field">
                  <span>Event Mode</span>
                  <select
                    className="studio-input"
                    value={mode}
                    onChange={(e) => {
                      const nextMode = e.target.value;
                      setMode(nextMode);
                      if (nextMode === 'leaderboard' && teams.length < 3) {
                        addParticipant();
                      }
                    }}
                  >
                    <option value="versus">1v1 Versus Match</option>
                    <option value="leaderboard">Leaderboard (2–8 Players)</option>
                    <option value="wheel-only">Wheel Only / Raffle</option>
                  </select>
                </label>

                <label className="studio-field">
                  <span>Wheel Draw Rule</span>
                  <select
                    className="studio-input"
                    value={drawMode}
                    onChange={(e) => setDrawMode(e.target.value)}
                  >
                    <option value="eliminate">Eliminate Winner</option>
                    <option value="keep">Keep on Wheel</option>
                  </select>
                </label>

                <label className="studio-field">
                  <span>Overlay Theme</span>
                  <select
                    className="studio-input"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    {OVERLAY_THEMES.map((th) => (
                      <option key={th.id} value={th.id}>{th.name}</option>
                    ))}
                  </select>
                </label>

                {mode === 'versus' && (
                  <label className="studio-field">
                    <span>{t('matchFormat')}</span>
                    <select
                      className="studio-input"
                      value={bestOf}
                      onChange={(e) => setBestOf(Number(e.target.value))}
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

              {mode !== 'wheel-only' && (
                <div style={{ marginBottom: 22 }}>
                  {mode === 'leaderboard' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        Participants / Squads ({teams.length}/{MAX_LEADERBOARD_TEAMS})
                      </strong>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '7px 14px', fontSize: 13 }}
                        disabled={teams.length >= MAX_LEADERBOARD_TEAMS}
                        onClick={addParticipant}
                      >
                        <Plus size={14} /> Add Participant
                      </button>
                    </div>
                  )}

                  <div className="responsive-grid-2">
                    {(mode === 'versus' ? teams.slice(0, 2) : teams).map((team, idx) => (
                      <div key={team.id} className="card-panel-active" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                          <TeamAvatar
                            name={team.name}
                            logoUrl={team.logoUrl}
                            color={team.color}
                            textColor={team.textColor}
                            size={46}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {mode === 'versus'
                                ? (idx === 0 ? 'Left Side · Team A' : 'Right Side · Team B')
                                : `Participant #${idx + 1}`}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 900 }}>{team.name || 'TEAM'}</div>
                          </div>
                          <input
                            type="color"
                            aria-label={`${team.name} color`}
                            value={team.color}
                            onChange={(e) => updateTeamField(idx, 'color', e.target.value)}
                            style={{ marginLeft: 'auto', width: 42, height: 34, border: 'none', background: 'transparent', cursor: 'pointer' }}
                          />
                          {mode === 'leaderboard' && teams.length > 2 && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '6px 8px' }}
                              onClick={() => removeParticipant(idx)}
                              aria-label={`Remove ${team.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <input
                            type="text"
                            className="studio-input"
                            placeholder="Name"
                            value={team.name}
                            onChange={(e) => updateTeamField(idx, 'name', e.target.value)}
                            maxLength={24}
                          />
                          <input
                            type="text"
                            className="studio-input"
                            placeholder="Subtitle"
                            value={team.subtitle}
                            onChange={(e) => updateTeamField(idx, 'subtitle', e.target.value)}
                            maxLength={32}
                          />
                        </div>

                        <input
                          type="text"
                          className="studio-input"
                          placeholder="Logo URL (https://... — blank for monogram)"
                          value={team.logoUrl}
                          onChange={(e) => updateTeamField(idx, 'logoUrl', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-panel-active" style={{ padding: 18, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dices size={18} color="var(--accent-gold)" /> {t('wheelSegments')} ({items.length})
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: 13 }}
                      onClick={() => setShowBulkPaste((v) => !v)}
                    >
                      Bulk Paste
                    </button>
                    <input
                      type="text"
                      className="studio-input"
                      placeholder={t('newSegmentPlaceholder')}
                      value={newSegmentLabel}
                      onChange={(e) => setNewSegmentLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSegment();
                        }
                      }}
                      style={{ width: 200 }}
                    />
                    <button type="button" className="btn-secondary" style={{ padding: '8px 14px' }} onClick={addSegment}>
                      <Plus size={15} /> {t('add')}
                    </button>
                  </div>
                </div>

                {showBulkPaste && (
                  <div className="bulk-paste-box">
                    <textarea
                      className="studio-input"
                      rows={4}
                      placeholder="Paste one entry per line (or comma-separated) — up to 64 items..."
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn-white" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => handleBulkImport(true)}>
                        Replace Wheel
                      </button>
                      <button type="button" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => handleBulkImport(false)}>
                        Append to Wheel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item, idx) => (
                    <div key={item.id} className="segment-editor-row">
                      <input
                        type="color"
                        aria-label={`${item.label} color`}
                        value={item.color}
                        onChange={(e) => updateItemField(idx, 'color', e.target.value)}
                        style={{ width: 34, height: 34, border: 'none', background: 'transparent', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className="studio-input"
                        value={item.label}
                        onChange={(e) => updateItemField(idx, 'label', e.target.value)}
                        placeholder="Segment Label"
                        maxLength={48}
                      />
                      <input
                        type="text"
                        className="studio-input"
                        value={item.imageUrl || ''}
                        onChange={(e) => updateItemField(idx, 'imageUrl', e.target.value)}
                        placeholder="Optional https:// banner URL"
                      />
                      <select
                        className="studio-input"
                        aria-label={`${item.label} weight`}
                        value={item.weight || 1}
                        onChange={(e) => updateItemField(idx, 'weight', Number(e.target.value))}
                        style={{ width: 78 }}
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((w) => (
                          <option key={w} value={w}>{w}x</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '8px 10px' }}
                        onClick={() => removeSegment(idx)}
                        disabled={items.length <= 1}
                        aria-label={`Remove ${item.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {createError && (
                <div style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={14} color="var(--accent-gold)" /> {t('securityFooter')}
                </span>
                <button type="submit" className="btn-white" disabled={isCreating}>
                  {isCreating ? t('creatingRoom') : t('createAndLaunch')} <Rocket size={15} />
                </button>
              </div>
            </form>
          </TabsPanel>

          <TabsPanel value="join">
            <div className="card-panel" style={{ maxWidth: 640 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Open an Existing Room</h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 18 }}>
                Enter any room code (such as your custom event slug) to open its control panel or OBS browser sources.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="studio-input"
                  placeholder={t('roomCodePlaceholder')}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                />
                <button type="button" className="btn-white" onClick={() => handleJoinRoom('control')}>
                  {t('control')} <ArrowRight size={15} />
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleJoinRoom('roulette')}>
                  <Dices size={15} color="var(--accent-gold)" /> Roulette
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleJoinRoom('scoreboard')}>
                  <Trophy size={15} color="var(--accent-gold)" /> Scoreboard
                </button>
              </div>
            </div>
          </TabsPanel>
        </Tabs>

        {CLASSIC_PRESETS.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div className="card-panel" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TeamAvatar
                    name={CLASSIC_PRESETS[0].teams[0].name}
                    logoUrl={CLASSIC_PRESETS[0].teams[0].logoUrl}
                    color={CLASSIC_PRESETS[0].teams[0].color}
                    size={32}
                  />
                  <TeamAvatar
                    name={CLASSIC_PRESETS[0].teams[1].name}
                    logoUrl={CLASSIC_PRESETS[0].teams[1].logoUrl}
                    color={CLASSIC_PRESETS[0].teams[1].color}
                    size={32}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Classic Event Shortcut
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {CLASSIC_PRESETS[0].name}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => applyPreset(CLASSIC_PRESETS[0])}>
                  Load as Template
                </button>
                <button type="button" className="btn-white" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => navigateTo('/control')}>
                  <Sliders size={14} /> {t('openClassic')}
                </button>
                <a href="/roulette" target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }}>
                  <Dices size={14} />
                </a>
                <a href="/scoreboard" target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }}>
                  <Trophy size={14} />
                </a>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
