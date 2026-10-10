import { r } from "./units";
import { cardio, cardioZG, cardioIC, cardioHU } from "./cardio";

export type V = Record<string, number>;
export type Result =
  | { val: number; steps: string[]; note?: string }
  | { err: string };
export type Input = {
  id: string;
  l: string;
  d?: string;
  min?: number;
  max?: number;
  u?: string;
  o?: string[];
};
export type Formula = {
  id: string;
  n: string;
  al: string;
  s: string;
  d: string;
  src: string;
  lim?: string;
  in: Input[];
  out: string;
  dg?: number;
  f: (v: V) => Result;
};

// The formula registry: add a new calculator by adding one object here.
export const F: Formula[] = [
  {
    id: "bmi",
    n: "Body mass index (BMI)",
    al: "bmi obesity weight height quetelet",
    s: "General",
    d: "Weight relative to height. A quick screen for under- and overweight in adults.",
    src: "WHO adult BMI classification",
    lim: "For adults only. It does not separate muscle from fat, and some populations use different cut-offs.",
    in: [
      { id: "w", l: "Weight", d: "mass", min: 2, max: 500 },
      { id: "h", l: "Height", d: "len", min: 50, max: 250 },
    ],
    out: "idx",
    f: (v) => {
      const m = v.h / 100,
        b = v.w / (m * m);
      return {
        val: b,
        steps: [
          `Height in metres = ${r(v.h, 1)} cm ÷ 100 = ${r(m, 2)} m`,
          `BMI = weight ÷ height² = ${r(v.w, 1)} ÷ ${r(m * m, 3)}`,
          `BMI = ${r(b, 1)} kg/m²`,
        ],
        note:
          b < 18.5
            ? "Underweight (below 18.5)"
            : b < 25
              ? "Normal range (18.5 to 24.9)"
              : b < 30
                ? "Overweight (25 to 29.9)"
                : "Obese (30 or above)",
      };
    },
  },
  {
    id: "bsa",
    n: "Body surface area (Mosteller)",
    al: "bsa chemotherapy dosing surface area",
    s: "General",
    d: "Surface area of the body, used to scale drug doses such as chemotherapy.",
    src: "Mosteller RD. N Engl J Med 1987",
    in: [
      { id: "w", l: "Weight", d: "mass", min: 2, max: 500 },
      { id: "h", l: "Height", d: "len", min: 30, max: 250 },
    ],
    out: "area",
    dg: 2,
    f: (v) => {
      const p = (v.h * v.w) / 3600,
        b = Math.sqrt(p);
      return {
        val: b,
        steps: [
          `Height × weight = ${r(v.h, 1)} × ${r(v.w, 1)} = ${r(v.h * v.w, 0)}`,
          `Divide by 3600 = ${r(p, 3)}`,
          `Square root = ${r(b, 2)} m²`,
        ],
      };
    },
  },
  {
    id: "map",
    n: "Mean arterial pressure (MAP)",
    al: "map blood pressure perfusion shock",
    s: "Haemodynamics",
    d: "Average pressure driving blood through the organs over one cardiac cycle.",
    src: "Standard physiological estimate",
    lim: "The one-third rule assumes a normal heart rate. It is less accurate in tachycardia.",
    in: [
      { id: "s", l: "Systolic BP", d: "press", min: 40, max: 300 },
      { id: "dd", l: "Diastolic BP", d: "press", min: 20, max: 200 },
    ],
    out: "press",
    f: (v) => {
      if (v.dd >= v.s) return { err: "Diastolic must be lower than systolic." };
      const m = v.dd + (v.s - v.dd) / 3;
      return {
        val: m,
        steps: [
          `Pulse pressure = ${r(v.s, 0)} − ${r(v.dd, 0)} = ${r(v.s - v.dd, 0)} mmHg`,
          `MAP = diastolic + ⅓ × pulse pressure`,
          `MAP = ${r(v.dd, 0)} + ${r((v.s - v.dd) / 3, 1)} = ${r(m, 0)} mmHg`,
        ],
        note:
          m < 65
            ? "Below 65 mmHg: organ perfusion may be at risk"
            : m <= 100
              ? "Within the usual target range"
              : "Above the usual range",
      };
    },
  },
  {
    id: "qtc",
    n: "Corrected QT (Bazett)",
    al: "qtc ecg qt interval arrhythmia",
    s: "ECG",
    d: "QT interval corrected for heart rate, to judge risk of arrhythmia.",
    src: "Bazett HC. Heart 1920",
    lim: "Bazett over-corrects at fast heart rates and under-corrects at slow ones. Consider another correction formula outside 60 to 100 bpm.",
    in: [
      { id: "qt", l: "QT interval", d: "time", min: 200, max: 800, u: "ms" },
      { id: "hr", l: "Heart rate", d: "bpm", min: 30, max: 220 },
    ],
    out: "time",
    f: (v) => {
      const rr = 60 / v.hr,
        q = v.qt / Math.sqrt(rr);
      return {
        val: q,
        steps: [
          `RR interval = 60 ÷ ${r(v.hr, 0)} = ${r(rr, 2)} s`,
          `QTc = QT ÷ √RR = ${r(v.qt, 0)} ÷ ${r(Math.sqrt(rr), 2)}`,
          `QTc = ${r(q, 0)} ms`,
        ],
        note:
          q < 450
            ? "Within normal limits"
            : q <= 470
              ? "Borderline (450 to 470 ms)"
              : "Prolonged (above 470 ms)",
      };
    },
  },
  {
    id: "pf",
    n: "PaO₂/FiO₂ ratio",
    al: "p/f ratio ards oxygenation hypoxaemia abg",
    s: "Respiratory",
    d: "Compares arterial oxygen with the oxygen fraction delivered. Used to grade lung injury.",
    src: "ARDS Definition Task Force, Berlin definition, JAMA 2012",
    lim: "The Berlin definition also needs PEEP of 5 cmH₂O or more and a compatible clinical picture.",
    in: [
      { id: "pa", l: "PaO₂", d: "press", min: 10, max: 700 },
      { id: "fi", l: "FiO₂", d: "pct", min: 21, max: 100 },
    ],
    out: "ratio",
    f: (v) => {
      const x = v.pa / (v.fi / 100);
      return {
        val: x,
        steps: [
          `FiO₂ as a fraction = ${r(v.fi, 0)} ÷ 100 = ${r(v.fi / 100, 2)}`,
          `Ratio = PaO₂ ÷ FiO₂ = ${r(v.pa, 0)} ÷ ${r(v.fi / 100, 2)} = ${r(x, 0)} mmHg`,
        ],
        note:
          x > 300
            ? "Above 300: no ARDS-range impairment"
            : x > 200
              ? "200 to 300: mild range"
              : x > 100
                ? "100 to 200: moderate range"
                : "Below 100: severe range",
      };
    },
  },
  {
    id: "crcl",
    n: "Creatinine clearance (Cockcroft-Gault)",
    al: "cockcroft gault renal gfr kidney drug dosing creatinine",
    s: "Renal",
    d: "Estimates kidney function from serum creatinine. Commonly used to adjust drug doses.",
    src: "Cockcroft DW, Gault MH. Nephron 1976",
    lim: "Uses actual body weight; it can overestimate clearance in obesity and oedema. Not validated in unstable kidney function.",
    in: [
      { id: "a", l: "Age", d: "yr", min: 18, max: 110 },
      { id: "w", l: "Weight", d: "mass", min: 20, max: 300 },
      { id: "c", l: "Serum creatinine", d: "cr", min: 0.2, max: 20 },
      { id: "x", l: "Sex", o: ["Male", "Female"] },
    ],
    out: "crcl",
    f: (v) => {
      const fem = v.x === 1,
        n = (140 - v.a) * v.w,
        k = n / (72 * v.c),
        c = fem ? k * 0.85 : k;
      return {
        val: c,
        steps: [
          `(140 − age) × weight = (140 − ${r(v.a, 0)}) × ${r(v.w, 1)} = ${r(n, 0)}`,
          `Divide by 72 × creatinine = ${r(n, 0)} ÷ ${r(72 * v.c, 1)} = ${r(k, 1)}`,
          fem
            ? `Female: × 0.85 = ${r(c, 1)} mL/min`
            : `Male: no adjustment = ${r(c, 1)} mL/min`,
        ],
        note:
          c >= 90
            ? "90 or above: normal range"
            : c >= 60
              ? "60 to 89: mildly reduced"
              : c >= 30
                ? "30 to 59: moderately reduced"
                : c >= 15
                  ? "15 to 29: severely reduced"
                  : "Below 15: kidney failure range",
      };
    },
  },
  {
    id: "ag",
    n: "Anion gap",
    al: "anion gap acidosis metabolic sodium chloride bicarbonate",
    s: "Renal",
    d: "Helps sort metabolic acidosis into high and normal anion gap causes.",
    src: "Standard acid-base formula (without potassium)",
    in: [
      { id: "na", l: "Sodium", d: "mmol", min: 100, max: 180 },
      { id: "cl", l: "Chloride", d: "mmol", min: 60, max: 140 },
      { id: "hc", l: "Bicarbonate", d: "mmol", min: 2, max: 50 },
    ],
    out: "mmol",
    f: (v) => {
      const g = v.na - (v.cl + v.hc);
      return {
        val: g,
        steps: [
          `Chloride + bicarbonate = ${r(v.cl, 0)} + ${r(v.hc, 0)} = ${r(v.cl + v.hc, 0)}`,
          `Anion gap = sodium − ${r(v.cl + v.hc, 0)} = ${r(g, 0)} mmol/L`,
        ],
        note:
          g > 12
            ? "Above the typical 8 to 12 range. Lab ranges vary."
            : g < 8
              ? "Below the typical 8 to 12 range. Lab ranges vary."
              : "Within the typical 8 to 12 range. Lab ranges vary.",
      };
    },
  },
  {
    id: "cca",
    n: "Corrected calcium",
    al: "corrected calcium albumin hypocalcaemia hypercalcaemia",
    s: "Endocrine",
    d: "Adjusts total calcium for low albumin, which lowers the measured value.",
    src: "Payne RB et al. BMJ 1973",
    lim: "Less reliable in critical illness and with very low albumin. Ionised calcium is the gold standard.",
    in: [
      { id: "ca", l: "Total calcium", d: "ca", min: 3, max: 20 },
      { id: "al", l: "Albumin", d: "alb", min: 0.5, max: 6 },
    ],
    out: "ca",
    dg: 2,
    f: (v) => {
      const c = v.ca + 0.8 * (4 - v.al);
      return {
        val: c,
        steps: [
          `Albumin deficit = 4.0 − ${r(v.al, 1)} = ${r(4 - v.al, 1)} g/dL`,
          `Correction = 0.8 × ${r(4 - v.al, 1)} = ${r(0.8 * (4 - v.al), 2)} mg/dL`,
          `Corrected Ca = ${r(v.ca, 2)} + ${r(0.8 * (4 - v.al), 2)} = ${r(c, 2)} mg/dL`,
        ],
        note:
          c < 8.5
            ? "Below 8.5 mg/dL: low"
            : c > 10.5
              ? "Above 10.5 mg/dL: high"
              : "Within the usual 8.5 to 10.5 mg/dL range",
      };
    },
  },
  {
    id: "fl",
    n: "Maintenance fluids (4-2-1 rule)",
    al: "fluids paediatric maintenance holliday segar iv",
    s: "Paediatrics",
    d: "Hourly maintenance IV fluid for a child by body weight.",
    src: "Holliday MA, Segar WE. Pediatrics 1957",
    in: [{ id: "w", l: "Weight", d: "mass", min: 2, max: 80 }],
    out: "rate",
    dg: 0,
    f: (v) => {
      const w = v.w,
        h = w <= 10 ? 4 * w : w <= 20 ? 40 + 2 * (w - 10) : 60 + (w - 20);
      return {
        val: h,
        steps: [
          `First 10 kg at 4 mL/kg/hr, next 10 kg at 2, then 1 per kg after`,
          `Weight = ${r(w, 1)} kg`,
          `Rate = ${r(h, 0)} mL/hr`,
        ],
      };
    },
  },
  {
    id: "dose",
    n: "Weight-based drug dose",
    al: "dose mg/kg dosing paediatric pharmacology",
    s: "Pharmacology",
    d: "Total dose from a per-kilogram dose. Check the drug’s maximum dose separately.",
    src: "Standard weight-based dosing",
    in: [
      { id: "w", l: "Weight", d: "mass", min: 0.5, max: 300 },
      { id: "dk", l: "Dose per kg", d: "dose", min: 0.001, max: 1000 },
    ],
    out: "amt",
    dg: 2,
    f: (v) => {
      const t = v.w * v.dk;
      return {
        val: t,
        steps: [
          `Total dose = weight × dose per kg`,
          `= ${r(v.w, 1)} kg × ${r(v.dk, 3)} mg/kg = ${r(t, 2)} mg`,
        ],
        note: "Check the maximum single and daily dose for this drug.",
      };
    },
  },
];

export const GC: Record<string, string> = {
  r: "#FB7185",
  o: "#FB923C",
  a: "#FBBF24",
  l: "#A3E635",
  g: "#34D399",
};
// Gauge zones in base output units: [upper bound, colour key]
export const ZG: Record<
  string,
  { min: number; max: number; z: [number, string][] }
> = {
  bmi: {
    min: 12,
    max: 40,
    z: [
      [18.5, "a"],
      [25, "g"],
      [30, "a"],
      [40, "r"],
    ],
  },
  map: {
    min: 40,
    max: 140,
    z: [
      [65, "r"],
      [100, "g"],
      [140, "a"],
    ],
  },
  qtc: {
    min: 330,
    max: 550,
    z: [
      [450, "g"],
      [470, "a"],
      [550, "r"],
    ],
  },
  pf: {
    min: 0,
    max: 500,
    z: [
      [100, "r"],
      [200, "o"],
      [300, "a"],
      [500, "g"],
    ],
  },
  crcl: {
    min: 0,
    max: 140,
    z: [
      [15, "r"],
      [30, "o"],
      [60, "a"],
      [90, "l"],
      [140, "g"],
    ],
  },
  ag: {
    min: 0,
    max: 30,
    z: [
      [8, "a"],
      [12, "g"],
      [30, "r"],
    ],
  },
  cca: {
    min: 6,
    max: 13,
    z: [
      [8.5, "r"],
      [10.5, "g"],
      [13, "a"],
    ],
  },
};

export const IC: Record<string, string> = {
  General: "scale",
  Cardiovascular: "heart",
  Respiratory: "lungs",
  Renal: "droplet",
  Endocrine: "endocrine",
  Paediatrics: "paediatrics",
  Pharmacology: "pharmacology",
};
export const HU: Record<string, number> = {
  General: 220,
  Cardiovascular: 350,
  Respiratory: 195,
  Renal: 210,
  Endocrine: 280,
  Paediatrics: 35,
  Pharmacology: 150,
};

// Merge the cardiology pack (lib/cardio.ts)
F.push(...cardio);
Object.assign(ZG, cardioZG);
Object.assign(IC, cardioIC);
Object.assign(HU, cardioHU);
