const INITIAL_GAMES = ['FORTNITE', 'CLASH ROYALE', 'COPA ROBLOX', 'COUNTER STRIKE', 'FALL GUYS'];
const STORAGE_KEY = 'fdn_vs_lauchang_state_v1';
const CHANNEL_NAME = 'fdn_vs_lauchang_channel_v1';

export const getInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      let remaining = (parsed.remainingGames || INITIAL_GAMES).map(g => g === 'CS' ? 'COUNTER STRIKE' : g);
      let drawn = (parsed.drawnGames || []).map(g => g === 'CS' ? 'COUNTER STRIKE' : g);
      let active = parsed.activeGame === 'CS' ? 'COUNTER STRIKE' : parsed.activeGame;

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
        this.onStateUpdate(event.data);
      }
    };

    if (this.channel) {
      this.channel.onmessage = this.handleMessage;
    }

    this.handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue);
          if (this.onStateUpdate) {
            this.onStateUpdate(newState);
          }
        } catch (e) {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorage);
    }
  }

  broadcast(state) {
    saveState(state);
    if (this.channel) {
      this.channel.postMessage(state);
    }
    if (this.onStateUpdate) {
      this.onStateUpdate(state);
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

export { INITIAL_GAMES };
