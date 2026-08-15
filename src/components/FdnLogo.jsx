import React from 'react';

export default function FdnLogo({ size = 64, className = "" }) {
  return (
    <img
      src="/LOGO FDN.png"
      alt="FDN Logo"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        borderRadius: '50%',
        display: 'block'
      }}
    />
  );
}
