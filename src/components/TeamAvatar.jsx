import React, { useEffect, useState } from 'react';
import { getTeamMonogram, pickContrastingTextColor, sanitizeHexColor, sanitizeMediaUrl } from '../lib/roomSchema';

export default function TeamAvatar({
  name = 'TEAM',
  logoUrl = '',
  color = '#0d9f67',
  textColor,
  size = 56,
  className = ''
}) {
  const safeUrl = sanitizeMediaUrl(logoUrl);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [safeUrl]);

  const bg = sanitizeHexColor(color, '#0d9f67');
  const fg = textColor ? sanitizeHexColor(textColor, pickContrastingTextColor(bg)) : pickContrastingTextColor(bg);
  const monogram = getTeamMonogram(name);

  if (safeUrl && !imgFailed) {
    return (
      <img
        src={safeUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        className={className}
        onError={() => setImgFailed(true)}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: '50%',
          display: 'block',
          flexShrink: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '2px solid rgba(255, 255, 255, 0.18)'
        }}
      />
    );
  }

  return (
    <div
      className={className}
      aria-label={`${name} avatar`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${bg} 0%, #0b120f 140%)`,
        color: fg,
        border: '2px solid rgba(255, 255, 255, 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: Math.max(12, Math.round(size * 0.36)),
        letterSpacing: -0.5,
        flexShrink: 0,
        boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.18)'
      }}
    >
      {monogram}
    </div>
  );
}
