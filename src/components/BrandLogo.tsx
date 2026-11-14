import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, size = 'md' }) => {
  const iconDim = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 select-none">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDim} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="evolvixGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#evolvixGrad)" />
        <path
          d="M13 12H27L24.5 16.5H17.5L16.5 18.8H24L21.8 23H15.5L14.5 25.5H26.5L24 30H10.5L13 12Z"
          fill="#FFFFFF"
        />
        <path d="M26 11L30 15L25 18.5" stroke="#CFFAFE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span className={`${textSize} font-bold tracking-tight text-[#0F172A] whitespace-nowrap`}>
          EVOLVIX <span className="text-[#4F46E5]">AI</span>
        </span>
      )}
    </div>
  );
};
