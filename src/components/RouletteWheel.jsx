import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const SLICE_COLORS = [
  '#0D9F67',
  '#12332B',
  '#194439',
  '#091210',
  '#0E2A22'
];

export default function RouletteWheel({
  remainingGames,
  isSpinning,
  winningIndex,
  onSpinEnd,
  showWinnerModal,
  activeGame,
  onCloseModal,
  size = 440
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    if (!remainingGames || remainingGames.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0d2620';
      ctx.fill();
      ctx.strokeStyle = '#0d9f67';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡TODOS LOS JUEGOS JUGADOS!', centerX, centerY);
      return;
    }

    const numSlices = remainingGames.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#091210';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(remainingGames[i], radius - 24, 6);
      ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#091210';
    ctx.fill();
    ctx.strokeStyle = '#0d9f67';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', centerX, centerY);
  }, [remainingGames, rotation, size]);

  useEffect(() => {
    if (isSpinning && winningIndex !== null && winningIndex >= 0 && remainingGames.length > 0) {
      const numSlices = remainingGames.length;
      const sliceDeg = 360 / numSlices;
      const targetSliceCenter = winningIndex * sliceDeg + sliceDeg / 2;
      const desiredPointerDeg = 270;
      const targetDeg = (desiredPointerDeg - targetSliceCenter + 360) % 360;
      
      const extraSpins = 360 * 6;
      const currentMod = rotation % 360;
      const finalRotation = rotation + extraSpins + (targetDeg - currentMod + 360) % 360;
      
      const startTime = performance.now();
      const duration = 4500;
      const startRotation = rotation;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentRot = startRotation + (finalRotation - startRotation) * easeOut;
          setRotation(currentRot);
          animRef.current = requestAnimationFrame(animate);
        } else {
          setRotation(finalRotation);
          if (onSpinEnd) {
            onSpinEnd();
          }
          confetti({
            particleCount: 80,
            spread: 70,
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
      <div className="wheel-pointer" />
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {showWinnerModal && activeGame && (
        <div className="winner-overlay-modal animate-pop">
          <div className="winner-card">
            <div className="pill-badge badge-dark" style={{ marginBottom: 16 }}>
              ¡JUEGO SELECCIONADO!
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              {activeGame}
            </h1>
            <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 28, fontWeight: 600 }}>
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
