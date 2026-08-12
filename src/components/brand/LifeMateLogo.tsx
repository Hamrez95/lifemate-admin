type LifeMateLogoProps = {
  compact?: boolean;
};

export function LifeMateLogo({ compact = false }: LifeMateLogoProps) {
  return (
    <div className="brand" aria-label="LifeMate">
      <svg className="brand__mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M18 10c-5 0-9 4-9 9s4 9 9 9h6" />
        <path d="M30 38c5 0 9-4 9-9s-4-9-9-9h-6" />
        <path d="M17 30 30 17" />
        <path d="M14 34 34 14" opacity="0.42" />
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
