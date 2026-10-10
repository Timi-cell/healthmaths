// Each unit maps to a factor that converts it into the base unit of its dimension.
// base = typed value x factor.  shown value = base / factor.
export const U: Record<string, Record<string, number>> = {
  mass: { kg: 1, lb: 0.45359237, g: 0.001 },
  len: { cm: 1, m: 100, in: 2.54, ft: 30.48 },
  pressure: { mmHg: 1, kPa: 7.50062 },
  press: { mmHg: 1, kPa: 7.50062 },
  flow: { "L/min": 1, "mL/min": 0.001 },
  time: { ms: 1, s: 1000 },
  cr: { "mg/dL": 1, "µmol/L": 1 / 88.4 },
  ca: { "mg/dL": 1, "mmol/L": 4.008 },
  alb: { "g/dL": 1, "g/L": 0.1 },
  dose: { "mg/kg": 1, "mcg/kg": 0.001 },
  mmol: { "mmol/L": 1 },
  yr: { years: 1 },
  bpm: { bpm: 1 },
  pct: { "%": 1 },
  amt: { mg: 1, mcg: 0.001, g: 1000 },
  rate: { "mL/hr": 1, "mL/day": 1 / 24 },
  area: { "m²": 1 },
  idx: { "kg/m²": 1 },
  crcl: { "mL/min": 1 },
  ratio: { mmHg: 1 },
};

export const r = (x: number, d = 1): string =>
  x.toFixed(d).replace(/\.0+$/, "");


// Cardiology dimensions (base unit is the first one listed, factor 1)
Object.assign(U, {
  flow: { 'L/min': 1, 'mL/min': 0.001 },
  ci: { 'L/min/m²': 1 },
  vol: { mL: 1, L: 1000 },
  res: { 'dyn·s/cm⁵': 1, 'Wood units': 80 },
  hb: { 'g/dL': 1, 'g/L': 0.1 },
  do2: { 'mL O₂/min': 1 },
  si: { 'HR ÷ SBP': 1 },
  mm: { mm: 1, cm: 10 },
  vel: { 'm/s': 1, 'cm/s': 0.01 },
  vti: { cm: 1, mm: 0.1 },
  cm2: { 'cm²': 1, 'mm²': 0.01 },
  sq: { squares: 1 },
  pts: { points: 1 },
  min: { min: 1 },
  chol: { 'mg/dL': 1, 'mmol/L': 38.67 },
  tg: { 'mg/dL': 1, 'mmol/L': 88.57 },
});