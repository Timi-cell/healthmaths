"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { HU, type Formula } from "@/lib/formulas";
import { U, r } from "@/lib/units";
import { formatResultForCopy } from "@/lib/share";
import Gauge from "./Gauge";
import type { Entry } from "@/lib/store";

const unitOf = (
  units: Record<string, string>,
  id: string,
  d: string,
  u?: string,
) => units[id] ?? u ?? Object.keys(U[d])[0];

function renderStep(step: string): ReactNode {
  const divisionIndex = step.search(/[÷/]/);
  if (divisionIndex < 0) return step;

  const left = step.slice(0, divisionIndex);
  const right = step.slice(divisionIndex + 1);
  let numeratorStart = -1;
  if (left.trimEnd().endsWith(")")) {
    let depth = 0;
    for (let index = left.length - 1; index >= 0; index--) {
      if (left[index] === ")") depth++;
      if (left[index] === "(" && --depth === 0) {
        numeratorStart = index;
        break;
      }
    }
  }
  if (numeratorStart < 0) {
    for (const boundary of [" = ", " × ", " + ", " − ", "; "]) {
      const index = left.lastIndexOf(boundary);
      if (index >= 0)
        numeratorStart = Math.max(numeratorStart, index + boundary.length);
    }
  }
  if (numeratorStart < 0) numeratorStart = 0;

  let prefix = left.slice(0, numeratorStart);
  let numerator = left.slice(numeratorStart).trim();
  if (numerator.startsWith("(") && !numerator.includes(")")) {
    prefix += "(";
    numerator = numerator.slice(1).trimStart();
  }
  let denominatorEnd = right.length;
  if (right.trimStart().startsWith("(")) {
    const opening = right.indexOf("(");
    let depth = 0;
    for (let index = opening; index < right.length; index++) {
      if (right[index] === "(") depth++;
      if (right[index] === ")" && --depth === 0) {
        denominatorEnd = index + 1;
        break;
      }
    }
  } else {
    for (const boundary of [" = ", " × ", " + ", " − ", "; "]) {
      const index = right.indexOf(boundary);
      if (index >= 0) denominatorEnd = Math.min(denominatorEnd, index);
    }
  }

  let denominator = right.slice(0, denominatorEnd).trim();
  let suffix = right.slice(denominatorEnd);
  if (prefix.trimEnd().endsWith("(") && denominator.endsWith(")")) {
    denominator = denominator.slice(0, -1).trimEnd();
    suffix = `)${suffix}`;
  }

  return (
    <>
      {prefix && <span>{prefix}</span>}
      <span
        className="fraction step-fraction"
        aria-label={`${numerator} divided by ${denominator}`}
      >
        <span>{numerator}</span>
        <span>{denominator}</span>
      </span>
      {suffix && <span>{suffix}</span>}
    </>
  );
}

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
  const [submitted, setSubmitted] = useState(Boolean(seed));
  const selectionOnly =
    f.in.length > 0 && f.in.every((input) => Boolean(input.o));

  // Read inputs -> convert to base units -> validate -> run the formula.
  const calc = useMemo(() => {
    const v: Record<string, number> = {};
    for (const i of f.in) {
      const raw = vals[i.id];
      if (i.type === "date") {
        if (!raw) return {};
        const date = Date.parse(`${raw}T00:00:00Z`);
        if (!Number.isFinite(date)) return {};
        v[i.id] = date / 86400000;
        continue;
      }
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
  const resultValue = (value: number) =>
    f.out === "date"
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(value * 86400000))
      : r(value / k, dp);
  const animatedValue = useCount(res ? res.val / k : 0, dp);
  const shown = f.out === "date" ? (res ? resultValue(res.val) : "") : animatedValue;
  const text =
    res && outU
      ? `${resultValue(res.val)}${f.out === "date" ? "" : ` ${outU}`}`
      : "";
  const formulaUrl = () =>
    `${window.location.origin}/?f=${encodeURIComponent(f.id)}`;

  // Patient-value calculations are saved after input settles; option-only scores are explicit.
  useEffect(() => {
    if (selectionOnly || !text || Object.keys(vals).length === 0) return;
    const id = setTimeout(
      () => onResult({ fid: f.id, n: f.n, t: text, vals, units }),
      1500,
    );
    return () => clearTimeout(id);
  }, [selectionOnly, text, f.id, f.n, vals, units, onResult]);

  const reset = () => {
    setVals({});
    setUnits({});
    setPick(null);
    setSubmitted(false);
  };
  const updateValue = (id: string, value: string) => {
    setVals((current) => ({ ...current, [id]: value }));
    setSubmitted(false);
  };
  const updateUnit = (id: string, unit: string) => {
    setUnits((current) => ({ ...current, [id]: unit }));
    setSubmitted(false);
  };
  const getResult = () => {
    if (!res || !text || submitted) return;
    onResult({ fid: f.id, n: f.n, t: text, vals, units });
    setSubmitted(true);
  };
  const notify = (message: string) =>
    window.dispatchEvent(
      new CustomEvent("healthmaths:toast", { detail: message }),
    );
  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) throw new Error("Clipboard access is unavailable.");
    }
  };
  const copyResult = async () => {
    if (!res) return;
    const content = formatResultForCopy(
      f,
      text,
      vals,
      units,
      res.note,
      formulaUrl(),
    );
    try {
      await copyText(content);
      notify("Result copied to clipboard.");
    } catch {
      notify("Couldn't copy the result. Please check clipboard permissions.");
    }
  };
  const shareLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${f.n} | HealthMaths`,
          text: "Open this calculator on HealthMaths.",
          url: formulaUrl(),
        });
        return;
      }
      await copyText(formulaUrl());
      notify("Link copied to clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await copyText(formulaUrl());
        notify("Couldn't open sharing. Link copied to clipboard.");
      } catch {
        notify("Couldn't share or copy the link. Please try again.");
      }
    }
  };

  return (
    <>
      <section
        className="calc"
        style={{ "--h": HU[f.systems?.[0] ?? f.s] } as CSSProperties}
        aria-live="polite"
      >
        <span className="sys">
          {f.kind === "outcome-measure"
            ? "Outcome Measure"
            : (f.systems?.[0] ?? f.s)}
        </span>
        <h2>{f.n}</h2>
        <p className="desc">{f.d}</p>

        {f.in.map((i) => (
          <div className="field" key={i.id}>
            <label htmlFor={`f_${i.id}`}>{i.l}</label>
            {i.type === "date" ? (
              <input
                id={`f_${i.id}`}
                type="date"
                value={vals[i.id] ?? ""}
                onChange={(e) => updateValue(i.id, e.target.value)}
              />
            ) : i.o ? (
              <select
                className="sel"
                id={`f_${i.id}`}
                value={vals[i.id] ?? i.o[0]}
                onChange={(e) => updateValue(i.id, e.target.value)}
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
                  onChange={(e) => updateValue(i.id, e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <select
                  aria-label={`${i.l} unit`}
                  value={unitOf(units, i.id, i.d ?? "", i.u)}
                  onChange={(e) => updateUnit(i.id, e.target.value)}
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
        {selectionOnly && (
          <div className="get-result-wrap">
            <button
              className="btn get-result-btn"
              type="button"
              onClick={getResult}
              disabled={!res || submitted}
            >
              {submitted ? "Result added to history" : "Get Result"}
            </button>
          </div>
        )}
        <p className="err">{calc.err}</p>

        {res && (!selectionOnly || submitted) ? (
          <div className="result">
            <div className="rrow">
              <span className="big">{shown}</span>
              {f.out === "date" ? null : outs.length > 1 ? (
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
            <div className="result-actions">
              <button className="btn" onClick={copyResult}>
                Copy Result
              </button>
              <button className="btn" onClick={shareLink}>
                Share Link
              </button>
            </div>
            <details open>
              <summary>Calculation Steps</summary>
              {f.math && (
                <div className="formula-display" aria-label="Formula">
                  <strong>{f.math.label} =</strong>
                  {f.math.numerator && f.math.denominator ? (
                    <>
                      {f.math.prefix && (
                        <span className="formula-prefix">{f.math.prefix}</span>
                      )}
                      {f.math.radical && <span className="radical">√(</span>}
                      <span
                        className="fraction"
                        aria-label={`${f.math.numerator} divided by ${f.math.denominator}`}
                      >
                        <span>{f.math.numerator}</span>
                        <span>{f.math.denominator}</span>
                      </span>
                      {f.math.radical && <span className="radical">)</span>}
                      {f.math.suffix && (
                        <span className="formula-suffix">{f.math.suffix}</span>
                      )}
                    </>
                  ) : (
                    <span className="formula-expression">{f.math.rhs}</span>
                  )}
                  {f.math.numerator && f.math.denominator && f.math.rhs && (
                    <span className="formula-trailing">{f.math.rhs}</span>
                  )}
                </div>
              )}
              <ol className="calc-steps">
                {res.steps.map((s, i) => (
                  <li key={i}>
                    <span className="step-equation">{renderStep(s)}</span>
                  </li>
                ))}
              </ol>
            </details>
            <details className="more-notes">
              <summary>More Notes</summary>
              <div className="more-notes-content">
                {(Array.isArray(f.more)
                  ? f.more
                  : [
                      f.more ??
                        `${f.d} This calculator applies the stated formula to the values entered. Check the source and limitations below before interpreting the result.`,
                    ]
                ).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <p className="src">Source: {f.src}</p>
                {f.lim && <p className="src">Limitation: {f.lim}</p>}
              </div>
            </details>
          </div>
        ) : (
          <div className="result idle">
            {selectionOnly
              ? "Choose the options above, then select Get Result."
              : "Enter the values above and the result appears here."}
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
