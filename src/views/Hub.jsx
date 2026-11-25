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
  ArrowRight
} from 'lucide-react';
import TeamAvatar from '../components/TeamAvatar';
import {
  DEFAULT_ROOM_ID,
  ROOM_PRESETS,
  getRoomUrls,
  getTokenStorageKey,
  pickContrastingTextColor,
  sanitizeMediaUrl
} from '../lib/roomSchema';
import { SLICE_COLORS } from '../lib/wheel';
import { navigateTo } from '../App';

function generateRandomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function Hub() {
  const defaultPreset = ROOM_PRESETS[1];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);
  const [title, setTitle] = useState(defaultPreset.title);
  const [customRoomId, setCustomRoomId] = useState('');
  const [password, setPassword] = useState(() => generateRandomPin());
  const [bestOf, setBestOf] = useState(defaultPreset.bestOf);
  const [teams, setTeams] = useState(() => defaultPreset.teams.map((t) => ({ ...t })));
  const [items, setItems] = useState(() => defaultPreset.items.map((i) => ({ ...i })));
  const [newSegmentLabel, setNewSegmentLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  const applyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setTitle(preset.title);
    setBestOf(preset.bestOf);
    setTeams(preset.teams.map((t) => ({ ...t })));
    setItems(preset.items.map((i) => ({ ...i })));
    setCreateError('');
    setCreatedRoom(null);
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
          title,
          roomId: customRoomId.trim() || undefined,
          password: password.trim(),
          bestOf: Number(bestOf) || 0,
          teams: teams.map((t) => ({
            ...t,
            logoUrl: sanitizeMediaUrl(t.logoUrl)
          })),
          items: items.map((i) => ({
            ...i,
            imageUrl: sanitizeMediaUrl(i.imageUrl)
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
    <div className="admin-page-bg" style={{ padding: '40px 20px 64px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
          <div>
            <div className="pill-badge badge-dark" style={{ marginBottom: 10 }}>
              <Sparkles size={14} color="var(--accent-gold)" /> ARENAOBS STUDIO
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, marginBottom: 6 }}>
              Multi-Room OBS Roulette & Scoreboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
              Launch isolated transparent OBS browser sources for any match, tournament, or variety stream in seconds.
            </p>
          </div>

          <div className="card-panel" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="studio-input"
              placeholder="Room code (e.g. friday-cup)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ width: 200 }}
            />
            <button type="button" className="btn-secondary" style={{ padding: '9px 14px' }} onClick={() => handleJoinRoom('control')}>
              Control <ArrowRight size={14} />
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '9px 12px' }} onClick={() => handleJoinRoom('roulette')} title="Open Roulette Overlay">
              <Dices size={15} color="var(--accent-gold)" />
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '9px 12px' }} onClick={() => handleJoinRoom('scoreboard')} title="Open Scoreboard Overlay">
              <Trophy size={15} color="var(--accent-gold)" />
            </button>
          </div>
        </header>

        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
              1-Click Presets
            </h2>
          </div>

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
                        <Sliders size={13} /> Open Classic
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
                      {isSelected ? 'Selected template' : 'Load template'}
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
                  ROOM READY · {createdRoom.roomId}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
                  Your OBS Studio Room is Live
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Save your Admin PIN (<strong style={{ color: '#ffffff' }}>{createdRoom.pin}</strong>) to log back in later.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-white"
                  onClick={() => navigateTo(createdRoom.urls.control)}
                >
                  <Sliders size={16} /> Open Control Panel
                </button>
                <a href={createdRoom.urls.roulette} target="_blank" rel="noreferrer" className="btn-secondary">
                  Roulette Overlay <ExternalLink size={14} />
                </a>
                <a href={createdRoom.urls.scoreboard} target="_blank" rel="noreferrer" className="btn-secondary">
                  Scoreboard Overlay <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateRoom} className="card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Rocket size={22} color="var(--accent-gold)" /> Create Custom OBS Room
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Customize teams, colors, logos, Best-of-N format, and weighted roulette segments.
              </p>
            </div>
            <button type="submit" className="btn-white" disabled={isCreating} style={{ padding: '12px 24px' }}>
              {isCreating ? 'Creating Room...' : 'Launch Room'} <ArrowRight size={16} />
            </button>
          </div>

          <div className="studio-form-row" style={{ marginBottom: 24 }}>
            <label className="studio-field">
              <span>Event Title</span>
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
              <span>Custom Room Code (optional)</span>
              <input
                type="text"
                className="studio-input"
                placeholder="auto-generated if empty"
                value={customRoomId}
                onChange={(e) => setCustomRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                maxLength={48}
              />
            </label>

            <label className="studio-field">
              <span>Room Admin PIN</span>
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
                  title="Generate random PIN"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </label>

            <label className="studio-field">
              <span>Match Format</span>
              <select
                className="studio-input"
                value={bestOf}
                onChange={(e) => setBestOf(Number(e.target.value))}
              >
                <option value={0}>Freeplay (No cap)</option>
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
                <option value={7}>Best of 7</option>
                <option value={9}>Best of 9</option>
              </select>
            </label>
          </div>

          <div className="responsive-grid-2" style={{ marginBottom: 24 }}>
            {teams.map((team, idx) => (
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
                      {idx === 0 ? 'Left Side · Team A' : 'Right Side · Team B'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{team.name || 'TEAM'}</div>
                  </div>
                  <input
                    type="color"
                    value={team.color}
                    onChange={(e) => updateTeamField(idx, 'color', e.target.value)}
                    style={{ marginLeft: 'auto', width: 42, height: 34, border: 'none', background: 'transparent', cursor: 'pointer' }}
                    title="Team Color"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    className="studio-input"
                    placeholder="Team Name"
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
                  placeholder="Logo URL (https://... or /LOGO FDN.png — blank for monogram)"
                  value={team.logoUrl}
                  onChange={(e) => updateTeamField(idx, 'logoUrl', e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="card-panel-active" style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dices size={18} color="var(--accent-gold)" /> Wheel Segments ({items.length})
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="studio-input"
                  placeholder="New game or challenge..."
                  value={newSegmentLabel}
                  onChange={(e) => setNewSegmentLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSegment();
                    }
                  }}
                  style={{ width: 220 }}
                />
                <button type="button" className="btn-secondary" style={{ padding: '8px 14px' }} onClick={addSegment}>
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, idx) => (
                <div key={item.id || idx} className="segment-editor-row">
                  <input
                    type="color"
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
                    value={item.weight || 1}
                    onChange={(e) => updateItemField(idx, 'weight', Number(e.target.value))}
                    style={{ width: 78 }}
                    title="Slice weight"
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
                    title="Remove segment"
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
              <KeyRound size={14} color="var(--accent-gold)" /> Room PIN is salted & hashed with scrypt; control API is HMAC-SHA256 authenticated.
            </span>
            <button type="submit" className="btn-white" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create & Launch Room'} <Rocket size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
