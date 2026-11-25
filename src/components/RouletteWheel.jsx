import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { fixGameName } from '../lib/sync';
import {
  DEFAULT_SPIN_DURATION_MS,
  SLICE_COLORS,
  computeTargetRotation,
  getSliceIndexAtPointer,
  interpolateSpinRotation,
  resolveSliceImage
} from '../lib/wheel';
import { playTickSound, playVictoryFanfare } from '../lib/audio';

export default function RouletteWheel({
  remainingGames,
  wheelGames,
  wheelRotation = 0,
  startRotation = 0,
  targetRotation = 0,
  spinStartedAt = 0,
  spinDurationMs = DEFAULT_SPIN_DURATION_MS,
  isSpinning,
  winningIndex,
  spinSeed,
  onSpinEnd,
  showWinnerModal,
  activeGame,
  soundEnabled = true,
  size = 520
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(wheelRotation || 0);
  const [isTicking, setIsTicking] = useState(false);
  const [activeLogoIndex, setActiveLogoIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const animRef = useRef(null);
  const tickTimerRef = useRef(null);
  const prevSliceIndexRef = useRef(-1);
  const celebratedSeedRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const displayedGames = useMemo(() => {
    const source = wheelGames && wheelGames.length > 0 ? wheelGames : remainingGames || [];
    return source.map((entry) => (typeof entry === 'string' ? fixGameName(entry) : entry));
  }, [wheelGames, remainingGames]);

  useEffect(() => {
    if (!isSpinning && typeof wheelRotation === 'number') {
      setRotation(wheelRotation);
    }
  }, [wheelRotation, isSpinning]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLogoIndex((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const urls = new Set();
    displayedGames.forEach((item) => {
      const url = resolveSliceImage(item);
      if (url) {
        urls.add(url);
      }
    });

    urls.forEach((src) => {
      if (loadedImages[src]) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        setLoadedImages((prev) => (prev[src] ? prev : { ...prev, [src]: img }));
      };
    });
  }, [displayedGames, loadedImages]);

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

    if (!displayedGames || displayedGames.length === 0) {
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

    const numSlices = displayedGames.length;
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
      const entry = displayedGames[i];
      const gameName = typeof entry === 'string' ? fixGameName(entry) : String(entry.label || '');
      const sliceColor = (typeof entry === 'object' && entry.color) || SLICE_COLORS[i % SLICE_COLORS.length];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.clip();

      const grad = ctx.createRadialGradient(0, 0, 18, 0, 0, innerRadius);
      grad.addColorStop(0, '#0f1714');
      grad.addColorStop(0.28, sliceColor);
      grad.addColorStop(1, sliceColor);
      ctx.fillStyle = grad;
      ctx.fill();

      const imageUrl = resolveSliceImage(entry);
      const gameImg = imageUrl ? loadedImages[imageUrl] : null;
      if (gameImg && gameImg.width > 0 && gameImg.height > 0) {
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.globalAlpha = 0.88;

        const dw = innerRadius * 1.5;
        const dh = innerRadius * 1.5;
        const dist = innerRadius * 0.55;

        const imgRatio = gameImg.width / gameImg.height;
        const destRatio = dw / dh;

        let sw;
        let sh;
        let sx;
        let sy;
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
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius * 0.86, startAngle, endAngle);
        ctx.lineTo(0, 0);
        ctx.closePath();
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
  }, [displayedGames, rotation, size, loadedImages]);

  useEffect(() => {
    if (!isSpinning || winningIndex === null || winningIndex < 0 || displayedGames.length === 0 || !spinSeed) {
      return undefined;
    }

    const numSlices = displayedGames.length;
    const effectiveDuration = spinDurationMs > 0 ? spinDurationMs : DEFAULT_SPIN_DURATION_MS;
    const effectiveStart = spinStartedAt > 0 ? spinStartedAt : Date.now();
    const effectiveStartRot = typeof startRotation === 'number' ? startRotation : rotation;
    const effectiveTargetRot = typeof targetRotation === 'number' && targetRotation > effectiveStartRot
      ? targetRotation
      : computeTargetRotation({
          startRotation: effectiveStartRot,
          winningIndex,
          sliceCount: numSlices
        });

    let cancelled = false;

    const triggerCelebration = () => {
      if (celebratedSeedRef.current === spinSeed) return;
      celebratedSeedRef.current = spinSeed;
      playVictoryFanfare(soundEnabledRef.current);
      if (onSpinEnd) {
        onSpinEnd();
      }
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    };

    const animate = () => {
      if (cancelled) return;
      const frame = interpolateSpinRotation({
        startRotation: effectiveStartRot,
        targetRotation: effectiveTargetRot,
        spinStartedAt: effectiveStart,
        spinDurationMs: effectiveDuration,
        now: Date.now()
      });

      setRotation(frame.rotation);

      const currentSlice = getSliceIndexAtPointer(frame.rotation, numSlices);
      if (currentSlice !== prevSliceIndexRef.current && !frame.done) {
        prevSliceIndexRef.current = currentSlice;
        setIsTicking(true);
        playTickSound(soundEnabledRef.current);
        if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
        tickTimerRef.current = setTimeout(() => {
          setIsTicking(false);
          tickTimerRef.current = null;
        }, 55);
      }

      if (!frame.done) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        animRef.current = null;
        setIsTicking(false);
        triggerCelebration();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      if (tickTimerRef.current) {
        clearTimeout(tickTimerRef.current);
        tickTimerRef.current = null;
      }
    };
  }, [isSpinning, winningIndex, spinSeed, spinStartedAt, spinDurationMs, startRotation, targetRotation, displayedGames.length]);

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
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 0, fontWeight: 700 }}>
              FDN VS LAUCHANG
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
