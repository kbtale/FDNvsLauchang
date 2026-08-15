import React from 'react';

export default function FdnLogo({ size = 64, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="100" cy="100" r="90" stroke="#0D9F67" strokeWidth="8" fill="#091210" />
      <path d="M 25 80 Q 70 70 85 95 C 70 115 50 115 25 80 Z" fill="#0D9F67" />
      <path d="M 175 80 Q 130 70 115 95 C 130 115 150 115 175 80 Z" fill="#0D9F67" />
      <path d="M 50 100 Q 100 60 150 100 Q 140 145 100 155 Q 60 145 50 100 Z" fill="#060C0A" stroke="#0D9F67" strokeWidth="5" />
      <ellipse cx="75" cy="100" rx="16" ry="10" fill="#0D9F67" transform="rotate(-15 75 100)" />
      <ellipse cx="125" cy="100" rx="16" ry="10" fill="#0D9F67" transform="rotate(15 125 100)" />
      <rect x="65" y="130" width="70" height="24" rx="6" fill="#0D9F67" />
      <text x="100" y="147" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">FDN</text>
    </svg>
  );
}
