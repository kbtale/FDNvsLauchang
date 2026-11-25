import React, { useState, useEffect, useMemo } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import RouletteWheel from '../components/RouletteWheel';

export default function RouletteOverlay() {
  const [state, setState] = useState(getInitialState);

  const queryOptions = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const soundParam = params.get('sound');
    const sizeParam = Number(params.get('size'));
    return {
      soundOverride: soundParam === '0' ? false : soundParam === '1' ? true : null,
      size: Number.isFinite(sizeParam) && sizeParam >= 240 && sizeParam <= 1000 ? sizeParam : 520
    };
  }, []);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      setState(newState);
    });
    return () => engine.destroy();
  }, []);

  const soundEnabled = queryOptions.soundOverride !== null
    ? queryOptions.soundOverride
    : state.soundEnabled !== false;

  return (
    <div className="overlay-container transparent-bg">
      <RouletteWheel
        remainingGames={state.remainingGames}
        wheelGames={state.wheelGames}
        wheelRotation={state.wheelRotation}
        startRotation={state.startRotation}
        targetRotation={state.targetRotation}
        spinStartedAt={state.spinStartedAt}
        spinDurationMs={state.spinDurationMs}
        isSpinning={state.isSpinning}
        winningIndex={state.winningIndex}
        spinSeed={state.spinSeed}
        showWinnerModal={state.showWinnerModal}
        activeGame={state.activeGame}
        soundEnabled={soundEnabled}
        size={queryOptions.size}
      />
    </div>
  );
}
