'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  amplitude: number; // 0..1
  label: string;
  accent?: string; // tailwind color hex or name
  bars?: number;
};

// Lightweight pseudo-spectrum animation driven by amplitude
export default function SpectrumVisualizer({
  amplitude,
  label,
  accent = '#9B62FF', // brand-purple
  bars = 48
}: Props) {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: bars }, () => 0));
  const raf = useRef<number | null>(null);
  const phases = useMemo(() => Array.from({ length: bars }, (_, i) => Math.random() * Math.PI * 2 + i * 0.123), [bars]);
  const speeds = useMemo(() => Array.from({ length: bars }, () => 0.8 + Math.random() * 1.6), [bars]);

  useEffect(() => {
    let t = 0;
    const tick = () => {
      t += 0.016; // ~60fps
      const target = new Array(bars);
      for (let i = 0; i < bars; i++) {
        const x = i / (bars - 1);
        const midCurve = Math.sin(Math.PI * x) ** 1.2; // bell
        const wobble = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(phases[i] + t * speeds[i]));
        const env = Math.min(1, Math.max(0, amplitude));
        target[i] = Math.min(1, midCurve * wobble * (0.2 + env * 1.1));
      }
      setLevels((prev) => prev.map((p, i) => p + (target[i] - p) * 0.25));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [amplitude, bars, phases, speeds]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
        <span className="tracking-wide">{label}</span>
      </div>
      <div className="h-24 w-full grid" style={{ gridTemplateColumns: `repeat(${bars}, minmax(0, 1fr))`, gap: '2px' }}>
        {levels.map((h, i) => (
          <div key={i} className="relative bg-transparent">
            <div
              className="absolute bottom-0 w-full rounded-sm"
              style={{
                height: `${Math.max(2, Math.floor(h * 96))}px`,
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}66 60%, ${accent}22 100%)`,
                boxShadow: `0 0 8px ${accent}33`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
