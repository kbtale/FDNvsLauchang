import React, { useState, useEffect } from 'react';
import { SyncEngine, getInitialState } from '../lib/sync';
import RouletteWheel from '../components/RouletteWheel';

export default function RouletteOverlay() {
  const [state, setState] = useState(getInitialState);
  const [syncEngine, setSyncEngine] = useState(null);

  useEffect(() => {
    const engine = new SyncEngine((newState) => {
      setState(newState);
    });
    setSyncEngine(engine);
    return () => engine.destroy();
  }, []);

  const handleCloseModal = () => {
    if (!syncEngine) return;
    const newState = {
      ...state,
      showWinnerModal: false
    };
    syncEngine.broadcast(newState);
  };

  return (
    <div className="overlay-container transparent-bg">
      <RouletteWheel
        remainingGames={state.remainingGames}
        isSpinning={state.isSpinning}
        winningIndex={state.winningIndex}
        spinSeed={state.spinSeed}
        showWinnerModal={state.showWinnerModal}
        activeGame={state.activeGame}
        onCloseModal={handleCloseModal}
        size={520}
      />
    </div>
  );
}
