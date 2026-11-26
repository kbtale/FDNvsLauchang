import React, { useState, useEffect } from 'react';
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastRegion,
  ToastTitle
} from '@ui-sdk/react/toast';
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
  const isOverlay = route.view === 'roulette' || route.view === 'scoreboard';

  let page;
  if (route.view === 'control') {
    page = <ControlPanel roomId={route.roomId} legacyRoute={route.legacyRoute} />;
  } else if (route.view === 'roulette') {
    page = <RouletteOverlay roomId={route.roomId} />;
  } else if (route.view === 'scoreboard') {
    page = <ScoreboardOverlay roomId={route.roomId} />;
  } else {
    page = <Hub />;
  }

  return (
    <>
      {page}
      {!isOverlay && (
        <ToastRegion side="bottom" align="end">
          {() => (
            <Toast className="studio-toast">
              <div className="studio-toast-body">
                <ToastTitle className="studio-toast-title" />
                <ToastDescription className="studio-toast-desc" />
              </div>
              <ToastAction className="btn-secondary studio-toast-action" />
            </Toast>
          )}
        </ToastRegion>
      )}
    </>
  );
}
