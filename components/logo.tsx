export function Logo({ className = "", width = 44, height = 44 }: { className?: string; width?: number; height?: number }) {
  return (
    <svg 
      className={className} 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#059669" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Base Circle */}
      <circle cx="50" cy="50" r="46" fill="url(#logoGrad)" filter="url(#logoShadow)" />

      {/* Leaf / Compass Shape Interstitial */}
      <path 
        d="M50 18C44 26 30 35 30 50C30 65 44 74 50 82C56 74 70 65 70 50C70 35 56 26 50 18Z" 
        fill="rgba(255, 255, 255, 0.15)" 
      />

      {/* Needle / Leaf Top Half */}
      <path 
        d="M50 20C46 30 36 38 36 50H64C64 38 54 30 50 20Z" 
        fill="white" 
      />
      
      {/* Needle / Leaf Bottom Half with semi-transparency for 3D effect */}
      <path 
        d="M36 50C36 62 46 70 50 80C54 70 64 62 64 50H36Z" 
        fill="rgba(255, 255, 255, 0.65)" 
      />

      {/* Subtle details — needle pivot point */}
      <circle cx="50" cy="50" r="4" fill="#047857" />
      <circle cx="50" cy="50" r="2" fill="white" />

      {/* Inner Ring */}
      <circle cx="50" cy="50" r="32" stroke="white" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 6" />
    </svg>
  );
}
