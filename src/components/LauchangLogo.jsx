import React from 'react';

export default function LauchangLogo({ size = 64, className = "" }) {
  return (
    <img
      src="/LOGO LAUTASHE.jpeg"
      alt="Lauchang Logo"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'cover',
        borderRadius: '50%',
        display: 'block'
      }}
    />
  );
}
