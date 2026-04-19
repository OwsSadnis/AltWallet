// Animated half-circle risk gauge.
// Arc path: M20 100 A80 80 0 0 1 180 100
// Max dasharray: 251.3. Animated over 1200ms with cubic ease-out.
import { useEffect, useRef, useState } from "react";

interface Props {
  score: number;
  maxScoreCap?: number; // e.g. 80 for XRP/SUI
}

const MAX_DASH = 251.3;
const DURATION = 1400;

export function RiskGauge({ score, maxScoreCap = 100 }: Props) {
  const [animated, setAnimated] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const target = Math.min(score, maxScoreCap);
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(target * eased);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [score, maxScoreCap]);

  const dash = (animated / 100) * MAX_DASH;

  return (
    <div className="aw-gauge-wrap">
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="aw-gauge-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#E5484D" />
            <stop offset="50%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#1D9E75" />
          </linearGradient>
        </defs>
        {/* background arc */}
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          stroke="#1a1a1a"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        {/* animated arc */}
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          stroke="url(#aw-gauge-grad)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${MAX_DASH}`}
          style={{ filter: "drop-shadow(0 0 12px rgba(29,158,117,0.25))" }}
        />
        {/* tick marks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const angle = Math.PI - (t / 100) * Math.PI;
          const x1 = 100 + Math.cos(angle) * 70;
          const y1 = 100 - Math.sin(angle) * 70;
          const x2 = 100 + Math.cos(angle) * 64;
          const y2 = 100 - Math.sin(angle) * 64;
          return (
            <line
              key={t}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#2a2a2a"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
}
