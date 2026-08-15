import React, { useState, useEffect } from 'react';
import Hub from './views/Hub';
import ControlPanel from './views/ControlPanel';
import RouletteOverlay from './views/RouletteOverlay';
import ScoreboardOverlay from './views/ScoreboardOverlay';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const cleanPath = currentPath.replace(/\/$/, '') || '/';

  if (cleanPath === '/control') {
    return <ControlPanel />;
  }

  if (cleanPath === '/roulette') {
    return <RouletteOverlay />;
  }

  if (cleanPath === '/scoreboard') {
    return <ScoreboardOverlay />;
  }

  return <Hub />;
}
