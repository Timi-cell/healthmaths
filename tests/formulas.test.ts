import { describe, expect, it } from "vitest";
import { F, GC, HU, IC, ZG, type V } from "../lib/formulas";
import { U } from "../lib/units";

const run = (id: string, v: V) => {
  const f = F.find((x) => x.id === id)!;
  const res = f.f(v);
  if ("err" in res) throw new Error(res.err);
  return res;
};

// Worked examples, calculated by hand. Inputs are in BASE units (kg, cm, mmHg, ms, mg/dL, g/dL, mmol/L).
describe("formula maths", () => {
  it("BMI: 70 kg, 175 cm", () =>
    expect(run("bmi", { w: 70, h: 175 }).val).toBeCloseTo(22.86, 2));
  it("BSA (Mosteller): 70 kg, 175 cm", () =>
    expect(run("bsa", { w: 70, h: 175 }).val).toBeCloseTo(1.845, 3));
  it("MAP: 120/80", () =>
    expect(run("map", { s: 120, dd: 80 }).val).toBeCloseTo(93.33, 2));
  it("MAP rejects diastolic >= systolic", () =>
    expect(F.find((f) => f.id === "map")!.f({ s: 80, dd: 120 })).toHaveProperty(
      "err",
    ));
  it("QTc (Bazett): QT 400 ms, HR 75", () =>
    expect(run("qtc", { qt: 400, hr: 75 }).val).toBeCloseTo(447.21, 2));
  it("P/F ratio: PaO2 90 mmHg on 40%", () =>
    expect(run("pf", { pa: 90, fi: 40 }).val).toBeCloseTo(225, 5));
  it("Pack-years: 40 cigarettes/day for 15 years", () => {
    const result = run("pky", { c: 40, y: 15 });
    expect(result.val).toBe(30);
    expect(result.note).toContain("20 or more pack-years");
  });
  it("eGFR CKD-EPI 2021: female, 60 y, creatinine 1 mg/dL", () =>
    expect(run("egfr", { a: 60, c: 1, x: 0 }).val).toBeCloseTo(64.5, 0));
  it("ANC: WBC 5.2, neutrophils 60%, bands 2%", () =>
    expect(run("anc", { w: 5.2, n: 60, b: 2 }).val).toBeCloseTo(3.224, 3));
  it("FENa: urine Na 40, serum Na 140, urine Cr 100, serum Cr 1", () =>
    expect(run("fena", { un: 40, sn: 140, uc: 100, sc: 1 }).val).toBeCloseTo(
      0.286,
      3,
    ));
  it("Glasgow-Blatchford: lowest-risk inputs score 0", () =>
    expect(
      run("gbs", { u: 5, h: 13, x: 0, s: 120, p: 80, m: 0, y: 0, l: 0, f: 0 })
        .val,
    ).toBe(0));
  it("GCS adds eye, verbal and motor scores", () =>
    expect(run("gcs", { e: 3, v: 4, m: 5 }).val).toBe(15));
  it("PHQ-2 sums the two item scores", () =>
    expect(run("phq2", { i: 2, d: 1 }).val).toBe(3));
  it("spherical equivalent is sphere plus half cylinder", () =>
    expect(run("se", { s: -1.5, c: -1 }).val).toBe(-2));
  it("TUG reports the entered test time", () =>
    expect(run("tug", { t: 14 }).note).toContain("13.5 seconds"));
  it("6MWT records distance in base metres", () =>
    expect(run("sixmwd", { d: 420 }).val).toBe(420));
  it("outcome score improvement respects lower-is-better direction", () =>
    expect(run("outcome-change", { b: 8, f: 4, direction: 0 }).val).toBe(50));
  it("outcome score worsening is reported as a negative change", () =>
    expect(run("outcome-change", { b: 8, f: 12, direction: 0 }).val).toBe(-50));
  it("gait speed uses the measured distance and time", () =>
    expect(run("gait-speed", { d: 10, t: 8 }).val).toBe(1.25));
  it("30-second chair stand records the completed repetitions", () =>
    expect(run("chair-stand-30", { reps: 12 }).val).toBe(12));
  it("IV drip rate converts a 1 L / 8 h infusion using a 20 gtt/mL set", () =>
    expect(run("ivdrip", { v: 1000, t: 480, g: 2 }).val).toBeCloseTo(41.67, 2));
  it("estimated due date adds 280 days to LMP", () => {
    const lmp = Date.parse("2024-01-01T00:00:00Z") / 86400000;
    expect(run("edd", { lmp }).val).toBe(lmp + 280);
  });
  it("gestational age reports completed weeks and days from LMP", () => {
    const today = Math.floor(Date.now() / 86400000);
    const result = run("gest-age", { lmp: today - 86 });
    expect(result.val).toBeCloseTo(86 / 7, 5);
    expect(result.steps).toContain("Completed weeks = 12 weeks");
    expect(result.steps).toContain("Remaining days = 2 days");
  });
  it("gestational age rejects an LMP date in the future", () => {
    const today = Math.floor(Date.now() / 86400000);
    expect(
      F.find((f) => f.id === "gest-age")!.f({ lmp: today + 1 }),
    ).toHaveProperty("err");
  });
  it("Cockcroft-Gault, male: 60 y, 70 kg, Cr 1.0", () =>
    expect(run("crcl", { a: 60, w: 70, c: 1, x: 0 }).val).toBeCloseTo(
      77.78,
      2,
    ));
  it("Cockcroft-Gault, female is x0.85", () =>
    expect(run("crcl", { a: 60, w: 70, c: 1, x: 1 }).val).toBeCloseTo(
      66.11,
      2,
    ));
  it("Anion gap: Na 140, Cl 104, HCO3 24", () =>
    expect(run("ag", { na: 140, cl: 104, hc: 24 }).val).toBe(12));
  it("Corrected calcium: Ca 8.0, albumin 2.0 g/dL", () =>
    expect(run("cca", { ca: 8, al: 2 }).val).toBeCloseTo(9.6, 5));
  it.each([
    [8, 32],
    [10, 40],
    [15, 50],
    [20, 60],
    [25, 65],
  ])("4-2-1 fluids: %i kg -> %i mL/hr", (w, ml) =>
    expect(run("fl", { w }).val).toBe(ml),
  );
  it("NEWS2: normal observations score zero", () =>
    expect(
      run("news2", {
        rr: 16,
        sp: 98,
        scale: 0,
        oxygen: 0,
        sbp: 120,
        hr: 75,
        temp: 37,
        consciousness: 0,
      }).val,
    ).toBe(0));
  it("NEWS2: a single severe parameter triggers an alert note", () => {
    const result = run("news2", {
      rr: 25,
      sp: 98,
      scale: 0,
      oxygen: 0,
      sbp: 120,
      hr: 75,
      temp: 37,
      consciousness: 0,
    });
    expect(result.val).toBe(3);
    expect(result.note).toContain("single parameter scores 3");
  });
  it("NEWS2: Scale 2 and supplemental oxygen use the prescribed score bands", () =>
    expect(
      run("news2", {
        rr: 16,
        sp: 90,
        scale: 1,
        oxygen: 1,
        sbp: 120,
        hr: 75,
        temp: 37,
        consciousness: 0,
      }).val,
    ).toBe(2));
  it("Winter formula: bicarbonate 24 mmol/L gives expected PaCO2 44 mmHg", () =>
    expect(run("winters", { hco3: 24 }).val).toBe(44));
  it("corrected sodium: 140 mmol/L sodium at 11.2 mmol/L glucose gives 141.6", () =>
    expect(run("corrected-na", { na: 140, glucose: 11.2 }).val).toBeCloseTo(
      141.6,
      5,
    ));
});

describe("unit conversions (base = value x factor)", () => {
  it("creatinine 88.4 umol/L = 1 mg/dL", () =>
    expect(88.4 * U.cr["µmol/L"]).toBeCloseTo(1, 5));
  it("calcium 2.5 mmol/L = 10.02 mg/dL", () =>
    expect(2.5 * U.ca["mmol/L"]).toBeCloseTo(10.02, 2));
  it("albumin 40 g/L = 4 g/dL", () =>
    expect(40 * U.alb["g/L"]).toBeCloseTo(4, 5));
  it("120 mmHg = 16.0 kPa", () => expect(120 / U.press.kPa).toBeCloseTo(16, 1));
  it("154 lb = 69.85 kg", () => expect(154 * U.mass.lb).toBeCloseTo(69.85, 2));
  it("6 ft = 182.88 cm", () => expect(6 * U.len.ft).toBeCloseTo(182.88, 2));
  it("65 mL/hr = 1560 mL/day", () =>
    expect(65 / U.rate["mL/day"]).toBeCloseTo(1560, 5));
});

describe("registry integrity (catches mistakes when you add formulas)", () => {
  it("ids are unique", () =>
    expect(new Set(F.map((f) => f.id)).size).toBe(F.length));
  it("every dimension and output unit exists", () => {
    for (const f of F) {
      expect(U[f.out], `${f.id} out`).toBeDefined();
      for (const i of f.in)
        if (!i.o && i.type !== "date")
          expect(U[i.d ?? ""], `${f.id}.${i.id}`).toBeDefined();
    }
  });
  it("every formula has a source, a description and a styled body system", () => {
    for (const f of F) {
      expect(f.src.length).toBeGreaterThan(3);
      expect(f.d.length).toBeGreaterThan(10);
      expect(IC[f.s], f.s).toBeDefined();
      expect(HU[f.s], f.s).toBeDefined();
      expect(f.math, `${f.id} equation`).toBeDefined();
      expect(f.systems?.length, `${f.id} body system tags`).toBeGreaterThan(0);
      expect(f.departments?.length, `${f.id} department tags`).toBeGreaterThan(
        0,
      );
    }
  });
  it("groups cardiovascular topics under one body-system category", () => {
    const topics = new Set([
      "Haemodynamics",
      "Echo",
      "ECG",
      "Risk scores",
      "Lipids",
    ]);
    const cardiovascular = F.filter((f) => topics.has(f.s));
    expect(cardiovascular.length).toBeGreaterThan(0);
    expect(
      cardiovascular.every((f) => f.systems?.[0] === "Cardiovascular"),
    ).toBe(true);
  });
  it("lists maintenance fluids under Paediatrics and Surgery", () =>
    expect(F.find((f) => f.id === "fl")?.departments).toEqual([
      "Paediatrics",
      "Surgery",
    ]));
  it("cross-lists other common calculations by their clinical services", () => {
    const departments = (id: string) =>
      F.find((f) => f.id === id)?.departments ?? [];
    expect(departments("gbs")).toEqual([
      "Gastroenterology",
      "Emergency Medicine",
      "Surgery",
    ]);
    expect(departments("egfr")).toEqual(["Medicine", "Nephrology"]);
    expect(departments("tug")).toEqual([
      "Physiotherapy",
      "Rehabilitation Medicine",
    ]);
  });
  it("does not expose cardiovascular subtopics or old category abbreviations as filters", () => {
    const systems = new Set(F.flatMap((f) => f.systems ?? []));
    const departments = F.flatMap((f) => f.departments ?? []);
    expect(
      ["Haemodynamics", "Echo", "ECG", "Risk scores", "Lipids"].some((x) =>
        systems.has(x),
      ),
    ).toBe(false);
    expect(departments.some((x) => x.includes("(O&G)"))).toBe(false);
  });
  it("does not publish the paused pharmacology category", () => {
    expect(F.some((f) => f.s === "Pharmacology")).toBe(false);
    expect(F.some((f) => f.id === "dose")).toBe(false);
  });
  it("every formula runs at mid-range inputs and explains its steps", () => {
    for (const f of F) {
      const v: V = {};
      for (const i of f.in)
        v[i.id] = i.o ? 0 : ((i.min ?? 0) + (i.max ?? 0)) / 2;
      const res = f.f(v);
      expect("err" in res, `${f.id} returned an error`).toBe(false);
      if ("steps" in res) {
        expect(res.steps.length).toBeGreaterThan(0);
        expect(Number.isFinite(res.val), f.id).toBe(true);
      }
    }
  });
  it("gauge zones are ascending, end at max, and use known colours", () => {
    for (const [id, g] of Object.entries(ZG)) {
      expect(
        F.some((f) => f.id === id),
        `${id} not a formula`,
      ).toBe(true);
      let prev = g.min;
      for (const [to, c] of g.z) {
        expect(to).toBeGreaterThan(prev);
        expect(GC[c]).toBeDefined();
        prev = to;
      }
      expect(prev).toBe(g.max);
    }
  });
});
