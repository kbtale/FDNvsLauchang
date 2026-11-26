import React, { useState, useEffect, useMemo } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import { DEFAULT_ROOM_ID } from '../lib/roomSchema';
import RouletteWheel from '../components/RouletteWheel';

export default function RouletteOverlay({ roomId = DEFAULT_ROOM_ID }) {
  const [state, setState] = useState(() => getInitialState(roomId));

  const queryOptions = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const soundParam = params.get('sound');
    const sizeParam = Number(params.get('size'));
    const themeParam = params.get('theme');
    return {
      soundOverride: soundParam === '0' ? false : soundParam === '1' ? true : null,
      size: Number.isFinite(sizeParam) && sizeParam >= 240 && sizeParam <= 1000 ? sizeParam : 520,
      themeOverride: themeParam || null
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
    <div className="overlay-container transparent-bg">
      <RouletteWheel
        items={state.items}
        teams={state.teams}
        title={state.title}
        theme={queryOptions.themeOverride || state.theme}
        accentColor={state.accentColor}
        spin={state.spin}
        showWinnerModal={state.showWinnerModal}
        activeItem={state.activeItem}
        soundEnabled={soundEnabled}
        size={queryOptions.size}
      />
    </div>
  );
}
