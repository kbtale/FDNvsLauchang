import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const SLICE_COLORS = [
  '#0D9F67',
  '#172621',
  '#D99B26',
  '#B82E2E',
  '#165A6E'
];

const GAME_IMAGE_MAP = {
  'FORTNITE': '/games/fortnitebanner.jpg',
  'CLASH ROYALE': '/games/clashroyalebanner.jpg',
  'COPA ROBLOX': '/games/robloxbanner.png',
  'COUNTER-STRIKE 2': '/games/counterstrike.webp',
  'FALL GUYS': '/games/fallguysbanner.jpg'
};

export default function RouletteWheel({
  remainingGames,
  isSpinning,
  winningIndex,
  onSpinEnd,
  showWinnerModal,
  activeGame,
  onCloseModal,
  size = 500
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isTicking, setIsTicking] = useState(false);
  const [activeLogoIndex, setActiveLogoIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const animRef = useRef(null);
  const prevSliceIndexRef = useRef(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLogoIndex((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Object.entries(GAME_IMAGE_MAP).forEach(([game, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setLoadedImages((prev) => ({ ...prev, [game]: img }));
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
    const outerRadius = width / 2 - 12;
    const innerRadius = outerRadius - 22;

    ctx.clearRect(0, 0, width, height);

    if (!remainingGames || remainingGames.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#121917';
      ctx.fill();
      ctx.strokeStyle = '#0d9f67';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡TODOS LOS JUEGOS JUGADOS!', centerX, centerY);
      return;
    }

    const numSlices = remainingGames.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0f0d';
    ctx.fill();
    ctx.strokeStyle = '#22332c';
    ctx.lineWidth = 16;
    ctx.stroke();

    const pinCount = 18;
    for (let p = 0; p < pinCount; p++) {
      const pinAngle = (p * Math.PI * 2) / pinCount;
      const px = centerX + (outerRadius - 8) * Math.cos(pinAngle);
      const py = centerY + (outerRadius - 8) * Math.sin(pinAngle);
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d99b26';
      ctx.fill();
      ctx.strokeStyle = '#0a0f0d';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    for (let i = 0; i < numSlices; i++) {
      const gameName = remainingGames[i];
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

      const gameImg = loadedImages[gameName];
      if (gameImg) {
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.globalAlpha = 0.85;
        const imgW = innerRadius * 1.2;
        const imgH = innerRadius * 0.8;
        ctx.drawImage(gameImg, 30, -imgH / 2, imgW, imgH);
        ctx.globalAlpha = 1.0;
        ctx.restore();

        ctx.fillStyle = 'rgba(10, 15, 13, 0.4)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRadius, startAngle, endAngle);
      ctx.strokeStyle = '#0a0f0d';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);

      ctx.font = '900 16px "Plus Jakarta Sans", sans-serif';
      const textWidth = ctx.measureText(gameName).width;

      ctx.fillStyle = 'rgba(8, 12, 10, 0.85)';
      ctx.beginPath();
      ctx.roundRect(innerRadius - textWidth - 36, -15, textWidth + 24, 30, 15);
      ctx.fill();
      ctx.strokeStyle = '#0d9f67';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeText(gameName, innerRadius - 24, 0);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(gameName, innerRadius - 24, 0);

      ctx.restore();
      ctx.restore();
    }

    ctx.restore();
  }, [remainingGames, rotation, size, loadedImages]);

  useEffect(() => {
    if (isSpinning && winningIndex !== null && winningIndex >= 0 && remainingGames.length > 0) {
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

      animRef.current = requestAnimationFrame(animate);

      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }
  }, [isSpinning, winningIndex]);

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

      {showWinnerModal && activeGame && (
        <div className="winner-overlay-modal animate-pop">
          <div className="winner-card">
            <div className="pill-badge badge-green" style={{ marginBottom: 16 }}>
              ¡JUEGO SELECCIONADO!
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              {activeGame}
            </h1>
            <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 28, fontWeight: 600 }}>
              FDN VS LAUCHANG
            </p>
            {onCloseModal && (
              <button className="btn-white" onClick={onCloseModal}>
                Continuar Evento
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
