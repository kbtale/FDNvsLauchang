const INITIAL_GAMES = ['FORTNITE', 'CLASH ROYALE', 'COPA ROBLOX', 'COUNTER-STRIKE 2', 'FALL GUYS'];
const STORAGE_KEY = 'fdn_vs_lauchang_state_v5';
const CHANNEL_NAME = 'fdn_vs_lauchang_channel_v5';
const SYNC_API_ENDPOINT = '/api/sync';

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
        isSpinning: !!parsed.isSpinning,
        winningIndex: typeof parsed.winningIndex === 'number' ? parsed.winningIndex : null,
        showWinnerModal: !!parsed.showWinnerModal,
        spinSeed: parsed.spinSeed || 0,
        spinInitiator: parsed.spinInitiator || null,
        updatedAt: parsed.updatedAt || 0
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
    spinInitiator: null,
    updatedAt: 0
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
    this.pollInterval = null;
    this.clientId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    
    const initial = getInitialState();
    this.lastUpdatedAt = initial.updatedAt || 0;
    this.lastStateHash = this.computeHash(initial);

    this.handleMessage = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.remainingGames) {
        this.processIncomingPayload(event.data, false);
      }
    };

    if (this.channel) {
      this.channel.onmessage = this.handleMessage;
    }

    this.handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue);
          if (newState && newState.remainingGames) {
            this.processIncomingPayload(newState, false);
          }
        } catch (e) {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorage);
      this.initCloudPolling();
    }
  }

  computeHash(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const { updatedAt, ...coreState } = payload;
    return JSON.stringify(coreState);
  }

  processIncomingPayload(payload, shouldPersist = true) {
    if (!payload || typeof payload !== 'object' || !payload.remainingGames) return;

    const incomingUpdatedAt = payload.updatedAt || 0;
    
    // Strict timestamp check: Ignore stale states received from lagging serverless instances
    if (incomingUpdatedAt < this.lastUpdatedAt) {
      return;
    }

    const hash = this.computeHash(payload);
    if (hash === this.lastStateHash && incomingUpdatedAt === this.lastUpdatedAt) {
      return;
    }

    this.lastStateHash = hash;
    this.lastUpdatedAt = Math.max(this.lastUpdatedAt, incomingUpdatedAt);

    const cleaned = {
      ...payload,
      remainingGames: (payload.remainingGames || []).map(fixGameName),
      drawnGames: (payload.drawnGames || []).map(fixGameName),
      activeGame: fixGameName(payload.activeGame),
      updatedAt: this.lastUpdatedAt
    };

    if (shouldPersist) {
      saveState(cleaned);
    }

    if (this.onStateUpdate) {
      this.onStateUpdate(cleaned);
    }
  }

  initCloudPolling() {
    const fetchLatest = () => {
      if (typeof fetch === 'undefined') return;
      fetch(`${SYNC_API_ENDPOINT}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.remainingGames) {
            this.processIncomingPayload(data, true);
          }
        })
        .catch(() => {});
    };

    fetchLatest();
    this.pollInterval = setInterval(fetchLatest, 800);
  }

  broadcast(state) {
    const now = Date.now();
    const newTimestamp = Math.max(now, this.lastUpdatedAt + 1);
    this.lastUpdatedAt = newTimestamp;

    const cleanedState = {
      ...state,
      remainingGames: (state.remainingGames || []).map(fixGameName),
      drawnGames: (state.drawnGames || []).map(fixGameName),
      activeGame: fixGameName(state.activeGame),
      updatedAt: newTimestamp
    };

    this.lastStateHash = this.computeHash(cleanedState);
    saveState(cleanedState);

    if (this.channel) {
      try {
        this.channel.postMessage(cleanedState);
      } catch (e) {}
    }

    if (typeof fetch !== 'undefined') {
      fetch(SYNC_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(cleanedState)
      }).catch(() => {});
    }

    if (this.onStateUpdate) {
      this.onStateUpdate(cleanedState);
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorage);
    }
  }
}

export { INITIAL_GAMES, fixGameName };

