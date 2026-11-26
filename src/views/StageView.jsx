import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SyncEngine, getInitialState } from '../lib/sync';
import { DEFAULT_ROOM_ID } from '../lib/roomSchema';
import RouletteWheel from '../components/RouletteWheel';
import { ScoreboardGraphic } from './ScoreboardOverlay';

export default function StageView({ roomId = DEFAULT_ROOM_ID }) {
  const [state, setState] = useState(() => getInitialState(roomId));

  const queryOptions = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const soundParam = params.get('sound');
    return {
      soundOverride: soundParam === '0' ? false : soundParam === '1' ? true : null
    };
  }, []);

  useEffect(() => {
    setState(getInitialState(roomId));
    const engine = new SyncEngine(
      (newState) => {
        setState(newState);
      },
      { roomId }
    );
    return () => engine.destroy();
  }, [roomId]);

  const soundEnabled = queryOptions.soundOverride !== null
    ? queryOptions.soundOverride
    : state.soundEnabled !== false;

  return (
    <div className="stage-screen">
      <header className="stage-header">
        <span className="pill-badge badge-dark">
          <Sparkles size={14} color="var(--accent-gold)" /> ARENAOBS LIVE STAGE
        </span>
        <h1 className="stage-title">{state.title}</h1>
      </header>

      <main className={`stage-main ${state.mode === 'leaderboard' ? 'stage-main-split' : ''}`}>
        <div className="stage-wheel-col">
          <RouletteWheel
            items={state.items}
            teams={state.teams}
            title={state.title}
            spin={state.spin}
            showWinnerModal={state.showWinnerModal}
            activeItem={state.activeItem}
            soundEnabled={soundEnabled}
            size={state.mode === 'leaderboard' ? 460 : 500}
          />
        </div>

        <div className="stage-board-col">
          <ScoreboardGraphic state={state} />
        </div>
      </main>

      <footer className="stage-footer">
        <span>ROOM · {roomId.toUpperCase()}</span>
        <span>{state.items.length} SEGMENTS ON WHEEL</span>
      </footer>
    </div>
  );
}
