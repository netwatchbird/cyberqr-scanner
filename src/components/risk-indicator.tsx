'use client';

import { scoreToLabel } from '@/lib/risk-calculator';

interface RiskIndicatorProps {
  score: number;
  variant: 'safe' | 'suspicious' | 'malicious';
}

const variantStyles = {
  safe: {
    stroke: '#10b981',
    glow: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    bg: '#d1fae5',
  },
  suspicious: {
    stroke: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)',
    text: '#d97706',
    bg: '#fef3c7',
  },
  malicious: {
    stroke: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.3)',
    text: '#dc2626',
    bg: '#fee2e2',
  },
};

export function RiskIndicator({ score, variant }: RiskIndicatorProps) {
  const style = variantStyles[variant];
  const label = scoreToLabel(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Indicador circular SVG */}
      <div className="relative" style={{ filter: `drop-shadow(0 0 12px ${style.glow})` }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Fondo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          {/* Progreso */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={style.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
          />
        </svg>
        {/* Texto central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: style.text }}>
            {score}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            de 100
          </span>
        </div>
      </div>

      {/* Badge de clasificación */}
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
        style={{
          color: style.text,
          backgroundColor: style.bg,
          border: `1px solid ${style.stroke}`,
        }}
      >
        {label}
      </span>
    </div>
  );
}
