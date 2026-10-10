import { GC, ZG, type Formula } from '@/lib/formulas';
import { U, r } from '@/lib/units';

export default function Gauge({ f, val, outU }: { f: Formula; val: number; outU: string }) {
  const g = ZG[f.id];
  if (!g) return null;
  const span = g.max - g.min;
  const edges = [g.min, ...g.z.map((z) => z[0])];
  const pct = Math.max(0, Math.min(100, ((val - g.min) / span) * 100));
  const marks = [g.min, ...g.z.slice(0, -1).map((z) => z[0]), g.max];
  return (
    <>
      <div className="gauge" aria-hidden="true">
        <div className="track">
          {g.z.map(([to, c], i) => (
            <i key={to} style={{ width: `${((to - edges[i]) / span) * 100}%`, background: GC[c] }} />
          ))}
        </div>
        <div className="pin" style={{ left: `${pct}%` }} />
      </div>
      <div className="ticks" aria-hidden="true">
        {marks.map((m) => (
          <span key={m} style={{ left: `${((m - g.min) / span) * 100}%` }}>
            {r(m / U[f.out][outU], 1)}
          </span>
        ))}
      </div>
    </>
  );
}
