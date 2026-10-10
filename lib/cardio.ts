// Cardiology formula pack. Each calculator is plain data plus one function.
// Inputs arrive in BASE units (mmHg, mL, mm, mg/dL ...). Dropdown inputs arrive as the option's index (0, 1, 2).
import type { Formula } from "./formulas";
import { r } from "./units";

type Zone = { min: number; max: number; z: [number, string][] };

const yn = ["No", "Yes"];
const chk = (id: string, l: string) => ({ id, l, o: yn });

// Turns [label, points] pairs into a total and readable working.
const tally = (items: [string, number][]) => {
  const hit = items.filter(([, p]) => p !== 0);
  const total = items.reduce((s, [, p]) => s + p, 0);
  const lines = hit.length
    ? hit.map(([l, p]) => `${l}: ${p > 0 ? "+" : ""}${r(p, 1)}`)
    : ["No scoring items selected"];
  return { val: total, steps: [...lines, `Total = ${r(total, 1)} points`] };
};

const qtNote = (q: number) =>
  q < 450
    ? "Within normal limits"
    : q <= 470
      ? "Borderline (450 to 470 ms)"
      : "Prolonged (above 470 ms)";
const qtZone: Zone = {
  min: 330,
  max: 550,
  z: [
    [450, "g"],
    [470, "a"],
    [550, "r"],
  ],
};

export const cardio: Formula[] = [
  // ---------------- Haemodynamics ----------------
  {
    id: "pp",
    n: "Pulse pressure",
    al: "pulse pressure sbp dbp wide narrow",
    s: "Haemodynamics",
    d: "The gap between systolic and diastolic pressure. It reflects stroke volume and arterial stiffness.",
    src: "Standard physiological definition",
    in: [
      { id: "s", l: "Systolic BP", d: "press", min: 40, max: 300 },
      { id: "dd", l: "Diastolic BP", d: "press", min: 20, max: 200 },
    ],
    out: "press",
    dg: 0,
    f: (v) => {
      if (v.dd >= v.s) return { err: "Diastolic must be lower than systolic." };
      const p = v.s - v.dd;
      return {
        val: p,
        steps: [
          `Pulse pressure = systolic − diastolic = ${r(v.s, 0)} − ${r(v.dd, 0)} = ${r(p, 0)} mmHg`,
        ],
        note: "Typically about 40 mmHg. A persistently wide or narrow value deserves a clinical look.",
      };
    },
  },
  {
    id: "si",
    n: "Shock index",
    al: "shock index hr sbp haemorrhage bleeding",
    s: "Haemodynamics",
    d: "Heart rate divided by systolic pressure. A quick bedside marker of haemodynamic compromise.",
    src: "Allgöwer and Burri, 1967",
    in: [
      { id: "hr", l: "Heart rate", d: "bpm", min: 20, max: 250 },
      { id: "s", l: "Systolic BP", d: "press", min: 40, max: 300 },
    ],
    out: "si",
    dg: 2,
    f: (v) => {
      const x = v.hr / v.s;
      return {
        val: x,
        steps: [
          `Shock index = heart rate ÷ systolic BP = ${r(v.hr, 0)} ÷ ${r(v.s, 0)} = ${r(x, 2)}`,
        ],
        note:
          x < 0.9
            ? "Within the usual range (normal is about 0.5 to 0.7)"
            : x <= 1
              ? "Raised (above 0.9): look for early shock"
              : "Above 1.0: suggests significant haemodynamic compromise",
      };
    },
  },
  {
    id: "sv",
    n: "Stroke volume",
    al: "stroke volume sv edv esv",
    s: "Haemodynamics",
    d: "Blood ejected by the left ventricle with each beat: end-diastolic volume minus end-systolic volume.",
    src: "Standard physiological definition",
    in: [
      { id: "edv", l: "End-diastolic volume", d: "vol", min: 20, max: 400 },
      { id: "esv", l: "End-systolic volume", d: "vol", min: 5, max: 300 },
    ],
    out: "vol",
    dg: 0,
    f: (v) => {
      if (v.esv >= v.edv)
        return {
          err: "End-systolic volume must be lower than end-diastolic volume.",
        };
      const x = v.edv - v.esv;
      return {
        val: x,
        steps: [
          `SV = EDV − ESV = ${r(v.edv, 0)} − ${r(v.esv, 0)} = ${r(x, 0)} mL`,
        ],
        note: "A typical adult resting value is about 60 to 100 mL.",
      };
    },
  },
  {
    id: "co",
    n: "Cardiac output",
    al: "cardiac output co heart rate stroke volume",
    s: "Haemodynamics",
    d: "Volume of blood the heart pumps each minute: heart rate times stroke volume.",
    src: "Standard physiological definition",
    in: [
      { id: "hr", l: "Heart rate", d: "bpm", min: 20, max: 250 },
      { id: "sv", l: "Stroke volume", d: "vol", min: 10, max: 250 },
    ],
    out: "flow",
    f: (v) => {
      const x = (v.hr * v.sv) / 1000;
      return {
        val: x,
        steps: [
          `CO = HR × SV = ${r(v.hr, 0)} × ${r(v.sv, 0)} mL = ${r(v.hr * v.sv, 0)} mL/min`,
          `Convert to litres: ${r(x, 1)} L/min`,
        ],
        note:
          x < 4
            ? "Below the typical 4 to 8 L/min"
            : x <= 8
              ? "Within the typical 4 to 8 L/min"
              : "Above the typical 4 to 8 L/min",
      };
    },
  },
  {
    id: "ci",
    n: "Cardiac index",
    al: "cardiac index ci output bsa",
    s: "Haemodynamics",
    d: "Cardiac output scaled to body size, so patients of different sizes can be compared.",
    src: "Standard physiological definition",
    in: [
      { id: "co", l: "Cardiac output", d: "flow", min: 0.5, max: 20 },
      { id: "bsa", l: "Body surface area", d: "area", min: 0.5, max: 3.5 },
    ],
    out: "ci",
    dg: 1,
    f: (v) => {
      const x = v.co / v.bsa;
      return {
        val: x,
        steps: [
          `CI = CO ÷ BSA = ${r(v.co, 1)} ÷ ${r(v.bsa, 2)} = ${r(x, 1)} L/min/m²`,
        ],
        note:
          x < 2.2
            ? "Below 2.2: low output"
            : x < 2.5
              ? "Borderline low (2.2 to 2.5)"
              : x <= 4
                ? "Within the typical 2.5 to 4.0"
                : "Above 4.0: high output",
      };
    },
  },
  {
    id: "svr",
    n: "Systemic vascular resistance",
    al: "svr systemic vascular resistance afterload vasopressor",
    s: "Haemodynamics",
    d: "Resistance the left ventricle pumps against. Calculated from mean arterial pressure, central venous pressure and cardiac output.",
    src: "Standard haemodynamic formula",
    in: [
      { id: "map", l: "Mean arterial pressure", d: "press", min: 30, max: 200 },
      { id: "cvp", l: "Central venous pressure", d: "press", min: 0, max: 30 },
      { id: "co", l: "Cardiac output", d: "flow", min: 1, max: 15 },
    ],
    out: "res",
    dg: 0,
    f: (v) => {
      if (v.map <= v.cvp)
        return {
          err: "Mean arterial pressure must be higher than central venous pressure.",
        };
      const x = (80 * (v.map - v.cvp)) / v.co;
      return {
        val: x,
        steps: [
          `SVR = 80 × (MAP − CVP) ÷ CO`,
          `= 80 × (${r(v.map, 0)} − ${r(v.cvp, 0)}) ÷ ${r(v.co, 1)} = ${r(x, 0)} dyn·s/cm⁵`,
        ],
        note:
          x < 800
            ? "Below the typical 800 to 1,200: vasodilated state"
            : x <= 1200
              ? "Within the typical 800 to 1,200"
              : "Above the typical 800 to 1,200: vasoconstricted state",
      };
    },
  },
  {
    id: "pvr",
    n: "Pulmonary vascular resistance",
    al: "pvr pulmonary vascular resistance wood units pulmonary hypertension right heart catheter",
    s: "Haemodynamics",
    d: "Resistance in the lung circulation, from right heart catheter pressures and cardiac output.",
    src: "Standard haemodynamic formula",
    in: [
      {
        id: "mp",
        l: "Mean pulmonary artery pressure",
        d: "press",
        min: 5,
        max: 100,
      },
      {
        id: "pw",
        l: "Pulmonary artery wedge pressure",
        d: "press",
        min: 0,
        max: 40,
      },
      { id: "co", l: "Cardiac output", d: "flow", min: 1, max: 15 },
    ],
    out: "res",
    dg: 0,
    f: (v) => {
      if (v.mp <= v.pw)
        return {
          err: "Mean pulmonary artery pressure must be higher than the wedge pressure.",
        };
      const wu = (v.mp - v.pw) / v.co;
      return {
        val: wu * 80,
        steps: [
          `PVR = (mPAP − PAWP) ÷ CO = (${r(v.mp, 0)} − ${r(v.pw, 0)}) ÷ ${r(v.co, 1)} = ${r(wu, 1)} Wood units`,
          `× 80 = ${r(wu * 80, 0)} dyn·s/cm⁵`,
        ],
        note:
          wu <= 2
            ? "At or below 2 Wood units: within the usual range"
            : wu <= 3
              ? "Between 2 and 3 Wood units: borderline, depends on the definition used"
              : "Above 3 Wood units: raised",
      };
    },
  },
  {
    id: "do2",
    n: "Oxygen delivery (DO₂)",
    al: "oxygen delivery do2 oxygen content cao2 haemoglobin saturation",
    s: "Haemodynamics",
    d: "Oxygen delivered to the tissues each minute, from haemoglobin, saturation, dissolved oxygen and cardiac output.",
    src: "Standard oxygen delivery equation (Hüfner constant 1.34)",
    in: [
      { id: "hb", l: "Haemoglobin", d: "hb", min: 3, max: 25 },
      {
        id: "sa",
        l: "Arterial oxygen saturation",
        d: "pct",
        min: 50,
        max: 100,
      },
      { id: "pa", l: "PaO₂", d: "press", min: 20, max: 700 },
      { id: "co", l: "Cardiac output", d: "flow", min: 1, max: 20 },
    ],
    out: "do2",
    dg: 0,
    f: (v) => {
      const ca = 1.34 * v.hb * (v.sa / 100) + 0.003 * v.pa;
      const x = v.co * ca * 10;
      return {
        val: x,
        steps: [
          `CaO₂ = 1.34 × Hb × SaO₂ + 0.003 × PaO₂`,
          `= 1.34 × ${r(v.hb, 1)} × ${r(v.sa / 100, 2)} + 0.003 × ${r(v.pa, 0)} = ${r(ca, 1)} mL/dL`,
          `DO₂ = CO × CaO₂ × 10 = ${r(v.co, 1)} × ${r(ca, 1)} × 10 = ${r(x, 0)} mL O₂/min`,
        ],
        note: "A typical resting value is roughly 1,000 mL/min.",
      };
    },
  },

  // ---------------- Echo ----------------
  {
    id: "ef",
    n: "Left ventricular ejection fraction",
    al: "ejection fraction ef lvef heart failure edv esv",
    s: "Echo",
    d: "The share of blood ejected from the left ventricle with each beat, from end-diastolic and end-systolic volumes.",
    src: "Standard echocardiographic definition; categories follow ESC heart failure guidance",
    in: [
      { id: "edv", l: "End-diastolic volume", d: "vol", min: 20, max: 400 },
      { id: "esv", l: "End-systolic volume", d: "vol", min: 5, max: 300 },
    ],
    out: "pct",
    dg: 0,
    f: (v) => {
      if (v.esv >= v.edv)
        return {
          err: "End-systolic volume must be lower than end-diastolic volume.",
        };
      const x = ((v.edv - v.esv) / v.edv) * 100;
      return {
        val: x,
        steps: [
          `EF = (EDV − ESV) ÷ EDV × 100`,
          `= (${r(v.edv, 0)} − ${r(v.esv, 0)}) ÷ ${r(v.edv, 0)} × 100 = ${r(x, 0)}%`,
        ],
        note:
          x >= 50
            ? "Preserved (50% or above)"
            : x > 40
              ? "Mildly reduced (41 to 49%)"
              : "Reduced (40% or below)",
      };
    },
  },
  {
    id: "fs",
    n: "Fractional shortening",
    al: "fractional shortening fs lv diameter m-mode echo",
    s: "Echo",
    d: "How much the left ventricle cavity shortens during systole, from M-mode diameters.",
    src: "ASE chamber quantification guidelines (Lang et al.)",
    in: [
      {
        id: "ld",
        l: "LV internal diameter, diastole",
        d: "mm",
        min: 20,
        max: 90,
      },
      {
        id: "ls",
        l: "LV internal diameter, systole",
        d: "mm",
        min: 10,
        max: 80,
      },
    ],
    out: "pct",
    dg: 0,
    f: (v) => {
      if (v.ls >= v.ld)
        return {
          err: "Systolic diameter must be smaller than diastolic diameter.",
        };
      const x = ((v.ld - v.ls) / v.ld) * 100;
      return {
        val: x,
        steps: [
          `FS = (LVIDd − LVIDs) ÷ LVIDd × 100`,
          `= (${r(v.ld, 0)} − ${r(v.ls, 0)}) ÷ ${r(v.ld, 0)} × 100 = ${r(x, 0)}%`,
        ],
        note:
          x < 25
            ? "Below the typical 25 to 45%"
            : x <= 45
              ? "Within the typical 25 to 45%"
              : "Above the typical 25 to 45%",
      };
    },
  },
  {
    id: "grad",
    n: "Pressure gradient (simplified Bernoulli)",
    al: "bernoulli gradient 4v2 velocity stenosis doppler peak gradient",
    s: "Echo",
    d: "Converts a peak Doppler velocity across a valve or jet into a pressure gradient.",
    src: "Simplified Bernoulli equation (Hatle and Angelsen)",
    in: [{ id: "v", l: "Peak velocity", d: "vel", min: 0.1, max: 9 }],
    out: "press",
    dg: 0,
    f: (v) => {
      const x = 4 * v.v * v.v;
      return {
        val: x,
        steps: [`ΔP = 4 × v² = 4 × ${r(v.v, 2)}² = ${r(x, 0)} mmHg`],
        note: "In aortic stenosis, a peak velocity of 4 m/s or more (peak gradient about 64 mmHg) is in the severe range.",
      };
    },
  },
  {
    id: "ava",
    n: "Aortic valve area (continuity equation)",
    al: "aortic valve area ava continuity equation aortic stenosis lvot vti",
    s: "Echo",
    d: "Estimates the aortic valve area from the LVOT diameter and the velocity-time integrals across the LVOT and the valve.",
    src: "Continuity equation; severity cut-offs follow ESC/ACC valve guidance",
    in: [
      { id: "d", l: "LVOT diameter", d: "mm", min: 10, max: 35 },
      { id: "l", l: "LVOT VTI", d: "vti", min: 5, max: 40 },
      { id: "a", l: "Aortic valve VTI", d: "vti", min: 20, max: 150 },
    ],
    out: "cm2",
    dg: 2,
    f: (v) => {
      const dcm = v.d / 10;
      const area = Math.PI * (dcm / 2) ** 2;
      const x = (area * v.l) / v.a;
      return {
        val: x,
        steps: [
          `LVOT area = π × (d ÷ 2)² = π × (${r(dcm, 2)} ÷ 2)² = ${r(area, 2)} cm²`,
          `AVA = LVOT area × LVOT VTI ÷ AV VTI = ${r(area, 2)} × ${r(v.l, 1)} ÷ ${r(v.a, 1)} = ${r(x, 2)} cm²`,
        ],
        note:
          x <= 1
            ? "At or below 1.0 cm²: severe range"
            : x <= 1.5
              ? "Between 1.0 and 1.5 cm²: moderate range"
              : "Above 1.5 cm²: mild or no stenosis",
      };
    },
  },
  {
    id: "rvsp",
    n: "RV systolic pressure (echo)",
    al: "rvsp rv systolic pressure pasp tr jet pulmonary hypertension echo",
    s: "Echo",
    d: "Estimates pulmonary artery systolic pressure from the tricuspid regurgitant jet and the estimated right atrial pressure.",
    src: "Bernoulli equation plus estimated RA pressure (ASE)",
    in: [
      { id: "v", l: "TR peak velocity", d: "vel", min: 0.5, max: 6 },
      {
        id: "ra",
        l: "Estimated right atrial pressure",
        d: "press",
        min: 0,
        max: 30,
      },
    ],
    out: "press",
    dg: 0,
    f: (v) => {
      const g = 4 * v.v * v.v;
      const x = g + v.ra;
      return {
        val: x,
        steps: [
          `Gradient = 4 × v² = 4 × ${r(v.v, 2)}² = ${r(g, 0)} mmHg`,
          `RVSP = gradient + RA pressure = ${r(g, 0)} + ${r(v.ra, 0)} = ${r(x, 0)} mmHg`,
        ],
        note: "A TR velocity above 2.8 m/s raises the probability of pulmonary hypertension. Normal RVSP is below about 35 mmHg.",
      };
    },
  },

  // ---------------- ECG ----------------
  {
    id: "qtcf",
    n: "Corrected QT (Fridericia)",
    al: "qtc fridericia qt interval ecg",
    s: "ECG",
    d: "QT corrected for heart rate using the cube root of the RR interval. Often preferred over Bazett at fast or slow heart rates.",
    src: "Fridericia LS, 1920",
    in: [
      { id: "qt", l: "QT interval", d: "time", min: 200, max: 800, u: "ms" },
      { id: "hr", l: "Heart rate", d: "bpm", min: 30, max: 220 },
    ],
    out: "time",
    f: (v) => {
      const rr = 60 / v.hr,
        q = v.qt / Math.cbrt(rr);
      return {
        val: q,
        steps: [
          `RR interval = 60 ÷ ${r(v.hr, 0)} = ${r(rr, 2)} s`,
          `QTc = QT ÷ ∛RR = ${r(v.qt, 0)} ÷ ${r(Math.cbrt(rr), 3)} = ${r(q, 0)} ms`,
        ],
        note: qtNote(q),
      };
    },
  },
  {
    id: "qtck",
    n: "Corrected QT (Framingham)",
    al: "qtc framingham qt interval ecg",
    s: "ECG",
    d: "A linear QT correction derived from the Framingham Heart Study. Behaves well across a wide range of heart rates.",
    src: "Sagie A et al. Am J Cardiol 1992",
    in: [
      { id: "qt", l: "QT interval", d: "time", min: 200, max: 800, u: "ms" },
      { id: "hr", l: "Heart rate", d: "bpm", min: 30, max: 220 },
    ],
    out: "time",
    f: (v) => {
      const rr = 60 / v.hr,
        q = v.qt + 154 * (1 - rr);
      return {
        val: q,
        steps: [
          `RR interval = 60 ÷ ${r(v.hr, 0)} = ${r(rr, 2)} s`,
          `QTc = QT + 154 × (1 − RR) = ${r(v.qt, 0)} + 154 × ${r(1 - rr, 2)} = ${r(q, 0)} ms`,
        ],
        note: qtNote(q),
      };
    },
  },
  {
    id: "qtch",
    n: "Corrected QT (Hodges)",
    al: "qtc hodges qt interval ecg",
    s: "ECG",
    d: "A linear QT correction that adds a fixed amount for each beat per minute above 60.",
    src: "Hodges M et al., 1983",
    in: [
      { id: "qt", l: "QT interval", d: "time", min: 200, max: 800, u: "ms" },
      { id: "hr", l: "Heart rate", d: "bpm", min: 30, max: 220 },
    ],
    out: "time",
    f: (v) => {
      const q = v.qt + 1.75 * (v.hr - 60);
      return {
        val: q,
        steps: [
          `QTc = QT + 1.75 × (HR − 60) = ${r(v.qt, 0)} + 1.75 × ${r(v.hr - 60, 0)} = ${r(q, 0)} ms`,
        ],
        note: qtNote(q),
      };
    },
  },
  {
    id: "hrs",
    n: "Heart rate from ECG strip",
    al: "heart rate ecg strip 300 rule 1500 rule rr interval squares",
    s: "ECG",
    d: "Heart rate from the number of squares between two R waves, using the 300 and 1500 rules.",
    src: "Standard ECG rate rules (paper speed 25 mm/s)",
    in: [
      {
        id: "m",
        l: "Counting",
        o: ["Large squares (5 mm)", "Small squares (1 mm)"],
      },
      { id: "n", l: "Squares between two R waves", d: "sq", min: 1, max: 300 },
    ],
    out: "bpm",
    dg: 0,
    f: (v) => {
      const big = v.m === 0,
        x = (big ? 300 : 1500) / v.n;
      return {
        val: x,
        steps: [
          big
            ? `Rate = 300 ÷ large squares = 300 ÷ ${r(v.n, 1)} = ${r(x, 0)} bpm`
            : `Rate = 1500 ÷ small squares = 1500 ÷ ${r(v.n, 1)} = ${r(x, 0)} bpm`,
        ],
        note:
          x < 60
            ? "Below 60 bpm"
            : x <= 100
              ? "Within 60 to 100 bpm"
              : "Above 100 bpm",
      };
    },
    lim: "Only valid for regular rhythms at 25 mm/s. For irregular rhythms, count the QRS complexes on a 6-second strip and multiply by 10.",
  },

  // ---------------- Risk scores ----------------
  {
    id: "cha",
    n: "CHA₂DS₂-VASc",
    al: "cha2ds2 vasc atrial fibrillation stroke risk anticoagulation af",
    s: "Risk scores",
    d: "Stroke risk in atrial fibrillation, used to decide on anticoagulation.",
    src: "Lip GYH et al. Chest 2010",
    in: [
      { id: "age", l: "Age", o: ["Under 65", "65 to 74", "75 or older"] },
      { id: "sex", l: "Sex", o: ["Male", "Female"] },
      chk("chf", "Heart failure or LV dysfunction"),
      chk("htn", "Hypertension"),
      chk("dm", "Diabetes mellitus"),
      chk("stroke", "Prior stroke, TIA or thromboembolism"),
      chk("vasc", "Vascular disease (prior MI, PAD or aortic plaque)"),
    ],
    out: "pts",
    f: (v) => {
      const t = tally([
        ["Heart failure or LV dysfunction", v.chf],
        ["Hypertension", v.htn],
        ["Age 65 to 74", v.age === 1 ? 1 : 0],
        ["Age 75 or older", v.age === 2 ? 2 : 0],
        ["Diabetes", v.dm],
        ["Prior stroke, TIA or thromboembolism", v.stroke * 2],
        ["Vascular disease", v.vasc],
        ["Female sex", v.sex],
      ]);
      const adj = t.val - v.sex;
      return {
        ...t,
        note:
          adj === 0
            ? "Low risk: anticoagulation is generally not needed"
            : adj === 1
              ? "Intermediate: consider anticoagulation"
              : "Higher risk: anticoagulation is generally recommended",
      };
    },
    lim: "Newer European guidance (2024) uses CHA₂DS₂-VA, which drops the female-sex point. Follow your current local guideline.",
  },
  {
    id: "bled",
    n: "HAS-BLED",
    al: "has-bled hasbled bleeding risk anticoagulation atrial fibrillation",
    s: "Risk scores",
    d: "Estimates bleeding risk in patients on anticoagulation, mainly to flag fixable risk factors.",
    src: "Pisters R et al. Chest 2010",
    in: [
      chk("htn", "Uncontrolled hypertension (systolic above 160)"),
      chk(
        "renal",
        "Abnormal kidney function (dialysis, transplant or high creatinine)",
      ),
      chk(
        "liver",
        "Abnormal liver function (cirrhosis or markedly raised enzymes)",
      ),
      chk("stroke", "Prior stroke"),
      chk("bleed", "Bleeding history or predisposition (e.g. anaemia)"),
      chk("inr", "Labile INR (on warfarin)"),
      chk("old", "Age over 65"),
      chk("drugs", "Drugs: antiplatelets or NSAIDs"),
      chk("alc", "Alcohol excess"),
    ],
    out: "pts",
    f: (v) => {
      const t = tally([
        ["Uncontrolled hypertension", v.htn],
        ["Abnormal kidney function", v.renal],
        ["Abnormal liver function", v.liver],
        ["Prior stroke", v.stroke],
        ["Bleeding history or predisposition", v.bleed],
        ["Labile INR", v.inr],
        ["Age over 65", v.old],
        ["Antiplatelets or NSAIDs", v.drugs],
        ["Alcohol excess", v.alc],
      ]);
      return {
        ...t,
        note:
          t.val <= 1
            ? "Lower bleeding risk"
            : t.val === 2
              ? "Moderate bleeding risk"
              : "High bleeding risk (3 or more): correct what can be corrected and review more often",
      };
    },
    lim: "Meant to flag modifiable bleeding risks. A high score alone is not a reason to withhold anticoagulation.",
  },
  {
    id: "heart",
    n: "HEART score",
    al: "heart score chest pain troponin acs emergency",
    s: "Risk scores",
    d: "Risk of a major cardiac event in patients with undifferentiated chest pain. Risk factors: hypertension, high cholesterol, diabetes, obesity, smoking, family history.",
    src: "Six AJ et al. Neth Heart J 2008",
    in: [
      {
        id: "h",
        l: "History",
        o: [
          "Slightly suspicious",
          "Moderately suspicious",
          "Highly suspicious",
        ],
      },
      {
        id: "e",
        l: "ECG",
        o: [
          "Normal",
          "Non-specific repolarisation changes",
          "Significant ST deviation",
        ],
      },
      { id: "a", l: "Age", o: ["Under 45", "45 to 64", "65 or older"] },
      {
        id: "r",
        l: "Risk factors",
        o: [
          "No known risk factors",
          "1 or 2 risk factors",
          "3 or more, or known atherosclerotic disease",
        ],
      },
      {
        id: "t",
        l: "Troponin",
        o: [
          "At or below normal limit",
          "1 to 3 times normal limit",
          "More than 3 times normal limit",
        ],
      },
    ],
    out: "pts",
    f: (v) => {
      const x = v.h + v.e + v.a + v.r + v.t;
      return {
        val: x,
        steps: [
          `History ${v.h} + ECG ${v.e} + Age ${v.a} + Risk factors ${v.r} + Troponin ${v.t}`,
          `Total = ${r(x, 0)} points`,
        ],
        note:
          x <= 3
            ? "Low risk (0 to 3)"
            : x <= 6
              ? "Moderate risk (4 to 6)"
              : "High risk (7 to 10)",
      };
    },
    lim: "Troponin cut-offs depend on the assay your laboratory uses.",
  },
  {
    id: "timi",
    n: "TIMI risk score (UA/NSTEMI)",
    al: "timi risk score unstable angina nstemi acs",
    s: "Risk scores",
    d: "Risk of death, heart attack or urgent revascularisation in unstable angina and NSTEMI.",
    src: "Antman EM et al. JAMA 2000",
    in: [
      chk("age", "Age 65 or older"),
      chk("rf", "3 or more coronary risk factors"),
      chk("cad", "Known coronary stenosis of 50% or more"),
      chk("asa", "Aspirin use in the past 7 days"),
      chk("ang", "Severe angina (2 or more episodes in 24 hours)"),
      chk("st", "ST deviation of 0.5 mm or more"),
      chk("mk", "Raised cardiac marker"),
    ],
    out: "pts",
    f: (v) => {
      const t = tally([
        ["Age 65 or older", v.age],
        ["3 or more risk factors", v.rf],
        ["Known stenosis of 50% or more", v.cad],
        ["Aspirin in past 7 days", v.asa],
        ["Severe angina", v.ang],
        ["ST deviation", v.st],
        ["Raised cardiac marker", v.mk],
      ]);
      return {
        ...t,
        note:
          t.val <= 2
            ? "Lower risk group (0 to 2)"
            : t.val <= 4
              ? "Intermediate risk group (3 to 4)"
              : "Higher risk group (5 to 7)",
      };
    },
  },
  {
    id: "wpe",
    n: "Wells score for PE",
    al: "wells pe pulmonary embolism probability d-dimer",
    s: "Risk scores",
    d: "Pre-test probability of pulmonary embolism.",
    src: "Wells PS et al. Thromb Haemost 2000",
    in: [
      chk("dvt", "Clinical signs of DVT"),
      chk("pe", "PE is the most likely diagnosis"),
      chk("hr", "Heart rate above 100"),
      chk(
        "imm",
        "Immobilisation for 3 days or more, or surgery in the past 4 weeks",
      ),
      chk("prev", "Previous PE or DVT"),
      chk("haem", "Haemoptysis"),
      chk("ca", "Malignancy (treated within 6 months, or palliative)"),
    ],
    out: "pts",
    f: (v) => {
      const t = tally([
        ["Clinical signs of DVT", v.dvt * 3],
        ["PE most likely diagnosis", v.pe * 3],
        ["Heart rate above 100", v.hr * 1.5],
        ["Immobilisation or recent surgery", v.imm * 1.5],
        ["Previous PE or DVT", v.prev * 1.5],
        ["Haemoptysis", v.haem],
        ["Malignancy", v.ca],
      ]);
      const band =
        t.val < 2
          ? "Low probability"
          : t.val <= 6
            ? "Moderate probability"
            : "High probability";
      return {
        ...t,
        note: `${band}. Two-tier: ${t.val > 4 ? "PE likely" : "PE unlikely"}.`,
      };
    },
  },
  {
    id: "wdvt",
    n: "Wells score for DVT",
    al: "wells dvt deep vein thrombosis probability leg swelling",
    s: "Risk scores",
    d: "Pre-test probability of deep vein thrombosis.",
    src: "Wells PS et al. Lancet 1997 (modified 2003)",
    in: [
      chk("ca", "Active cancer (treated within 6 months, or palliative)"),
      chk("par", "Paralysis, paresis or recent plaster cast of the leg"),
      chk("bed", "Bedridden 3 days or more, or major surgery within 12 weeks"),
      chk("tend", "Tenderness along the deep veins"),
      chk("leg", "Entire leg swollen"),
      chk("calf", "Calf swelling more than 3 cm larger than the other side"),
      chk("pit", "Pitting oedema in the symptomatic leg only"),
      chk("col", "Collateral superficial veins (not varicose)"),
      chk("prev", "Previously documented DVT"),
      chk("alt", "Alternative diagnosis at least as likely as DVT"),
    ],
    out: "pts",
    f: (v) => {
      const t = tally([
        ["Active cancer", v.ca],
        ["Paralysis or cast", v.par],
        ["Bedridden or major surgery", v.bed],
        ["Deep vein tenderness", v.tend],
        ["Entire leg swollen", v.leg],
        ["Calf swelling above 3 cm", v.calf],
        ["Pitting oedema", v.pit],
        ["Collateral superficial veins", v.col],
        ["Previous DVT", v.prev],
        ["Alternative diagnosis as likely", v.alt * -2],
      ]);
      const band =
        t.val >= 3
          ? "High probability"
          : t.val >= 1
            ? "Moderate probability"
            : "Low probability";
      return {
        ...t,
        note: `${band}. Two-tier: ${t.val >= 2 ? "DVT likely" : "DVT unlikely"}.`,
      };
    },
  },
  {
    id: "rcri",
    n: "Revised Cardiac Risk Index (RCRI)",
    al: "rcri lee index preoperative cardiac risk surgery non-cardiac",
    s: "Risk scores",
    d: "Risk of major cardiac complications after non-cardiac surgery.",
    src: "Lee TH et al. Circulation 1999",
    in: [
      chk(
        "surg",
        "High-risk surgery (intraperitoneal, intrathoracic or suprainguinal vascular)",
      ),
      chk("ihd", "Ischaemic heart disease"),
      chk("chf", "History of heart failure"),
      chk("cva", "History of stroke or TIA"),
      chk("dm", "Diabetes treated with insulin"),
      chk("cr", "Pre-operative creatinine above 2 mg/dL (177 µmol/L)"),
    ],
    out: "pts",
    f: (v) => {
      const t = tally([
        ["High-risk surgery", v.surg],
        ["Ischaemic heart disease", v.ihd],
        ["Heart failure", v.chf],
        ["Stroke or TIA", v.cva],
        ["Insulin-treated diabetes", v.dm],
        ["Creatinine above 2 mg/dL", v.cr],
      ]);
      return {
        ...t,
        note:
          t.val === 0
            ? "Lowest risk group"
            : t.val === 1
              ? "Elevated risk"
              : "Higher risk (2 or more): consider further cardiac assessment per your guideline",
      };
    },
    lim: "Developed for non-cardiac surgery. Current guidelines combine it with functional capacity and other tests.",
  },
  {
    id: "duke",
    n: "Duke treadmill score",
    al: "duke treadmill score exercise stress test bruce st depression angina",
    s: "Risk scores",
    d: "Prognosis after an exercise treadmill test, from exercise time, ST deviation and angina.",
    src: "Mark DB et al. N Engl J Med 1991",
    in: [
      {
        id: "tm",
        l: "Exercise time (Bruce protocol)",
        d: "min",
        min: 0,
        max: 30,
      },
      { id: "st", l: "Maximum ST deviation", d: "mm", min: 0, max: 10 },
      {
        id: "ang",
        l: "Angina during exercise",
        o: ["None", "Present, not limiting", "Exercise-limiting"],
      },
    ],
    out: "pts",
    dg: 1,
    f: (v) => {
      const x = v.tm - 5 * v.st - 4 * v.ang;
      return {
        val: x,
        steps: [
          `Score = time − 5 × ST deviation − 4 × angina index`,
          `= ${r(v.tm, 1)} − 5 × ${r(v.st, 1)} − 4 × ${r(v.ang, 0)} = ${r(x, 1)}`,
        ],
        note:
          x >= 5
            ? "Low risk (+5 or above)"
            : x >= -10
              ? "Moderate risk (−10 to +4)"
              : "High risk (−11 or below)",
      };
    },
  },

  // ---------------- Lipids ----------------
  {
    id: "ldl",
    n: "LDL cholesterol (Friedewald)",
    al: "ldl friedewald cholesterol lipid profile triglycerides",
    s: "Lipids",
    d: "Estimates LDL cholesterol from the standard lipid panel. Valid only while triglycerides are below 400 mg/dL (4.5 mmol/L).",
    src: "Friedewald WT et al. Clin Chem 1972",
    in: [
      { id: "tc", l: "Total cholesterol", d: "chol", min: 50, max: 500 },
      { id: "hdl", l: "HDL cholesterol", d: "chol", min: 10, max: 150 },
      { id: "tg", l: "Triglycerides", d: "tg", min: 10, max: 399 },
    ],
    out: "chol",
    dg: 1,
    f: (v) => {
      const x = v.tc - v.hdl - v.tg / 5;
      if (x < 0)
        return {
          err: "The result is negative. Please check the values entered.",
        };
      return {
        val: x,
        steps: [
          `VLDL ≈ triglycerides ÷ 5 = ${r(v.tg, 0)} ÷ 5 = ${r(v.tg / 5, 1)} mg/dL`,
          `LDL = total − HDL − VLDL = ${r(v.tc, 0)} − ${r(v.hdl, 0)} − ${r(v.tg / 5, 1)} = ${r(x, 1)} mg/dL`,
        ],
        note: "Targets depend on cardiovascular risk. Check your guideline.",
      };
    },
    lim: "Not valid when triglycerides are 400 mg/dL (4.5 mmol/L) or higher. Ask for a direct LDL measurement in that case.",
  },
  {
    id: "nhdl",
    n: "Non-HDL cholesterol",
    al: "non-hdl cholesterol lipid profile",
    s: "Lipids",
    d: "All the cholesterol carried in atherogenic particles: total cholesterol minus HDL.",
    src: "Standard lipid calculation",
    in: [
      { id: "tc", l: "Total cholesterol", d: "chol", min: 50, max: 500 },
      { id: "hdl", l: "HDL cholesterol", d: "chol", min: 10, max: 150 },
    ],
    out: "chol",
    dg: 1,
    f: (v) => {
      if (v.hdl >= v.tc)
        return { err: "HDL must be lower than total cholesterol." };
      const x = v.tc - v.hdl;
      return {
        val: x,
        steps: [
          `Non-HDL = total − HDL = ${r(v.tc, 0)} − ${r(v.hdl, 0)} = ${r(x, 0)} mg/dL`,
        ],
        note: "The target is usually set 30 mg/dL (0.8 mmol/L) above the LDL target.",
      };
    },
  },
];

// Gauge zones in BASE output units: [upper bound, colour key]. g green, a amber, r red.
export const cardioZG: Record<string, Zone> = {
  co: {
    min: 0,
    max: 12,
    z: [
      [4, "r"],
      [8, "g"],
      [12, "a"],
    ],
  },
  ci: {
    min: 0,
    max: 6,
    z: [
      [2.2, "r"],
      [2.5, "a"],
      [4, "g"],
      [6, "a"],
    ],
  },
  si: {
    min: 0.2,
    max: 2,
    z: [
      [0.9, "g"],
      [1, "a"],
      [2, "r"],
    ],
  },
  svr: {
    min: 0,
    max: 2000,
    z: [
      [800, "a"],
      [1200, "g"],
      [2000, "a"],
    ],
  },
  pvr: {
    min: 0,
    max: 800,
    z: [
      [160, "g"],
      [240, "a"],
      [800, "r"],
    ],
  },
  ef: {
    min: 0,
    max: 80,
    z: [
      [40, "r"],
      [50, "a"],
      [80, "g"],
    ],
  },
  fs: {
    min: 0,
    max: 60,
    z: [
      [25, "r"],
      [45, "g"],
      [60, "a"],
    ],
  },
  ava: {
    min: 0,
    max: 4,
    z: [
      [1, "r"],
      [1.5, "a"],
      [4, "g"],
    ],
  },
  qtcf: qtZone,
  qtck: qtZone,
  qtch: qtZone,
  hrs: {
    min: 20,
    max: 200,
    z: [
      [60, "a"],
      [100, "g"],
      [200, "r"],
    ],
  },
  cha: {
    min: 0,
    max: 9,
    z: [
      [1, "g"],
      [2, "a"],
      [9, "r"],
    ],
  },
  bled: {
    min: 0,
    max: 9,
    z: [
      [2, "g"],
      [3, "a"],
      [9, "r"],
    ],
  },
  heart: {
    min: 0,
    max: 10,
    z: [
      [4, "g"],
      [7, "a"],
      [10, "r"],
    ],
  },
  timi: {
    min: 0,
    max: 7,
    z: [
      [3, "g"],
      [5, "a"],
      [7, "r"],
    ],
  },
  wpe: {
    min: 0,
    max: 12.5,
    z: [
      [2, "g"],
      [6.5, "a"],
      [12.5, "r"],
    ],
  },
  wdvt: {
    min: -2,
    max: 9,
    z: [
      [1, "g"],
      [3, "a"],
      [9, "r"],
    ],
  },
  rcri: {
    min: 0,
    max: 6,
    z: [
      [1, "g"],
      [2, "a"],
      [6, "r"],
    ],
  },
  duke: {
    min: -25,
    max: 20,
    z: [
      [-10, "r"],
      [5, "a"],
      [20, "g"],
    ],
  },
};

// Body-system chips: icon and colour hue for each new group.
export const cardioIC: Record<string, string> = {
  Haemodynamics: "heart",
  Echo: "echo",
  ECG: "ecg",
  "Risk scores": "target",
  Lipids: "lipids",
};
export const cardioHU: Record<string, number> = {
  Haemodynamics: 350,
  Echo: 190,
  ECG: 135,
  "Risk scores": 300,
  Lipids: 25,
};
