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
  type?: "date";
};
export type FormulaMath = {
  label: string;
  rhs?: string;
  prefix?: string;
  suffix?: string;
  numerator?: string;
  denominator?: string;
  radical?: boolean;
};
export type Formula = {
  id: string;
  n: string;
  al: string;
  s: string;
  systems?: string[];
  d: string;
  src: string;
  lim?: string;
  in: Input[];
  out: string;
  dg?: number;
  math?: FormulaMath;
  more?: string | string[];
  departments?: string[];
  kind?: "outcome-measure";
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
    math: { label: "BMI", numerator: "Weight (kg)", denominator: "Height (m)²" },
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
    math: {
      label: "BSA",
      numerator: "Height (cm) × Weight (kg)",
      denominator: "3600",
      radical: true,
    },
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
    math: { label: "MAP", rhs: "DBP + ⅓ × (SBP − DBP)" },
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
    math: { label: "QTc", numerator: "QT interval", denominator: "√RR interval" },
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
    math: { label: "P/F ratio", numerator: "PaO₂ (mmHg)", denominator: "FiO₂ (as a fraction)" },
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
    math: { label: "CrCl", numerator: "(140 − Age) × Weight (kg)", denominator: "72 × Serum creatinine (mg/dL)", rhs: "× 0.85 if female" },
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
    math: { label: "Anion gap", rhs: "Na⁺ − (Cl⁻ + HCO₃⁻)" },
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
    math: { label: "Corrected Ca", rhs: "Measured Ca + 0.8 × (4.0 − Albumin)" },
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
    math: { label: "4–2–1 rule", rhs: "4 mL/kg/hr (first 10 kg) + 2 mL/kg/hr (next 10 kg) + 1 mL/kg/hr (each kg above 20)" },
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
    id: "pky",
    n: "Pack-Years (smoking)",
    al: "pack year pack-years smoking tobacco cigarettes copd lung cancer screening",
    s: "Respiratory",
    d: "A measure of lifetime cigarette exposure: packs smoked per day multiplied by years smoked. One pack-year is 20 cigarettes a day for one year.",
    src: "Standard definition (1 pack = 20 cigarettes)",
    lim: "If smoking intensity changed over time, calculate each period separately and add the results. Screening criteria vary by guideline, so check your local one.",
    math: {
      label: "Pack-years",
      numerator: "Cigarettes per day",
      denominator: "20",
      rhs: "× Years smoked",
    },
    in: [
      { id: "c", l: "Cigarettes smoked per day", d: "cpd", min: 1, max: 200 },
      { id: "y", l: "Years smoked", d: "yr", min: 0.1, max: 80 },
    ],
    out: "pky",
    dg: 1,
    f: (v) => {
      const packs = v.c / 20,
        x = packs * v.y;
      return {
        val: x,
        steps: [
          `Packs per day = cigarettes per day ÷ 20 = ${r(v.c, 1)} ÷ 20 = ${r(packs, 2)}`,
          `Pack-years = packs per day × years smoked = ${r(packs, 2)} × ${r(v.y, 1)} = ${r(x, 1)}`,
        ],
        note:
          x < 10
            ? "Under 10 pack-years"
            : x < 20
              ? "10 to 19 pack-years"
              : "20 or more pack-years: a common threshold for lung cancer screening eligibility (age and quit-time criteria also apply)",
      };
    },
  },
  {
    id: "edd",
    n: "Estimated due date (LMP)",
    al: "estimated due date pregnancy obstetrics lmp naegele gestation",
    s: "Reproductive",
    d: "Estimates a due date by adding 280 days to the first day of the last menstrual period.",
    src: "Naegele's rule",
    lim: "Assumes a 28-day cycle with ovulation around day 14. Early ultrasound dating or local obstetric guidance may be more appropriate.",
    in: [{ id: "lmp", l: "First day of last menstrual period", type: "date" }],
    out: "date",
    math: { label: "Estimated due date", rhs: "First day of LMP + 280 days" },
    departments: ["Obstetrics & Gynaecology"],
    f: (v) => {
      const due = v.lmp + 280;
      const date = new Date(due * 86400000).toISOString().slice(0, 10);
      return {
        val: due,
        steps: [
          `LMP date = ${new Date(v.lmp * 86400000).toISOString().slice(0, 10)}`,
          `Estimated due date = LMP + 280 days = ${date}`,
        ],
      };
    },
  },
  {
    id: "gest-age",
    n: "Gestational age (LMP)",
    al: "gestational age pregnancy weeks days obstetrics lmp",
    s: "Reproductive",
    d: "Estimates gestational age from the first day of the last menstrual period.",
    src: "Standard obstetric dating convention",
    lim: "This estimate assumes the LMP is known and cycles are reasonably regular. Early ultrasound dating and local obstetric guidance may be more appropriate.",
    in: [{ id: "lmp", l: "First day of last menstrual period", type: "date" }],
    out: "gestAge",
    dg: 2,
    math: {
      label: "Gestational age",
      numerator: "Current date − LMP date",
      denominator: "7 days",
    },
    departments: ["Obstetrics & Gynaecology"],
    f: (v) => {
      const today = Math.floor(Date.now() / 86400000);
      const days = today - v.lmp;
      if (days < 0) return { err: "The last menstrual period date cannot be in the future." };
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      return {
        val: days / 7,
        steps: [
          `Days since LMP = ${r(days, 0)} days`,
          `Completed weeks = ${weeks} weeks`,
          `Remaining days = ${remainingDays} days`,
          `Gestational age = ${weeks} weeks + ${remainingDays} days (${r(days / 7, 2)} weeks)`,
        ],
      };
    },
  },
  {
    id: "gcs",
    n: "Glasgow Coma Scale (GCS)",
    al: "glasgow coma scale gcs eye verbal motor neurology consciousness",
    s: "Nervous",
    d: "Adds eye, verbal and motor response scores to record a Glasgow Coma Scale total.",
    src: "Teasdale G, Jennett B. Lancet 1974",
    lim: "Record the E, V and M components as well as the total. Intubation, language barriers, sedation and other factors can make a component untestable; the score does not replace a neurological examination.",
    in: [
      {
        id: "e",
        l: "Eye response",
        o: ["1 — None", "2 — To pressure", "3 — To sound", "4 — Spontaneous"],
      },
      {
        id: "v",
        l: "Verbal response",
        o: ["1 — None", "2 — Incomprehensible", "3 — Inappropriate", "4 — Confused", "5 — Orientated"],
      },
      {
        id: "m",
        l: "Motor response",
        o: ["1 — None", "2 — Extension", "3 — Abnormal flexion", "4 — Normal flexion", "5 — Localises", "6 — Obeys commands"],
      },
    ],
    out: "pts",
    math: { label: "GCS", rhs: "Eye response + Verbal response + Motor response" },
    departments: ["Neurology", "Emergency Medicine", "Intensive Care", "Surgery"],
    f: (v) => {
      const eye = v.e + 1;
      const verbal = v.v + 1;
      const motor = v.m + 1;
      const score = eye + verbal + motor;
      return {
        val: score,
        steps: [
          `Eye response (E) = ${eye}`,
          `Verbal response (V) = ${verbal}`,
          `Motor response (M) = ${motor}`,
          `GCS = E + V + M = ${eye} + ${verbal} + ${motor} = ${score}`,
        ],
        note:
          score <= 8
            ? "Severe range (8 or less); interpret with the individual E, V and M responses and clinical context."
            : score <= 12
              ? "Moderate range (9 to 12); interpret with the individual E, V and M responses and clinical context."
              : "Mild range (13 to 15); interpret with the individual E, V and M responses and clinical context.",
      };
    },
  },
  {
    id: "phq2",
    n: "PHQ-2 depression screen",
    al: "phq2 phq-2 depression screening psychiatry mood",
    s: "Nervous",
    d: "Sums the two PHQ-2 frequency responses as a brief depression screen.",
    src: "Kroenke K, Spitzer RL, Williams JBW. Med Care 2003",
    lim: "A score of 3 or more is a positive screen, not a diagnosis. Follow local guidance for further assessment.",
    in: [
      {
        id: "i",
        l: "Little interest or pleasure in doing things",
        o: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"],
      },
      {
        id: "d",
        l: "Feeling down, depressed or hopeless",
        o: ["Not at all (0)", "Several days (1)", "More than half the days (2)", "Nearly every day (3)"],
      },
    ],
    out: "pts",
    math: { label: "PHQ-2", rhs: "Response 1 + Response 2 (range 0–6)" },
    departments: ["Psychiatry", "Primary Care", "Medicine"],
    f: (v) => {
      const score = v.i + v.d;
      return {
        val: score,
        steps: [
          `Item 1 score = ${v.i}`,
          `Item 2 score = ${v.d}`,
          `PHQ-2 total = ${v.i} + ${v.d} = ${score} / 6`,
        ],
        note:
          score >= 3
            ? "Positive screen (3 or more): consider further assessment; this is not a diagnosis."
            : "Below the usual positive-screen threshold of 3; use clinical judgment if concerns remain.",
      };
    },
  },
  {
    id: "se",
    n: "Spherical equivalent (refraction)",
    al: "spherical equivalent sphere cylinder diopter ophthalmology refraction",
    s: "Ophthalmology",
    d: "Converts a sphere and cylinder refraction into a single spherical-equivalent value.",
    src: "Standard optometric calculation",
    lim: "This is a summary of refractive power, not a prescription recommendation. Clinical interpretation depends on the full refraction and examination.",
    in: [
      { id: "s", l: "Sphere", d: "diopter", min: -30, max: 30 },
      { id: "c", l: "Cylinder", d: "diopter", min: -30, max: 30 },
    ],
    out: "diopter",
    dg: 2,
    math: {
      label: "Spherical equivalent",
      prefix: "Sphere + ",
      numerator: "Cylinder",
      denominator: "2",
    },
    departments: ["Ophthalmology"],
    f: (v) => {
      const value = v.s + v.c / 2;
      return {
        val: value,
        steps: [
          `Half the cylinder = ${r(v.c, 2)} ÷ 2 = ${r(v.c / 2, 2)} D`,
          `Spherical equivalent = sphere + half cylinder = ${r(v.s, 2)} + ${r(v.c / 2, 2)} = ${r(value, 2)} D`,
        ],
      };
    },
  },
  {
    id: "tug",
    n: "Timed Up and Go (TUG)",
    al: "timed up and go tug physiotherapy mobility balance falls outcome measure",
    s: "Rehabilitation",
    d: "Records the time taken to stand, walk three metres, turn, return and sit.",
    src: "Podsiadlo D, Richardson S. J Am Geriatr Soc 1991",
    lim: "A time around 13.5 seconds has been studied as a fall-risk cut-off in community-dwelling older adults, but accuracy is limited and the threshold is not universal. Use the same protocol and clinical context when comparing results.",
    in: [{ id: "t", l: "TUG time", d: "sec", min: 0.1, max: 300 }],
    out: "sec",
    dg: 1,
    math: { label: "TUG score", rhs: "Time to complete the standardised test (seconds)" },
    kind: "outcome-measure",
    departments: ["Physiotherapy", "Rehabilitation Medicine"],
    more: [
      "The Timed Up and Go is a brief functional mobility test: the person rises from a chair, walks three metres, turns, walks back and sits down. The result is the elapsed time in seconds, so the test itself is an outcome measure rather than a multi-step arithmetic formula.",
      "Use a consistent chair, walkway, footwear, assistive device and instruction protocol on repeat testing. A single time should not be used alone to diagnose fall risk or determine treatment.",
    ],
    f: (v) => ({
      val: v.t,
      steps: [`TUG time = ${r(v.t, 1)} seconds`],
      note:
        v.t >= 13.5
          ? "At or above 13.5 seconds: a commonly studied cut-off in some older adult populations, not a diagnosis."
          : "Below 13.5 seconds; this does not by itself rule out mobility or fall risk.",
    }),
  },
  {
    id: "sixmwd",
    n: "Six-minute walk distance (6MWT)",
    al: "six minute walk test 6mwd distance physiotherapy rehabilitation outcome measure",
    s: "Rehabilitation",
    d: "Records the total distance covered during a standard six-minute walk test.",
    src: "ATS Committee on Proficiency Standards for Clinical Pulmonary Function Laboratories. Am J Respir Crit Care Med 2002",
    lim: "Use a consistent standardised corridor, instructions and encouragement. Distance is affected by age, height, weight, health and protocol; interpret change against the person's context and an appropriate reference.",
    in: [{ id: "d", l: "Distance walked", d: "walkDist", min: 0, max: 2000 }],
    out: "walkDist",
    dg: 0,
    math: { label: "6MWT distance", rhs: "Total distance walked in 6 minutes" },
    kind: "outcome-measure",
    departments: ["Physiotherapy", "Rehabilitation Medicine"],
    more: [
      "The six-minute walk test measures the distance a person can walk on a flat, straight course in six minutes. It is commonly used to assess functional exercise capacity, including in cardiopulmonary rehabilitation.",
      "This calculator records the measured distance and converts the displayed unit; it does not estimate a predicted value or diagnose a condition. Repeat testing should use the same protocol and be interpreted with symptoms and clinical context.",
    ],
    f: (v) => ({
      val: v.d,
      steps: [`6MWT distance = ${r(v.d, 0)} m`],
    }),
  },
  {
    id: "outcome-change",
    n: "Outcome measure change (%)",
    al: "physiotherapy outcome measure percent change rehabilitation score baseline follow-up",
    s: "Rehabilitation",
    d: "Calculates percentage improvement between baseline and follow-up scores when the scale direction is known.",
    src: "Percentage change calculation",
    lim: "Do not compare percentages across different instruments. A percentage change is not the same as a minimal clinically important difference; interpret against the specific measure and population.",
    in: [
      { id: "b", l: "Baseline score", d: "score", min: 0, max: 1000 },
      { id: "f", l: "Follow-up score", d: "score", min: 0, max: 1000 },
      { id: "direction", l: "Score direction", o: ["Lower score is better", "Higher score is better"] },
    ],
    out: "pct",
    dg: 1,
    math: {
      label: "Change (%)",
      numerator: "Improvement",
      denominator: "Baseline score",
      rhs: "× 100",
    },
    kind: "outcome-measure",
    departments: ["Physiotherapy", "Rehabilitation Medicine"],
    more: [
      "Outcome measures track a person's symptoms, activity or function over time. This calculator expresses the difference between two scores as a percentage of the baseline, with the direction setting used to label improvement as positive.",
      "It is suitable only when the scale has a meaningful numeric direction and a non-zero baseline. The value is not a minimal clinically important difference and does not replace validated interpretation guidance for a specific instrument.",
    ],
    f: (v) => {
      if (v.b <= 0)
        return { err: "Baseline score must be greater than zero to calculate percentage change." };
      const improvement = v.direction === 0 ? v.b - v.f : v.f - v.b;
      const change = (improvement / v.b) * 100;
      return {
        val: change,
        steps: [
          `Improvement = ${v.direction === 0 ? "baseline − follow-up" : "follow-up − baseline"} = ${r(improvement, 2)}`,
          `Percentage change = (improvement ÷ baseline) × 100 = (${r(improvement, 2)} ÷ ${r(v.b, 2)}) × 100 = ${r(change, 1)}%`,
        ],
        note:
          change > 0
            ? "Positive value: improvement in the selected score direction."
            : change < 0
              ? "Negative value: worsening in the selected score direction."
              : "No change from baseline.",
      };
    },
  },
  {
    id: "gait-speed",
    n: "Gait speed",
    al: "gait speed walking velocity physiotherapy 10 metre walk test mobility",
    s: "Rehabilitation",
    d: "Calculates walking speed from the distance walked and elapsed time.",
    src: "Standard distance ÷ time calculation used with gait-speed assessments",
    lim: "Use a consistent protocol, including the timed distance, pace instructions and assistive device. Interpret against the relevant population and test protocol.",
    in: [
      { id: "d", l: "Timed walking distance", d: "walkDist", min: 0.1, max: 1000 },
      { id: "t", l: "Time taken", d: "sec", min: 0.1, max: 3600 },
    ],
    out: "vel",
    dg: 2,
    math: { label: "Gait speed", numerator: "Distance walked (m)", denominator: "Time (s)" },
    kind: "outcome-measure",
    departments: ["Physiotherapy", "Rehabilitation Medicine"],
    more: [
      "Gait speed is calculated by dividing the measured walking distance by the time taken. Record the protocol and whether the participant used their usual walking aid.",
      "The result is a functional measure, not a diagnosis. Compare repeat results using the same setup and interpret them in the person's clinical context.",
    ],
    f: (v) => {
      const speed = v.d / v.t;
      return {
        val: speed,
        steps: [
          `Gait speed = distance ÷ time`,
          `Gait speed = ${r(v.d, 2)} m ÷ ${r(v.t, 2)} s = ${r(speed, 2)} m/s`,
        ],
      };
    },
  },
  {
    id: "chair-stand-30",
    n: "30-second chair stand",
    al: "30 second chair stand test repetitions physiotherapy lower limb strength",
    s: "Rehabilitation",
    d: "Records the number of full stands completed during a standardised 30-second chair stand test.",
    src: "Jones CJ, Rikli RE, Beam WC. Research Quarterly for Exercise and Sport 1999",
    lim: "Use the standardised chair, instructions and safety precautions. Reference values depend on age, sex and protocol; the repetition count alone is not a diagnosis.",
    in: [{ id: "reps", l: "Full stands completed", d: "count", min: 0, max: 100 }],
    out: "count",
    dg: 0,
    math: { label: "30-second chair stand", rhs: "Number of full stands in 30 seconds" },
    kind: "outcome-measure",
    departments: ["Physiotherapy", "Rehabilitation Medicine"],
    more: [
      "Count each complete stand performed in 30 seconds using the standardised test protocol. Follow local guidance on chair height, arm position, pacing and safety.",
      "The result is a performance measure. Interpret it using appropriate age- and population-specific references rather than as a standalone diagnosis.",
    ],
    f: (v) => ({
      val: v.reps,
      steps: [`Completed stands = ${r(v.reps, 0)} repetitions in 30 seconds`],
    }),
  },
  {
    id: "ivdrip",
    n: "IV drip rate (drops/min)",
    al: "iv infusion drip rate drops per minute gtt nursing",
    s: "General",
    d: "Estimates a gravity infusion rate in drops per minute from volume, time and the giving set drop factor.",
    src: "Standard infusion-rate calculation",
    lim: "Use the drop factor printed on the specific giving set. This does not replace an infusion pump or local medication-safety checks.",
    in: [
      { id: "v", l: "Volume to infuse", d: "vol", min: 1, max: 10000 },
      { id: "t", l: "Infusion time", d: "min", min: 1, max: 100000 },
      { id: "g", l: "Giving set drop factor", o: ["10 gtt/mL", "15 gtt/mL", "20 gtt/mL", "60 gtt/mL"] },
    ],
    out: "gtt",
    dg: 0,
    math: { label: "Drip rate", numerator: "Volume (mL) × Drop factor (gtt/mL)", denominator: "Time (minutes)" },
    departments: ["Medicine", "Surgery", "Paediatrics", "Emergency Medicine"],
    f: (v) => {
      const dropFactor = [10, 15, 20, 60][v.g];
      const rate = (v.v * dropFactor) / v.t;
      return {
        val: rate,
        steps: [
          `Drop factor = ${dropFactor} gtt/mL`,
          `Drip rate = (volume × drop factor) ÷ time = (${r(v.v, 0)} × ${dropFactor}) ÷ ${r(v.t, 0)} = ${r(rate, 0)} gtt/min`,
        ],
      };
    },
  },
  {
    id: "egfr",
    n: "eGFR (CKD-EPI 2021 creatinine)",
    al: "egfr kidney function ckd epi 2021 renal creatinine",
    s: "Renal",
    d: "Estimates glomerular filtration rate from age, serum creatinine and sex using the 2021 CKD-EPI creatinine equation.",
    src: "Inker LA et al. N Engl J Med 2021",
    lim: "Not validated for acute changes in kidney function, pregnancy or every clinical context. Interpret with urine albumin, trend, body size and local guidance; it is not interchangeable with creatinine clearance for all drug dosing.",
    in: [
      { id: "a", l: "Age", d: "yr", min: 18, max: 120 },
      { id: "c", l: "Serum creatinine", d: "cr", min: 0.1, max: 20 },
      { id: "x", l: "Sex used by CKD-EPI equation", o: ["Female", "Male"] },
    ],
    out: "egfr",
    dg: 0,
    math: { label: "eGFR", rhs: "142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1.200 × 0.9938^Age × 1.012 (if female)" },
    departments: ["Medicine", "Nephrology"],
    more: "The 2021 CKD-EPI creatinine equation estimates eGFR in mL/min/1.73 m² without a race coefficient. The sex-specific constants are κ = 0.7 and α = −0.241 for females, and κ = 0.9 and α = −0.302 for males. eGFR is an estimate, not a direct measurement, and creatinine-based estimates can be misleading when kidney function is changing rapidly or muscle mass is atypical. Interpret with clinical context and current local guidance.",
    f: (v) => {
      const female = v.x === 0;
      const kappa = female ? 0.7 : 0.9;
      const alpha = female ? -0.241 : -0.302;
      const ratio = v.c / kappa;
      const value =
        142 *
        Math.min(ratio, 1) ** alpha *
        Math.max(ratio, 1) ** -1.2 *
        0.9938 ** v.a *
        (female ? 1.012 : 1);
      return {
        val: value,
        steps: [
          `κ = ${kappa}; α = ${alpha}; serum creatinine / κ = ${r(v.c, 2)} ÷ ${kappa} = ${r(ratio, 3)}`,
          `eGFR = 142 × min(${r(ratio, 3)}, 1)^${alpha} × max(${r(ratio, 3)}, 1)^−1.200 × 0.9938^${r(v.a, 0)}${female ? " × 1.012" : ""}`,
          `eGFR = ${r(value, 0)} mL/min/1.73 m²`,
        ],
      };
    },
  },
  {
    id: "anc",
    n: "Absolute neutrophil count (ANC)",
    al: "absolute neutrophil count anc neutrophils bands white blood cell mls",
    s: "Haematology",
    d: "Estimates the absolute neutrophil count from the white cell count and differential percentages.",
    src: "Standard haematology calculation",
    lim: "Use the differential and units reported by the laboratory. Clinical thresholds and actions depend on the patient's context and local protocol.",
    in: [
      { id: "w", l: "White blood cell count", d: "wbc", min: 0.1, max: 500 },
      { id: "n", l: "Neutrophils", d: "pct", min: 0, max: 100 },
      { id: "b", l: "Bands", d: "pct", min: 0, max: 100 },
    ],
    out: "wbc",
    dg: 2,
    math: {
      label: "ANC",
      prefix: "WBC × ",
      numerator: "Neutrophils % + Bands %",
      denominator: "100",
    },
    departments: ["Haematology", "Medicine"],
    f: (v) => {
      const pct = v.n + v.b;
      const value = v.w * (pct / 100);
      return {
        val: value,
        steps: [
          `Neutrophils + bands = ${r(v.n, 1)}% + ${r(v.b, 1)}% = ${r(pct, 1)}%`,
          `ANC = ${r(v.w, 2)} × (${r(pct, 1)} ÷ 100) = ${r(value, 2)} ×10⁹/L`,
        ],
      };
    },
  },
  {
    id: "fena",
    n: "Fractional excretion of sodium (FENa)",
    al: "fena fractional excretion sodium urine serum creatinine renal",
    s: "Renal",
    d: "Estimates the percentage of filtered sodium excreted in urine from paired urine and serum values.",
    src: "Standard renal physiology calculation",
    lim: "Diuretics, chronic kidney disease and other conditions can make FENa misleading. It should not be used alone to diagnose the cause of acute kidney injury.",
    in: [
      { id: "un", l: "Urine sodium", d: "mmol", min: 1, max: 500 },
      { id: "sn", l: "Serum sodium", d: "mmol", min: 80, max: 200 },
      { id: "uc", l: "Urine creatinine", d: "cr", min: 0.1, max: 1000 },
      { id: "sc", l: "Serum creatinine", d: "cr", min: 0.1, max: 20 },
    ],
    out: "pct",
    dg: 2,
    math: { label: "FENa (%)", numerator: "Urine Na × Serum creatinine", denominator: "Serum Na × Urine creatinine", rhs: "× 100" },
    departments: ["Nephrology", "Emergency Medicine"],
    f: (v) => {
      const value = ((v.un * v.sc) / (v.sn * v.uc)) * 100;
      return {
        val: value,
        steps: [
          `FENa = (urine Na × serum creatinine) ÷ (serum Na × urine creatinine) × 100`,
          `= (${r(v.un, 1)} × ${r(v.sc, 2)}) ÷ (${r(v.sn, 1)} × ${r(v.uc, 2)}) × 100 = ${r(value, 2)}%`,
        ],
      };
    },
  },
  {
    id: "gbs",
    n: "Glasgow-Blatchford score",
    al: "glasgow blatchford score gbs upper gastrointestinal bleeding gi bleed",
    s: "Gastrointestinal",
    d: "Adds clinical and laboratory criteria to estimate the need for intervention in upper gastrointestinal bleeding.",
    src: "Blatchford O et al. Lancet 2000",
    lim: "A risk score does not replace clinical assessment or local upper-GI-bleed pathways. Ensure inputs are measured before treatment where appropriate.",
    in: [
      { id: "u", l: "Blood urea", d: "urea", min: 0.1, max: 100 },
      { id: "h", l: "Haemoglobin", d: "hb", min: 2, max: 25 },
      { id: "x", l: "Sex", o: ["Male", "Female"] },
      { id: "s", l: "Systolic blood pressure", d: "press", min: 40, max: 300 },
      { id: "p", l: "Heart rate", d: "bpm", min: 20, max: 250 },
      { id: "m", l: "Melena", o: ["No", "Yes"] },
      { id: "y", l: "Syncope", o: ["No", "Yes"] },
      { id: "l", l: "Hepatic disease", o: ["No", "Yes"] },
      { id: "f", l: "Heart failure", o: ["No", "Yes"] },
    ],
    out: "pts",
    math: { label: "GBS", rhs: "Urea points + Haemoglobin points + Blood pressure points + Other clinical points" },
    departments: ["Gastroenterology", "Emergency Medicine", "Surgery"],
    f: (v) => {
      const urea = v.u < 6.5 ? 0 : v.u < 8 ? 2 : v.u < 10 ? 3 : v.u < 25 ? 4 : 6;
      const hb = v.x === 0
        ? v.h >= 13 ? 0 : v.h >= 12 ? 1 : v.h >= 10 ? 3 : 6
        : v.h >= 12 ? 0 : v.h >= 10 ? 1 : 6;
      const pressure = v.s >= 110 ? 0 : v.s >= 100 ? 1 : v.s >= 90 ? 2 : 3;
      const pulse = v.p >= 100 ? 1 : 0;
      const score =
        urea + hb + pressure + pulse + v.m + 2 * v.y + 2 * v.l + 2 * v.f;
      return {
        val: score,
        steps: [
          `Urea points = ${urea}; haemoglobin points = ${hb}`,
          `Systolic pressure points = ${pressure}; pulse points = ${pulse}`,
          `Melena = ${v.m}; syncope = ${2 * v.y}; hepatic disease = ${2 * v.l}; heart failure = ${2 * v.f}`,
          `Glasgow-Blatchford total = ${score}`,
        ],
        note:
          score === 0
            ? "Score 0 is a very-low-risk group in the original study; follow local care pathways."
            : "Interpret against a validated local pathway; the score alone does not determine disposition.",
      };
    },
  },
  {
    id: "news2",
    n: "National Early Warning Score 2 (NEWS2)",
    al: "news2 early warning deterioration vital signs hospital observations",
    s: "General",
    d: "Scores six adult vital signs and supplemental oxygen use to support recognition of acute deterioration.",
    src: "Royal College of Physicians. National Early Warning Score (NEWS) 2, 2017.",
    lim: "For adults in acute-care settings; do not use as a paediatric score. SpO₂ Scale 2 is only for patients with clinician-confirmed hypercapnic respiratory failure and an authorised target range. Follow local escalation protocols and act on clinical concern regardless of score.",
    in: [
      { id: "rr", l: "Respiratory rate", d: "bpm", min: 0, max: 80 },
      { id: "sp", l: "Oxygen saturation (SpO₂)", d: "pct", min: 50, max: 100 },
      {
        id: "scale",
        l: "SpO₂ scoring scale",
        o: ["Scale 1 (most patients)", "Scale 2 (clinician-prescribed)"],
      },
      { id: "oxygen", l: "Supplemental oxygen", o: ["No", "Yes"] },
      { id: "sbp", l: "Systolic blood pressure", d: "press", min: 30, max: 300 },
      { id: "hr", l: "Heart rate", d: "bpm", min: 0, max: 300 },
      { id: "temp", l: "Temperature", d: "temp", min: 30, max: 45 },
      {
        id: "consciousness",
        l: "Consciousness",
        o: ["Alert", "New confusion", "Voice", "Pain", "Unresponsive"],
      },
    ],
    out: "pts",
    math: {
      label: "NEWS2",
      rhs: "Respiratory rate + SpO₂ + supplemental oxygen + systolic BP + pulse + consciousness + temperature",
    },
    f: (v) => {
      const rr = v.rr <= 8 || v.rr >= 25 ? 3 : v.rr >= 21 ? 2 : v.rr >= 9 && v.rr <= 11 ? 1 : 0;
      const spo2 =
        v.scale === 0
          ? v.sp <= 91
            ? 3
            : v.sp <= 93
              ? 2
              : v.sp <= 95
                ? 1
                : 0
          : v.sp <= 83
            ? 3
            : v.sp <= 85
              ? 2
              : v.sp <= 87 || (v.sp >= 93 && v.sp <= 94)
                ? 1
                : v.sp >= 95
                  ? v.sp <= 96
                    ? 2
                    : 3
                  : 0;
      const sbp =
        v.sbp <= 90 ? 3 : v.sbp <= 100 ? 2 : v.sbp <= 110 ? 1 : v.sbp >= 220 ? 3 : 0;
      const hr =
        v.hr <= 40 || v.hr >= 131
          ? 3
          : v.hr <= 50
            ? 1
            : v.hr <= 90
              ? 0
              : v.hr <= 110
                ? 1
                : 2;
      const temp =
        v.temp <= 35
          ? 3
          : v.temp <= 36
            ? 1
            : v.temp <= 38
              ? 0
              : v.temp <= 39
                ? 1
                : 2;
      const consciousness = v.consciousness === 0 ? 0 : 3;
      const oxygen = v.oxygen === 1 ? 2 : 0;
      const parts: [string, number][] = [
        ["Respiratory rate", rr],
        ["SpO₂", spo2],
        ["Supplemental oxygen", oxygen],
        ["Systolic blood pressure", sbp],
        ["Heart rate", hr],
        ["Consciousness", consciousness],
        ["Temperature", temp],
      ];
      const score = parts.reduce((total, [, points]) => total + points, 0);
      const anyThree = parts.some(([, points]) => points === 3);
      const risk =
        score >= 7
          ? "High risk"
          : score >= 5
            ? "Medium risk"
            : anyThree
              ? "Low–medium risk (a single parameter scores 3)"
              : "Low risk";
      return {
        val: score,
        steps: [
          ...parts.map(([label, points]) => `${label}: ${points} point${points === 1 ? "" : "s"}`),
          `NEWS2 total = ${score} points`,
        ],
        note: `${risk}. Use the appropriate local response pathway; a low score does not rule out serious illness.`,
      };
    },
  },
  {
    id: "winters",
    n: "Expected PaCO₂ (Winter’s formula)",
    al: "winter formula metabolic acidosis expected respiratory compensation blood gas",
    s: "Respiratory",
    d: "Estimates expected respiratory compensation in metabolic acidosis from the serum bicarbonate.",
    src: "Winter RW. Clinical and metabolic aspects of acid-base balance. 1967.",
    lim: "Use only when assessing metabolic acidosis alongside a blood gas and clinical context. The expected range is approximate; this is not a diagnosis.",
    in: [{ id: "hco3", l: "Serum bicarbonate (HCO₃⁻)", d: "mmol", min: 1, max: 60 }],
    out: "press",
    dg: 0,
    math: {
      label: "Expected PaCO₂",
      rhs: "1.5 × HCO₃⁻ + 8 (expected range ± 2 mmHg)",
    },
    departments: ["Medicine", "Emergency Medicine", "Intensive Care", "Nephrology"],
    f: (v) => {
      const expected = 1.5 * v.hco3 + 8;
      return {
        val: expected,
        steps: [
          `1.5 × bicarbonate = 1.5 × ${r(v.hco3, 1)} = ${r(1.5 * v.hco3, 1)} mmHg`,
          `Expected PaCO₂ = ${r(1.5 * v.hco3, 1)} + 8 = ${r(expected, 1)} mmHg`,
          `Approximate expected range = ${r(expected - 2, 1)}–${r(expected + 2, 1)} mmHg`,
        ],
        note: "Compare with measured PaCO₂; a value outside the expected range may indicate an additional respiratory disturbance.",
      };
    },
  },
  {
    id: "corrected-na",
    n: "Corrected sodium in hyperglycaemia",
    al: "corrected sodium glucose hyperglycaemia hypertonicity",
    s: "Endocrine",
    d: "Estimates serum sodium after accounting for the dilutional effect of raised glucose.",
    src: "Katz MA. N Engl J Med 1973; Tzamaloukas AH et al. Front Med 2017;4:1.",
    lim: "An estimate, not a treatment target or fluid prescription. The correction factor is approximate and may differ in extreme hyperglycaemia or profound volume disturbance; repeat measurements and follow local emergency protocols.",
    in: [
      { id: "na", l: "Measured serum sodium", d: "mmol", min: 80, max: 200 },
      { id: "glucose", l: "Serum glucose", d: "mmol", min: 5.6, max: 100 },
    ],
    out: "mmol",
    dg: 1,
    math: {
      label: "Corrected Na⁺",
      prefix: "Measured Na⁺ + 1.6 × [",
      numerator: "Glucose − 5.6",
      denominator: "5.6",
      suffix: "]",
    },
    departments: ["Endocrinology", "Medicine", "Emergency Medicine", "Intensive Care"],
    f: (v) => {
      const rise = v.glucose - 5.6;
      const correction = (1.6 * rise) / 5.6;
      const sodium = v.na + correction;
      return {
        val: sodium,
        steps: [
          `Glucose above 5.6 mmol/L = ${r(v.glucose, 1)} − 5.6 = ${r(rise, 1)} mmol/L`,
          `Sodium correction = 1.6 × (${r(rise, 1)} ÷ 5.6) = ${r(correction, 2)} mmol/L`,
          `Corrected sodium = ${r(v.na, 1)} + ${r(correction, 2)} = ${r(sodium, 1)} mmol/L`,
        ],
        note: "Interpret with measured sodium, hydration and osmolality; corrected sodium can change during treatment.",
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
  Reproductive: "paediatrics",
  Nervous: "ecg",
  "Gastrointestinal": "droplet",
  Rehabilitation: "scale",
  Haematology: "droplet",
  Ophthalmology: "target",
};
export const HU: Record<string, number> = {
  General: 220,
  Cardiovascular: 350,
  Respiratory: 195,
  Renal: 210,
  Endocrine: 280,
  Paediatrics: 35,
  Reproductive: 300,
  Nervous: 245,
  Gastrointestinal: 35,
  Rehabilitation: 195,
  Haematology: 280,
  Ophthalmology: 195,
};

// Merge the cardiology pack (lib/cardio.ts)
F.push(...cardio);
Object.assign(ZG, cardioZG);
Object.assign(IC, cardioIC);
Object.assign(HU, cardioHU);

const systemByTopic: Record<string, string> = {
  Haemodynamics: "Cardiovascular",
  Echo: "Cardiovascular",
  ECG: "Cardiovascular",
  "Risk scores": "Cardiovascular",
  Lipids: "Cardiovascular",
  Paediatrics: "General",
  Rehabilitation: "General",
  Haematology: "General",
  Ophthalmology: "General",
};
const departmentsByTopic: Record<string, string[]> = {
  General: ["Medicine"],
  Haemodynamics: ["Cardiology", "Emergency Medicine", "Intensive Care"],
  Echo: ["Cardiology", "Intensive Care"],
  ECG: ["Cardiology", "Emergency Medicine", "Medicine"],
  "Risk scores": ["Cardiology", "Emergency Medicine", "Medicine"],
  Lipids: ["Cardiology", "Endocrinology", "Medicine"],
  Respiratory: ["Respiratory Medicine", "Emergency Medicine", "Intensive Care"],
  Renal: ["Medicine", "Nephrology"],
  Endocrine: ["Medicine", "Endocrinology"],
  Paediatrics: ["Paediatrics"],
  Gastrointestinal: ["Gastroenterology", "Emergency Medicine", "Surgery"],
  Reproductive: ["Obstetrics & Gynaecology"],
  Nervous: ["Neurology", "Emergency Medicine"],
  Rehabilitation: ["Physiotherapy", "Rehabilitation Medicine"],
  Haematology: ["Haematology", "Medicine"],
  "Ophthalmology": ["Ophthalmology"],
};
const departmentsByFormula: Record<string, string[]> = {
  bmi: ["Medicine", "Physiotherapy"],
  bsa: ["Medicine", "Oncology"],
  map: ["Medicine", "Emergency Medicine", "Anaesthesia", "Intensive Care"],
  qtc: ["Cardiology", "Emergency Medicine", "Medicine"],
  pf: ["Respiratory Medicine", "Emergency Medicine", "Intensive Care"],
  crcl: ["Medicine", "Nephrology"],
  ag: ["Emergency Medicine", "Intensive Care", "Nephrology"],
  cca: ["Medicine", "Endocrinology"],
  fl: ["Paediatrics", "Surgery"],
  pky: ["Respiratory Medicine", "Primary Care"],
  edd: ["Obstetrics & Gynaecology"],
  gcs: ["Neurology", "Emergency Medicine", "Intensive Care", "Surgery"],
  phq2: ["Psychiatry", "Primary Care", "Medicine"],
  se: ["Ophthalmology"],
  tug: ["Physiotherapy", "Rehabilitation Medicine"],
  sixmwd: ["Physiotherapy", "Rehabilitation Medicine"],
  "outcome-change": ["Physiotherapy", "Rehabilitation Medicine"],
  ivdrip: ["Medicine", "Surgery", "Paediatrics", "Emergency Medicine"],
  egfr: ["Medicine", "Nephrology"],
  anc: ["Haematology", "Medicine"],
  fena: ["Nephrology", "Emergency Medicine"],
  gbs: ["Gastroenterology", "Emergency Medicine", "Surgery"],
  rcri: ["Surgery", "Medicine"],
  news2: ["Medicine", "Emergency Medicine", "Surgery", "Intensive Care"],
  winters: ["Medicine", "Emergency Medicine", "Intensive Care", "Nephrology"],
  "corrected-na": ["Endocrinology", "Medicine", "Emergency Medicine", "Intensive Care"],
  pp: ["Cardiology", "Emergency Medicine", "Intensive Care"],
  si: ["Cardiology", "Emergency Medicine", "Intensive Care"],
  sv: ["Cardiology", "Anaesthesia", "Intensive Care"],
  co: ["Cardiology", "Anaesthesia", "Intensive Care"],
  ci: ["Cardiology", "Anaesthesia", "Intensive Care"],
  svr: ["Cardiology", "Anaesthesia", "Intensive Care"],
  pvr: ["Cardiology", "Anaesthesia", "Intensive Care"],
  do2: ["Cardiology", "Anaesthesia", "Intensive Care"],
  ef: ["Cardiology", "Intensive Care"],
  fs: ["Cardiology", "Intensive Care"],
  grad: ["Cardiology", "Intensive Care"],
  ava: ["Cardiology", "Intensive Care"],
  rvsp: ["Cardiology", "Intensive Care"],
  qtcf: ["Cardiology", "Emergency Medicine", "Medicine"],
  qtck: ["Cardiology", "Emergency Medicine", "Medicine"],
  qtch: ["Cardiology", "Emergency Medicine", "Medicine"],
  hrs: ["Cardiology", "Emergency Medicine", "Medicine"],
  cha: ["Cardiology", "Medicine"],
  bled: ["Cardiology", "Medicine"],
  heart: ["Cardiology", "Emergency Medicine"],
  timi: ["Cardiology", "Emergency Medicine"],
  wpe: ["Medicine", "Emergency Medicine", "Surgery"],
  wdvt: ["Medicine", "Emergency Medicine", "Surgery"],
  duke: ["Cardiology"],
  ldl: ["Cardiology", "Endocrinology", "Medicine"],
  nhdl: ["Cardiology", "Endocrinology", "Medicine"],
};
const mathByFormula: Record<string, FormulaMath> = {
  pp: { label: "Pulse pressure", rhs: "Systolic BP − Diastolic BP" },
  si: { label: "Shock index", numerator: "Heart rate (beats/min)", denominator: "Systolic BP (mmHg)" },
  sv: { label: "Stroke volume", rhs: "End-diastolic volume − End-systolic volume" },
  co: { label: "Cardiac output", rhs: "Heart rate × Stroke volume" },
  ci: { label: "Cardiac index", numerator: "Cardiac output", denominator: "Body surface area" },
  svr: { label: "SVR", numerator: "80 × (Mean arterial pressure − Central venous pressure)", denominator: "Cardiac output" },
  pvr: { label: "PVR", numerator: "80 × (Mean pulmonary artery pressure − Wedge pressure)", denominator: "Cardiac output" },
  do2: { label: "Oxygen delivery", rhs: "Cardiac output × Arterial oxygen content × 10" },
  ef: { label: "Ejection fraction (%)", numerator: "End-diastolic volume − End-systolic volume", denominator: "End-diastolic volume", rhs: "× 100" },
  fs: { label: "Fractional shortening (%)", numerator: "LVIDd − LVIDs", denominator: "LVIDd", rhs: "× 100" },
  grad: { label: "Pressure gradient", rhs: "4 × (Peak velocity)²" },
  ava: {
    label: "Aortic valve area",
    numerator: "LVOT area × LVOT VTI",
    denominator: "Aortic valve VTI",
  },
  rvsp: { label: "RVSP", rhs: "4 × (TR velocity)² + Right atrial pressure" },
  qtcf: { label: "QTc (Fridericia)", numerator: "QT interval", denominator: "RR interval^(1/3)" },
  qtck: { label: "QTc (Framingham)", rhs: "QT + 154 × (1 − RR interval)" },
  qtch: { label: "QTc (Hodges)", rhs: "QT + 1.75 × (Heart rate − 60)" },
  hrs: {
    label: "Heart rate",
    numerator: "300",
    denominator: "Number of large ECG boxes between R waves",
  },
  cha: { label: "CHA₂DS₂-VASc", rhs: "Sum of points for each applicable risk factor" },
  bled: { label: "HAS-BLED", rhs: "Sum of points for each applicable risk factor" },
  heart: { label: "HEART score", rhs: "History + ECG + Age + Risk factors + Troponin points" },
  timi: { label: "TIMI score", rhs: "Sum of points for each applicable criterion" },
  wpe: { label: "Wells score (PE)", rhs: "Sum of points for each applicable criterion" },
  wdvt: { label: "Wells score (DVT)", rhs: "Sum of points for each applicable criterion" },
  rcri: { label: "RCRI", rhs: "Sum of points for each applicable risk factor" },
  duke: { label: "Duke treadmill score", rhs: "Exercise time − 5 × ST deviation − 4 × angina index" },
  ldl: {
    label: "LDL cholesterol",
    prefix: "Total cholesterol − HDL cholesterol − (",
    numerator: "Triglycerides",
    denominator: "5",
    suffix: ")",
  },
  nhdl: { label: "Non-HDL cholesterol", rhs: "Total cholesterol − HDL cholesterol" },
};
for (const formula of F) {
  formula.systems = [systemByTopic[formula.s] ?? formula.s];
  formula.departments =
    departmentsByFormula[formula.id] ??
    formula.departments ??
    departmentsByTopic[formula.s] ??
    [];
  formula.math ??= mathByFormula[formula.id];
}
