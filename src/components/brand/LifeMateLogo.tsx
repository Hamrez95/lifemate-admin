type LifeMateLogoProps = {
  compact?: boolean;
  hero?: boolean;
};

export function LifeMateLogo({ compact = false, hero = false }: LifeMateLogoProps) {
  return (
    <div className="brand" data-hero={hero} role="img" aria-label="LifeMate">
      <svg className="brand__mark" viewBox="0 0 96 64" aria-hidden="true">
        <defs>
          <linearGradient id="lifemate-gradient" x1="8" y1="12" x2="88" y2="52">
            <stop offset="0" stopColor="#43b9ff" />
            <stop offset="0.48" stopColor="#74e3e7" />
            <stop offset="1" stopColor="#70e1bd" />
          </linearGradient>
          <linearGradient id="lifemate-highlight" x1="10" y1="8" x2="82" y2="42">
            <stop offset="0" stopColor="white" stopOpacity="0.8" />
            <stop offset="0.62" stopColor="white" stopOpacity="0.12" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="lifemate-shadow" x="-20%" y="-30%" width="140%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#1988a3" floodOpacity="0.2" />
          </filter>
        </defs>
        <path
          d="M13 32c0-12 9-21 21-21 8 0 14 4 20 10l9 9c5 5 9 8 14 8 5 0 9-3 9-7 0-5-4-8-9-8-5 0-9 3-14 8L45 49c-5 5-11 8-18 8C16 57 8 48 8 38c0-9 6-17 15-20"
          fill="none"
          stroke="url(#lifemate-gradient)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lifemate-shadow)"
        />
        <path
          d="M17 25c4-6 10-9 17-9 7 0 12 3 18 9l10 10"
          fill="none"
          stroke="url(#lifemate-highlight)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <div className="brand__copy">
          <strong>LifeMate</strong>
          <span>Command Center</span>
        </div>
      )}
    </div>
  );
}
