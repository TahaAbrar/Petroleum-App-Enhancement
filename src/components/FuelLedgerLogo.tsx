type FuelLedgerLogoProps = {
  className?: string
  animated?: boolean
  title?: string
}

/** Brand mark: banknotes + dollar + growth arrow (no white box). */
export function FuelLedgerLogo({
  className = '',
  animated = false,
  title = 'FuelLedger',
}: FuelLedgerLogoProps) {
  return (
    <svg
      className={`fl-logo ${animated ? 'fl-logo--animated' : ''} ${className}`.trim()}
      viewBox="0 0 120 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      {/* Soft ambient glow */}
      <ellipse
        className="fl-logo__glow"
        cx="58"
        cy="58"
        rx="42"
        ry="36"
        fill="url(#flGlow)"
        opacity="0.55"
      />

      {/* Back note — navy */}
      <g className="fl-logo__note fl-logo__note--back">
        <rect
          x="18"
          y="28"
          width="52"
          height="58"
          rx="6"
          transform="rotate(-18 44 57)"
          fill="#1A2F4B"
        />
        <path
          d="M28 40c6-2 14-2 20 0M30 50c5-1.5 12-1.5 18 0"
          stroke="#2F4A6B"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
          transform="rotate(-18 44 57)"
        />
      </g>

      {/* Mid note — darker outline feel */}
      <g className="fl-logo__note fl-logo__note--mid">
        <rect
          x="30"
          y="24"
          width="52"
          height="58"
          rx="6"
          transform="rotate(-6 56 53)"
          fill="#243B55"
          opacity="0.95"
        />
      </g>

      {/* Front note — lime */}
      <g className="fl-logo__note fl-logo__note--front">
        <rect x="42" y="22" width="54" height="60" rx="7" fill="#5DBB46" />
        <rect
          x="46"
          y="26"
          width="46"
          height="52"
          rx="5"
          stroke="#7AD15F"
          strokeWidth="2"
          fill="none"
          opacity="0.55"
        />
        <circle className="fl-logo__badge" cx="69" cy="52" r="14" fill="#4AA833" />
        <circle cx="69" cy="52" r="11.5" fill="#5DBB46" />
        <text
          className="fl-logo__dollar"
          x="69"
          y="57.5"
          textAnchor="middle"
          fontFamily="Plus Jakarta Sans, Arial, sans-serif"
          fontWeight="800"
          fontSize="16"
          fill="#FFFFFF"
        >
          $
        </text>
      </g>

      {/* Growth arrow — orange */}
      <g className="fl-logo__arrow">
        <path
          className="fl-logo__arrow-path"
          d="M22 88 C34 86, 48 72, 62 52 C70 40, 78 30, 90 22"
          stroke="#F38B20"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="fl-logo__arrow-head"
          d="M78 18 L98 16 L90 34 Z"
          fill="#F38B20"
        />
      </g>

      <defs>
        <radialGradient id="flGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5C518" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#F38B20" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#F38B20" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export default FuelLedgerLogo
