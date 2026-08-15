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

  const handleSpinEnd = () => {
    if (!syncEngine || state.winningIndex === null || !state.remainingGames || !state.remainingGames[state.winningIndex]) return;
    
    const selected = state.remainingGames[state.winningIndex];
    const newRemaining = state.remainingGames.filter((_, idx) => idx !== state.winningIndex);
    const newDrawn = state.drawnGames.includes(selected) ? state.drawnGames : [...state.drawnGames, selected];

    const newState = {
      ...state,
      isSpinning: false,
      winningIndex: null,
      activeGame: selected,
      remainingGames: newRemaining,
      drawnGames: newDrawn,
      showWinnerModal: true
    };
    syncEngine.broadcast(newState);
  };

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
        onSpinEnd={handleSpinEnd}
        showWinnerModal={state.showWinnerModal}
        activeGame={state.activeGame}
        onCloseModal={handleCloseModal}
        size={520}
      />
    </div>
  );
}
