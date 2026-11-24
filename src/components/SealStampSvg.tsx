import React from 'react';

interface SealStampSvgProps {
  text: string;
  size?: number;
  variant?: 'vermilion' | 'gold' | 'ghost';
  className?: string;
}

/**
 * Traditional Chinese 2x2 vertical seal engraving SVG (右起竖排：第1、2字在右列，第3、4字在左列)
 */
export const SealStampSvg: React.FC<SealStampSvgProps> = ({
  text,
  size = 64,
  variant = 'vermilion',
  className = '',
}) => {
  const chars = Array.from(text.slice(0, 4));
  const c1 = chars[0] || '赣';
  const c2 = chars[1] || '鄱';
  const c3 = chars[2] || '珍';
  const c4 = chars[3] || '藏';

  const strokeColor =
    variant === 'vermilion' ? '#B93A2E' : variant === 'gold' ? '#C9A465' : 'rgba(201,164,101,0.28)';
  const fillBg =
    variant === 'vermilion'
      ? 'rgba(185, 58, 46, 0.12)'
      : variant === 'gold'
      ? 'rgba(201, 164, 101, 0.08)'
      : 'transparent';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={`seal-stamp-svg ${className}`}
      aria-label={`印章：${text}`}
    >
      <rect
        x="4"
        y="4"
        width="72"
        height="72"
        rx="6"
        fill={fillBg}
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeDasharray={variant === 'ghost' ? '5 4' : undefined}
      />
      <rect
        x="9.5"
        y="9.5"
        width="61"
        height="61"
        rx="3"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.1"
        opacity="0.7"
      />
      <line x1="40" y1="12" x2="40" y2="68" stroke={strokeColor} strokeWidth="0.9" opacity="0.45" />
      <g
        fill={strokeColor}
        fontFamily="'Noto Serif SC', 'STSong', 'SimSun', serif"
        fontWeight="700"
        fontSize="21"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {/* Traditional right-to-left top-to-bottom seal reading order */}
        <text x="55" y="27">{c1}</text>
        <text x="55" y="54">{c2}</text>
        <text x="25" y="27">{c3}</text>
        <text x="25" y="54">{c4}</text>
      </g>
    </svg>
  );
};
