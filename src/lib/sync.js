import {
  DEFAULT_ROOM_ID,
  fixLegacyGameName,
  normalizeRoomState
} from './roomSchema';

const INITIAL_GAMES = ['FORTNITE', 'CLASH ROYALE', 'COPA ROBLOX', 'COUNTER-STRIKE 2', 'FALL GUYS'];
const SYNC_API_ENDPOINT = '/api/sync';

function getStorageKey(roomId) {
  return `arenaobs_room_state:${roomId || DEFAULT_ROOM_ID}`;
}

function getChannelName(roomId) {
  return `arenaobs_room_channel:${roomId || DEFAULT_ROOM_ID}`;
}

export const getInitialState = (roomId = DEFAULT_ROOM_ID) => {
  try {
    const saved = localStorage.getItem(getStorageKey(roomId));
    if (saved) {
      return normalizeRoomState(JSON.parse(saved), roomId);
    }
    if (roomId === DEFAULT_ROOM_ID) {
      const legacy = localStorage.getItem('fdn_vs_lauchang_state_v5');
      if (legacy) {
        return normalizeRoomState(JSON.parse(legacy), roomId);
      }
    }
  } catch {}
  return normalizeRoomState({}, roomId);
};

export const saveState = (state, roomId = DEFAULT_ROOM_ID) => {
  try {
    const normalized = normalizeRoomState(state, roomId);
    localStorage.setItem(getStorageKey(roomId), JSON.stringify(normalized));
  } catch {}
};

export class SyncEngine {
  constructor(onStateUpdate, options = {}) {
    this.onStateUpdate = onStateUpdate;
    this.roomId = options.roomId || DEFAULT_ROOM_ID;
    this.getAuthToken = typeof options.getAuthToken === 'function' ? options.getAuthToken : null;
    this.onUnauthorized = typeof options.onUnauthorized === 'function' ? options.onUnauthorized : null;
    this.onMetaUpdate = typeof options.onMetaUpdate === 'function' ? options.onMetaUpdate : null;
    this.storageKey = getStorageKey(this.roomId);
    this.channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel(getChannelName(this.roomId))
      : null;
    this.pollInterval = null;
    this.lastEtag = null;
    this.clientId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);

    const initial = getInitialState(this.roomId);
    this.lastUpdatedAt = initial.updatedAt || 0;
    this.lastStateHash = this.computeHash(initial);

    this.handleMessage = (event) => {
      if (event.data && typeof event.data === 'object') {
        this.processIncomingPayload(event.data, false);
      }
    };

    if (this.channel) {
      this.channel.onmessage = this.handleMessage;
    }

    this.handleStorage = (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed && typeof parsed === 'object') {
            this.processIncomingPayload(parsed, false);
          }
        } catch {}
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
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) return;
    if (payload.unchanged) return;

    const incomingUpdatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : 0;
    if (incomingUpdatedAt > 0 && incomingUpdatedAt < this.lastUpdatedAt) {
      return;
    }

    const normalized = normalizeRoomState(payload, this.roomId);
    const hash = this.computeHash(normalized);
    if (hash === this.lastStateHash) {
      this.lastUpdatedAt = Math.max(this.lastUpdatedAt, incomingUpdatedAt);
      return;
    }

    this.lastStateHash = hash;
    this.lastUpdatedAt = Math.max(this.lastUpdatedAt, incomingUpdatedAt);
    const finalState = { ...normalized, updatedAt: this.lastUpdatedAt };

    if (shouldPersist) {
      saveState(finalState, this.roomId);
    }

    if (this.onStateUpdate) {
      this.onStateUpdate(finalState);
    }
  }

  initCloudPolling() {
    const fetchLatest = () => {
      if (typeof fetch === 'undefined') return;
      const roomParam = encodeURIComponent(this.roomId);
      const headers = { Pragma: 'no-cache', 'Cache-Control': 'no-cache' };
      if (this.lastEtag) {
        headers['If-None-Match'] = this.lastEtag;
      }

      fetch(`${SYNC_API_ENDPOINT}?room=${roomParam}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers
      })
        .then(async (res) => {
          const persistence = res.headers?.get?.('x-arenaobs-persistence') || null;
          const etag = res.headers?.get?.('etag') || null;
          if (etag) {
            this.lastEtag = etag;
          }
          if (this.onMetaUpdate) {
            this.onMetaUpdate({ connected: res.ok || res.status === 304, persistence });
          }
          if (res.status === 304 || !res.ok) {
            return;
          }
          const data = await res.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            this.processIncomingPayload(data, true);
          }
        })
        .catch(() => {
          if (this.onMetaUpdate) {
            this.onMetaUpdate({ connected: false, persistence: null });
          }
        });
    };

    fetchLatest();
    this.pollInterval = setInterval(fetchLatest, 800);
  }

  broadcast(state) {
    const now = Date.now();
    const newTimestamp = Math.max(now, this.lastUpdatedAt + 1);
    this.lastUpdatedAt = newTimestamp;

    const normalized = normalizeRoomState(
      { ...state, roomId: this.roomId, updatedAt: newTimestamp },
      this.roomId
    );
    normalized.updatedAt = newTimestamp;

    this.lastStateHash = this.computeHash(normalized);
    this.lastEtag = null;
    saveState(normalized, this.roomId);

    if (this.channel) {
      try {
        this.channel.postMessage(normalized);
      } catch {}
    }

    if (typeof fetch !== 'undefined') {
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      };
      const token = this.getAuthToken ? this.getAuthToken() : null;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const roomParam = encodeURIComponent(this.roomId);
      fetch(`${SYNC_API_ENDPOINT}?room=${roomParam}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(normalized)
      })
        .then(async (res) => {
          const persistence = res.headers?.get?.('x-arenaobs-persistence') || null;
          if ((res.status === 401 || res.status === 403) && this.onUnauthorized) {
            this.onUnauthorized();
            return;
          }
          if (this.onMetaUpdate) {
            this.onMetaUpdate({ connected: res.ok, persistence });
          }
        })
        .catch(() => {
          if (this.onMetaUpdate) {
            this.onMetaUpdate({ connected: false, persistence: null });
          }
        });
    }

    if (this.onStateUpdate) {
      this.onStateUpdate(normalized);
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

export { INITIAL_GAMES, fixLegacyGameName as fixGameName };
