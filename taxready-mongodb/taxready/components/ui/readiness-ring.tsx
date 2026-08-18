"use client";

interface Segment {
  label: string;
  value: number; // 0-1 share of the ring
  color: string;
}

interface ReadinessRingProps {
  score: number;
  segments: Segment[];
  size?: number;
  label?: string;
}

// The ring is built from named segments (categorized / receipted / reviewed)
// rather than a single flat percentage — the score is decomposed the same
// way the "Compliance Readiness" section on the dashboard decomposes it,
// so this one visual is both the hero's signature element and an honest
// preview of the real feature.
export function ReadinessRing({ score, segments, size = 220, label = "Record readiness" }: ReadinessRingProps) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E4E4DE" strokeWidth={stroke} fill="none" />
        {segments.map((seg, i) => {
          const segLength = seg.value * circumference;
          const dashArray = `${segLength} ${circumference - segLength}`;
          const dashOffset = -offsetAcc;
          offsetAcc += segLength;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              fill="none"
              style={{ transition: "stroke-dasharray 700ms ease" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl text-ink numeral">{score}%</span>
        <span className="mt-1 text-xs text-ink/60">{label}</span>
      </div>
    </div>
  );
}
