import React, { useState, useEffect } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import RouletteWheel from '../components/RouletteWheel';

export default function RouletteOverlay() {
  const [state, setState] = useState(getInitialState);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      setState(newState);
    });
    return () => engine.destroy();
  }, []);

  return (
    <div className="overlay-container transparent-bg">
      <RouletteWheel
        remainingGames={state.remainingGames}
        wheelGames={state.wheelGames}
        wheelRotation={state.wheelRotation}
        isSpinning={state.isSpinning}
        winningIndex={state.winningIndex}
        spinSeed={state.spinSeed}
        showWinnerModal={state.showWinnerModal}
        activeGame={state.activeGame}
        size={520}
      />
    </div>
  );
}
