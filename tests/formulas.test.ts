import { describe, expect, it } from 'vitest';
import { F, GC, HU, IC, ZG, type V } from '../lib/formulas';
import { U } from '../lib/units';

const run = (id: string, v: V) => {
  const f = F.find((x) => x.id === id)!;
  const res = f.f(v);
  if ('err' in res) throw new Error(res.err);
  return res;
};

// Worked examples, calculated by hand. Inputs are in BASE units (kg, cm, mmHg, ms, mg/dL, g/dL, mmol/L).
describe('formula maths', () => {
  it('BMI: 70 kg, 175 cm', () => expect(run('bmi', { w: 70, h: 175 }).val).toBeCloseTo(22.86, 2));
  it('BSA (Mosteller): 70 kg, 175 cm', () => expect(run('bsa', { w: 70, h: 175 }).val).toBeCloseTo(1.845, 3));
  it('MAP: 120/80', () => expect(run('map', { s: 120, dd: 80 }).val).toBeCloseTo(93.33, 2));
  it('MAP rejects diastolic >= systolic', () => expect(F.find((f) => f.id === 'map')!.f({ s: 80, dd: 120 })).toHaveProperty('err'));
  it('QTc (Bazett): QT 400 ms, HR 75', () => expect(run('qtc', { qt: 400, hr: 75 }).val).toBeCloseTo(447.21, 2));
  it('P/F ratio: PaO2 90 mmHg on 40%', () => expect(run('pf', { pa: 90, fi: 40 }).val).toBeCloseTo(225, 5));
  it('Cockcroft-Gault, male: 60 y, 70 kg, Cr 1.0', () => expect(run('crcl', { a: 60, w: 70, c: 1, x: 0 }).val).toBeCloseTo(77.78, 2));
  it('Cockcroft-Gault, female is x0.85', () => expect(run('crcl', { a: 60, w: 70, c: 1, x: 1 }).val).toBeCloseTo(66.11, 2));
  it('Anion gap: Na 140, Cl 104, HCO3 24', () => expect(run('ag', { na: 140, cl: 104, hc: 24 }).val).toBe(12));
  it('Corrected calcium: Ca 8.0, albumin 2.0 g/dL', () => expect(run('cca', { ca: 8, al: 2 }).val).toBeCloseTo(9.6, 5));
  it.each([[8, 32], [10, 40], [15, 50], [20, 60], [25, 65]])('4-2-1 fluids: %i kg -> %i mL/hr', (w, ml) =>
    expect(run('fl', { w }).val).toBe(ml));
  it('Weight-based dose: 20 kg x 15 mg/kg', () => expect(run('dose', { w: 20, dk: 15 }).val).toBe(300));
});

describe('unit conversions (base = value x factor)', () => {
  it('creatinine 88.4 umol/L = 1 mg/dL', () => expect(88.4 * U.cr['µmol/L']).toBeCloseTo(1, 5));
  it('calcium 2.5 mmol/L = 10.02 mg/dL', () => expect(2.5 * U.ca['mmol/L']).toBeCloseTo(10.02, 2));
  it('albumin 40 g/L = 4 g/dL', () => expect(40 * U.alb['g/L']).toBeCloseTo(4, 5));
  it('120 mmHg = 16.0 kPa', () => expect(120 / U.press.kPa).toBeCloseTo(16, 1));
  it('154 lb = 69.85 kg', () => expect(154 * U.mass.lb).toBeCloseTo(69.85, 2));
  it('6 ft = 182.88 cm', () => expect(6 * U.len.ft).toBeCloseTo(182.88, 2));
  it('mcg/kg dose is 1/1000 of mg/kg', () => expect(U.dose['mcg/kg']).toBe(0.001));
  it('65 mL/hr = 1560 mL/day', () => expect(65 / U.rate['mL/day']).toBeCloseTo(1560, 5));
});

describe('registry integrity (catches mistakes when you add formulas)', () => {
  it('ids are unique', () => expect(new Set(F.map((f) => f.id)).size).toBe(F.length));
  it('every dimension and output unit exists', () => {
    for (const f of F) {
      expect(U[f.out], `${f.id} out`).toBeDefined();
      for (const i of f.in) if (!i.o) expect(U[i.d ?? ''], `${f.id}.${i.id}`).toBeDefined();
    }
  });
  it('every formula has a source, a description and a styled body system', () => {
    for (const f of F) {
      expect(f.src.length).toBeGreaterThan(3);
      expect(f.d.length).toBeGreaterThan(10);
      expect(IC[f.s], f.s).toBeDefined();
      expect(HU[f.s], f.s).toBeDefined();
    }
  });
  it('every formula runs at mid-range inputs and explains its steps', () => {
    for (const f of F) {
      const v: V = {};
      for (const i of f.in) v[i.id] = i.o ? 0 : ((i.min ?? 0) + (i.max ?? 0)) / 2;
      const res = f.f(v);
      expect('err' in res, `${f.id} returned an error`).toBe(false);
      if ('steps' in res) {
        expect(res.steps.length).toBeGreaterThan(0);
        expect(Number.isFinite(res.val), f.id).toBe(true);
      }
    }
  });
  it('gauge zones are ascending, end at max, and use known colours', () => {
    for (const [id, g] of Object.entries(ZG)) {
      expect(F.some((f) => f.id === id), `${id} not a formula`).toBe(true);
      let prev = g.min;
      for (const [to, c] of g.z) { expect(to).toBeGreaterThan(prev); expect(GC[c]).toBeDefined(); prev = to; }
      expect(prev).toBe(g.max);
    }
  });
});
