const INITIAL_GAMES = ['FORTNITE', 'CLASH ROYALE', 'COPA ROBLOX', 'CS', 'FALL GUYS'];
const STORAGE_KEY = 'fdn_vs_lauchang_state_v1';
const CHANNEL_NAME = 'fdn_vs_lauchang_channel_v1';

export const getInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        remainingGames: parsed.remainingGames || INITIAL_GAMES,
        drawnGames: parsed.drawnGames || [],
        fdnScore: typeof parsed.fdnScore === 'number' ? parsed.fdnScore : 0,
        lauchangScore: typeof parsed.lauchangScore === 'number' ? parsed.lauchangScore : 0,
        activeGame: parsed.activeGame || null,
        isSpinning: false,
        winningIndex: null,
        showWinnerModal: false,
        spinSeed: 0,
        currentRound: typeof parsed.currentRound === 'number' ? parsed.currentRound : 1,
        maxRounds: typeof parsed.maxRounds === 'number' ? parsed.maxRounds : 5
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
    spinSeed: 0,
    currentRound: 1,
    maxRounds: 5
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
