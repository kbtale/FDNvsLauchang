import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { fixGameName } from '../lib/sync';

const SLICE_COLORS = [
  '#D99B26',
  '#0D9F67',
  '#C93232',
  '#16201C',
  '#0D9F67'
];

const GAME_IMAGE_MAP = {
  'FORTNITE': '/games/fortnitebanner.jpg',
  'CLASH ROYALE': '/games/clashroyalebanner.jpg',
  'COPA ROBLOX': '/games/robloxbanner.png',
  'COUNTER-STRIKE 2': '/games/counterstrikebanner.jpg',
  'COUNTER STRIKE': '/games/counterstrikebanner.jpg',
  'CS': '/games/counterstrikebanner.jpg',
  'FALL GUYS': '/games/fallguysbanner.jpg'
};

export default function RouletteWheel({
  remainingGames,
  isSpinning,
  winningIndex,
  spinSeed,
  onSpinEnd,
  showWinnerModal,
  activeGame,
  onCloseModal,
  size = 520
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isTicking, setIsTicking] = useState(false);
  const [activeLogoIndex, setActiveLogoIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const animRef = useRef(null);
  const prevSliceIndexRef = useRef(-1);
  const activeSpinSeedRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLogoIndex((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Object.entries(GAME_IMAGE_MAP).forEach(([gameKey, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setLoadedImages((prev) => ({ ...prev, [gameKey]: img }));
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = width / 2 - 14;
    const innerRadius = outerRadius - 26;

    ctx.clearRect(0, 0, width, height);

    if (!remainingGames || remainingGames.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#121917';
      ctx.fill();
      ctx.strokeStyle = '#d99b26';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡TODOS LOS JUEGOS JUGADOS!', centerX, centerY);
      return;
    }

    const normalizedGames = remainingGames.map(fixGameName);
    const numSlices = normalizedGames.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#080d0b';
    ctx.fill();
    ctx.strokeStyle = '#1e2b27';
    ctx.lineWidth = 18;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, outerRadius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#d99b26';
    ctx.lineWidth = 3;
    ctx.stroke();

    const pinCount = 20;
    for (let p = 0; p < pinCount; p++) {
      const pinAngle = (p * Math.PI * 2) / pinCount;
      const px = (outerRadius - 9) * Math.cos(pinAngle);
      const py = (outerRadius - 9) * Math.sin(pinAngle);
      
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#d99b26';
      ctx.fill();
      ctx.strokeStyle = '#080d0b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (let i = 0; i < numSlices; i++) {
      const rawGameName = normalizedGames[i];
      const gameName = fixGameName(rawGameName);
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      ctx.fill();

      const gameImg = loadedImages[gameName] || loadedImages[rawGameName] || loadedImages['CS'] || loadedImages['COUNTER STRIKE'];
      if (gameImg && gameImg.width > 0 && gameImg.height > 0) {
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.globalAlpha = 0.88;

        const dw = innerRadius * 1.5;
        const dh = innerRadius * 1.5;
        const dist = innerRadius * 0.55;

        const imgRatio = gameImg.width / gameImg.height;
        const destRatio = dw / dh;

        let sw, sh, sx, sy;
        if (imgRatio > destRatio) {
          sw = gameImg.height * destRatio;
          sh = gameImg.height;
          sx = (gameImg.width - sw) / 2;
          sy = 0;
        } else {
          sw = gameImg.width;
          sh = gameImg.width / destRatio;
          sx = 0;
          sy = (gameImg.height - sh) / 2;
        }

        ctx.drawImage(gameImg, sx, sy, sw, sh, dist - dw / 2, -dh / 2, dw, dh);
        ctx.globalAlpha = 1.0;
        ctx.restore();

        ctx.fillStyle = 'rgba(8, 12, 10, 0.35)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRadius, startAngle, endAngle);
      ctx.strokeStyle = '#080d0b';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const fontSize = gameName.length > 13 ? 13.5 : 16;
      const textOffset = gameName.length > 13 ? 14 : 22;
      ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeText(gameName, innerRadius - textOffset, 0);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(gameName, innerRadius - textOffset, 0);

      ctx.restore();
      ctx.restore();
    }

    ctx.restore();
  }, [remainingGames, rotation, size, loadedImages]);

  useEffect(() => {
    if (isSpinning && winningIndex !== null && winningIndex >= 0 && remainingGames.length > 0 && spinSeed) {
      if (activeSpinSeedRef.current === spinSeed) {
        return;
      }
      activeSpinSeedRef.current = spinSeed;

      const numSlices = remainingGames.length;
      const sliceDeg = 360 / numSlices;
      const targetSliceCenter = winningIndex * sliceDeg + sliceDeg / 2;
      const desiredPointerDeg = 270;
      const targetDeg = (desiredPointerDeg - targetSliceCenter + 360) % 360;
      
      const extraSpins = 360 * 7;
      const currentMod = rotation % 360;
      const finalRotation = rotation + extraSpins + (targetDeg - currentMod + 360) % 360;
      
      const startTime = performance.now();
      const duration = 5200;
      const startRotation = rotation;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          const easeOut = 1 - Math.pow(1 - progress, 4);
          const currentRot = startRotation + (finalRotation - startRotation) * easeOut;
          setRotation(currentRot);

          const currentSlice = Math.floor((((270 - currentRot) % 360 + 360) % 360) / sliceDeg);
          if (currentSlice !== prevSliceIndexRef.current) {
            prevSliceIndexRef.current = currentSlice;
            setIsTicking(true);
            setTimeout(() => setIsTicking(false), 50);
          }

          animRef.current = requestAnimationFrame(animate);
        } else {
          setRotation(finalRotation);
          if (onSpinEnd) {
            onSpinEnd();
          }
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      };

      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, winningIndex, spinSeed]);

  const displayWinner = fixGameName(activeGame);

  return (
    <div className="roulette-wrapper">
      <div className={`wheel-pointer ${isTicking ? 'wheel-pointer-tick' : ''}`} />
      
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px` }}
      />

      <div className="roulette-center-hub">
        <img
          src="/LOGO FDN.png"
          alt="FDN Logo"
          className={`hub-logo-img ${activeLogoIndex === 0 ? 'hub-logo-active' : 'hub-logo-hidden'}`}
        />
        <img
          src="/LOGO LAUTASHE.jpeg"
          alt="Lautashe Logo"
          className={`hub-logo-img ${activeLogoIndex === 1 ? 'hub-logo-active' : 'hub-logo-hidden'}`}
        />
      </div>

      {showWinnerModal && displayWinner && (
        <div className="winner-overlay-modal animate-pop">
          <div className="winner-card">
            <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#ffffff' }}>
              {displayWinner}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 700 }}>
              FDN VS LAUCHANG
            </p>
            {onCloseModal && (
              <button className="btn-white" onClick={onCloseModal}>
                Cerrar Resultado
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
