import { nairaShort } from "@/lib/format";

type Bar = { label: string; value: number; sub?: number; tip: string };

/** Simple responsive bar chart drawn as SVG. `sub` draws a darker part inside the bar (e.g. paid). */
export function BarChart({ bars, height = 200, subLabel, mainLabel }: { bars: Bar[]; height?: number; subLabel?: string; mainLabel?: string }) {
  const W = 640, H = height, top = 22, bottom = 24;
  const max = Math.max(1, ...bars.map((b) => Math.max(b.value, b.sub ?? 0)));
  const step = W / Math.max(1, bars.length);
  const bw = Math.max(4, Math.min(40, step * 0.62));
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const every = Math.ceil(bars.length / 8);
  return (
    <div>
      {(subLabel || mainLabel) && (
        <div className="mb-2 flex gap-4 text-xs text-ink-muted">
          {subLabel && <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-brand-500 align-middle" />{subLabel}</span>}
          {mainLabel && <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/70 align-middle" />{mainLabel}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Bar chart">
        <defs>
          <linearGradient id="gMain" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e39b2d" stopOpacity=".85" /><stop offset="1" stopColor="#e39b2d" stopOpacity=".45" /></linearGradient>
          <linearGradient id="gSub" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2f9e6e" /><stop offset="1" stopColor="#2f9e6e" stopOpacity=".7" /></linearGradient>
        </defs>
        {[0.5, 1].map((t) => (
          <g key={t}>
            <line x1={0} x2={W} y1={y(max * t)} y2={y(max * t)} stroke="#ebe6db" />
            <text x={0} y={y(max * t) - 4} fontSize={11} fill="#8a8478">{nairaShort(max * t)}</text>
          </g>
        ))}
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} stroke="#ddd6c8" />
        {bars.map((b, i) => {
          const x = i * step + (step - bw) / 2;
          return (
            <g key={i}>
              <title>{b.tip}</title>
              <rect x={i * step} y={top} width={step} height={H - top - bottom} fill="transparent" />
              {b.value > 0 && <rect x={x} y={y(b.value)} width={bw} height={H - bottom - y(b.value)} rx={Math.min(5, bw / 3)} fill="url(#gMain)" />}
              {(b.sub ?? 0) > 0 && <rect x={x + bw * 0.25} y={y(b.sub!)} width={bw * 0.5} height={H - bottom - y(b.sub!)} rx={Math.min(5, bw / 3)} fill="url(#gSub)" />}
              {i % every === 0 && <text x={i * step + step / 2} y={H - 6} fontSize={11} textAnchor="middle" fill="#8a8478">{b.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
