import React, { useState, useEffect } from 'react';
import Hub from './views/Hub';
import ControlPanel from './views/ControlPanel';
import RouletteOverlay from './views/RouletteOverlay';
import ScoreboardOverlay from './views/ScoreboardOverlay';
import { DEFAULT_ROOM_ID } from './lib/roomSchema';

export function navigateTo(path) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function parseRoute(pathname) {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';

  if (cleanPath === '/control') {
    return { view: 'control', roomId: DEFAULT_ROOM_ID, legacyRoute: true };
  }
  if (cleanPath === '/roulette') {
    return { view: 'roulette', roomId: DEFAULT_ROOM_ID, legacyRoute: true };
  }
  if (cleanPath === '/scoreboard') {
    return { view: 'scoreboard', roomId: DEFAULT_ROOM_ID, legacyRoute: true };
  }

  const roomMatch = cleanPath.match(/^\/room\/([a-zA-Z0-9_-]{1,64})\/(control|roulette|scoreboard)$/);
  if (roomMatch) {
    return {
      view: roomMatch[2],
      roomId: roomMatch[1].toLowerCase(),
      legacyRoute: false
    };
  }

  return { view: 'hub', roomId: DEFAULT_ROOM_ID, legacyRoute: false };
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const route = parseRoute(currentPath);

  if (route.view === 'control') {
    return <ControlPanel roomId={route.roomId} legacyRoute={route.legacyRoute} />;
  }
  if (route.view === 'roulette') {
    return <RouletteOverlay roomId={route.roomId} />;
  }
  if (route.view === 'scoreboard') {
    return <ScoreboardOverlay roomId={route.roomId} />;
  }

  return <Hub />;
}
