interface ProgressRingProps {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sub?: string;
}

/** Неоновое прогресс-кольцо в стиле Dark Premium (мокап №2) */
export function ProgressRing({
  progress,
  size = 64,
  stroke = 5,
  color = 'var(--cyan)',
  label,
  sub,
}: ProgressRingProps) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const gid = `rg-${color.replace(/[^a-z0-9]/gi, '')}-${size}`;

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
      {label && (
        <text
          x="50%" y={sub ? '46%' : '50%'}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.24} fontWeight="800"
          fill="var(--text-primary)"
          style={{ letterSpacing: '-0.02em' }}
        >
          {label}
        </text>
      )}
      {sub && (
        <text
          x="50%" y="66%"
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.13} fontWeight="600"
          fill="var(--text-tertiary)"
        >
          {sub}
        </text>
      )}
    </svg>
  );
}
