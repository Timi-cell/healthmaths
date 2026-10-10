"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { HU, type Formula } from "@/lib/formulas";
import { U, r } from "@/lib/units";
import Gauge from "./Gauge";
import type { Entry } from "@/lib/store";

const unitOf = (
  units: Record<string, string>,
  id: string,
  d: string,
  u?: string,
) => units[id] ?? u ?? Object.keys(U[d])[0];

// Animates a number towards its target value.
function useCount(to: number, dp: number) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const a = from.current;
    const t0 = performance.now();
    let id = 0;
    const step = (t: number) => {
      const k = reduce ? 1 : Math.min(1, (t - t0) / 500);
      const cur = a + (to - a) * (1 - (1 - k) ** 3);
      from.current = cur;
      setV(cur);
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return r(v, dp);
}

type Seed = { vals: Record<string, string>; units: Record<string, string> };
type Props = {
  f: Formula;
  seed?: Seed | null;
  onResult: (e: Omit<Entry, "id" | "at">) => void;
  onBack: () => void;
};

export default function Calculator({ f, seed, onResult, onBack }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(seed?.vals ?? {});
  const [units, setUnits] = useState<Record<string, string>>(seed?.units ?? {});
  const [pick, setPick] = useState<string | null>(null);

  // Read inputs -> convert to base units -> validate -> run the formula.
  const calc = useMemo(() => {
    const v: Record<string, number> = {};
    for (const i of f.in) {
      const raw = vals[i.id];
      if (i.o) {
        v[i.id] = Math.max(0, i.o.indexOf(raw ?? i.o[0]));
        continue;
      }
      if (raw === undefined || raw === "") return {};
      const d = i.d ?? "";
      const u = unitOf(units, i.id, d, i.u);
      const k = U[d][u];
      const x = parseFloat(raw) * k;
      if (Number.isNaN(x)) return {};
      if (x < (i.min ?? -Infinity) || x > (i.max ?? Infinity))
        return {
          err: `${i.l} should be between ${r((i.min ?? 0) / k, 2)} and ${r((i.max ?? 0) / k, 2)} ${u}.`,
        };
      v[i.id] = x;
    }
    const res = f.f(v);
    return "err" in res ? { err: res.err } : { res };
  }, [f, vals, units]);

  const res = calc.res;
  const unitMap = U[f.out] ?? {};
  const outs = Object.keys(unitMap);
  const outU = pick && outs.includes(pick) ? pick : (outs[0] ?? "");
  const k = outU ? (unitMap[outU] ?? 1) : 1;
  const dp =
    f.out === "ca" && outU === "mmol/L"
      ? 2
      : (f.dg ?? (["time", "press", "ratio", "crcl"].includes(f.out) ? 0 : 1));
  const shown = useCount(res ? res.val / k : 0, dp);
  const text = res && outU ? `${r(res.val / k, dp)} ${outU}` : "";

  // Save to history once the user stops typing.
  useEffect(() => {
    if (!text || Object.keys(vals).length === 0) return;
    const id = setTimeout(
      () => onResult({ fid: f.id, n: f.n, t: text, vals, units }),
      1500,
    );
    return () => clearTimeout(id);
  }, [text, f.id, f.n, vals, units, onResult]);

  const reset = () => {
    setVals({});
    setUnits({});
    setPick(null);
  };

  return (
    <>
      <section
        className="calc"
        style={{ "--h": HU[f.s] } as CSSProperties}
        aria-live="polite"
      >
        <span className="sys">{f.s}</span>
        <h2>{f.n}</h2>
        <p className="desc">{f.d}</p>

        {f.in.map((i) => (
          <div className="field" key={i.id}>
            <label htmlFor={`f_${i.id}`}>{i.l}</label>
            {i.o ? (
              <select
                className="sel"
                id={`f_${i.id}`}
                value={vals[i.id] ?? i.o[0]}
                onChange={(e) => setVals({ ...vals, [i.id]: e.target.value })}
              >
                {i.o.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <div className="row">
                <input
                  id={`f_${i.id}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="0"
                  value={vals[i.id] ?? ""}
                  onChange={(e) => setVals({ ...vals, [i.id]: e.target.value })}
                />
                <select
                  aria-label={`${i.l} unit`}
                  value={unitOf(units, i.id, i.d ?? "", i.u)}
                  onChange={(e) =>
                    setUnits({ ...units, [i.id]: e.target.value })
                  }
                >
                  {Object.keys(U[i.d ?? ""]).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}

        <div className="actions">
          <button className="btn" onClick={reset}>
            Reset
          </button>
        </div>
        <p className="err">{calc.err}</p>

        {res ? (
          <div className="result">
            <div className="rrow">
              <span className="big">{shown}</span>
              {outs.length > 1 ? (
                <select
                  aria-label="Result unit"
                  value={outU}
                  onChange={(e) => setPick(e.target.value)}
                >
                  {outs.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              ) : (
                <span>{outs[0]}</span>
              )}
            </div>
            <Gauge f={f} val={res.val} outU={outU} />
            {res.note && <p className="note">{res.note}</p>}
            <details>
              <summary>Calculation Steps</summary>
              <ol>
                {res.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </details>
            <p className="src">Source: {f.src}</p>
            {f.lim && <p className="src">Limitation: {f.lim}</p>}
          </div>
        ) : (
          <div className="result idle">
            Enter the values above and the result appears here.
          </div>
        )}
      </section>
      {/* Mobile: thumb-reach actions pinned to the bottom of the screen (outside .calc, which has backdrop-filter) */}
      <div className="mbar">
        <button className="btn" onClick={onBack}>
          ← Formulas
        </button>
        <button className="btn" onClick={reset}>
          Reset
        </button>
      </div>
    </>
  );
}
