// Everything is saved on the user's own device (localStorage). No accounts, no server, no mobile data.
export type Entry = {
  id: string;
  fid: string;
  n: string;
  t: string;
  at: number;
  vals: Record<string, string>;
  units: Record<string, string>;
};
export type Used = Record<string, { count: number; last: number }>;

export const KEYS = {
  history: "healthmaths:v1:history",
  used: "healthmaths:v1:used",
  theme: "healthmaths:v1:theme",
  calculations: "healthmaths:v1:calculations",
};
export const MAX_HISTORY = 50;

export function load<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

// Add a result to history. Same formula + same result moves to the top instead of duplicating.
export function addEntry(list: Entry[], e: Entry): Entry[] {
  return [e, ...list.filter((x) => !(x.fid === e.fid && x.t === e.t))].slice(
    0,
    MAX_HISTORY,
  );
}

export function ago(at: number, now = Date.now()): string {
  const m = Math.floor((now - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} d ago` : new Date(at).toLocaleDateString();
}
