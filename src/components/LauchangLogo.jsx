import React from 'react';

export default function LauchangLogo({ size = 64, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="100" cy="100" r="90" stroke="#E5A93C" strokeWidth="8" fill="#091210" />
      <path d="M 60 50 L 85 50 L 85 130 L 140 130 L 140 150 L 60 150 Z" fill="#ffffff" />
      <path d="M 140 60 C 140 60 100 50 85 75 C 70 100 130 105 130 130 C 130 155 80 150 70 140 L 70 120 C 70 120 105 135 115 120 C 125 105 75 100 75 75 C 75 50 125 45 140 60 Z" fill="#E5A93C" />
      <rect x="55" y="155" width="90" height="22" rx="4" fill="#E5A93C" />
      <text x="100" y="171" textAnchor="middle" fill="#091210" fontSize="13" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">LAUCHANG</text>
    </svg>
  );
}
