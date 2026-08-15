const INITIAL_GAMES = ['FORTNITE', 'CLASH ROYALE', 'COPA ROBLOX', 'COUNTER-STRIKE 2', 'FALL GUYS'];
const STORAGE_KEY = 'fdn_vs_lauchang_state_v3';
const CHANNEL_NAME = 'fdn_vs_lauchang_channel_v3';

const fixGameName = (name) => {
  if (!name) return name;
  const upper = String(name).trim().toUpperCase();
  if (upper === 'CS' || upper === 'COUNTER STRIKE' || upper === 'COUNTER STRIKE 2' || upper === 'COUNTER-STRIKE' || upper === 'COUNTER-STRIKE 2') {
    return 'COUNTER-STRIKE 2';
  }
  return name;
};

export const getInitialState = () => {
  try {
    ['fdn_vs_lauchang_state_v1', 'fdn_vs_lauchang_state_v2'].forEach(k => localStorage.removeItem(k));
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      let remaining = (parsed.remainingGames || INITIAL_GAMES).map(fixGameName);
      let drawn = (parsed.drawnGames || []).map(fixGameName);
      let active = fixGameName(parsed.activeGame);

      return {
        remainingGames: remaining,
        drawnGames: drawn,
        fdnScore: typeof parsed.fdnScore === 'number' ? parsed.fdnScore : 0,
        lauchangScore: typeof parsed.lauchangScore === 'number' ? parsed.lauchangScore : 0,
        activeGame: active || null,
        isSpinning: false,
        winningIndex: null,
        showWinnerModal: false,
        spinSeed: 0
      };
    }
  } catch (e) {}

  return {
    remainingGames: [...INITIAL_GAMES],
    drawnGames: [],
    fdnScore: 0,
    lauchangScore: 0,
    activeGame: null,
    isSpinning: false,
    winningIndex: null,
    showWinnerModal: false,
    spinSeed: 0
  };
};

export const saveState = (state) => {
  try {
    const cleanedState = {
      ...state,
      remainingGames: (state.remainingGames || []).map(fixGameName),
      drawnGames: (state.drawnGames || []).map(fixGameName),
      activeGame: fixGameName(state.activeGame)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedState));
  } catch (e) {}
};

export class SyncEngine {
  constructor(onStateUpdate) {
    this.onStateUpdate = onStateUpdate;
    this.channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

    this.handleMessage = (event) => {
      if (event.data && this.onStateUpdate) {
        const cleaned = {
          ...event.data,
          remainingGames: (event.data.remainingGames || []).map(fixGameName),
          drawnGames: (event.data.drawnGames || []).map(fixGameName),
          activeGame: fixGameName(event.data.activeGame)
        };
        this.onStateUpdate(cleaned);
      }
    };

    if (this.channel) {
      this.channel.onmessage = this.handleMessage;
    }

    this.handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue);
          const cleaned = {
            ...newState,
            remainingGames: (newState.remainingGames || []).map(fixGameName),
            drawnGames: (newState.drawnGames || []).map(fixGameName),
            activeGame: fixGameName(newState.activeGame)
          };
          if (this.onStateUpdate) {
            this.onStateUpdate(cleaned);
          }
        } catch (e) {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorage);
    }
  }

  broadcast(state) {
    const cleanedState = {
      ...state,
      remainingGames: (state.remainingGames || []).map(fixGameName),
      drawnGames: (state.drawnGames || []).map(fixGameName),
      activeGame: fixGameName(state.activeGame)
    };
    saveState(cleanedState);
    if (this.channel) {
      this.channel.postMessage(cleanedState);
    }
    if (this.onStateUpdate) {
      this.onStateUpdate(cleanedState);
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorage);
    }
  }
}

export { INITIAL_GAMES, fixGameName };
