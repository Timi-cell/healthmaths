import { describe, expect, it } from "vitest";
import { MAX_HISTORY, addEntry, ago, type Entry } from "../lib/store";

const e = (fid: string, t: string, at = 1): Entry => ({
  id: `${at}-${fid}`,
  fid,
  n: fid,
  t,
  at,
  vals: {},
  units: {},
});

describe("history", () => {
  it("newest first", () =>
    expect(
      addEntry([e("bmi", "22 kg/m²")], e("map", "93 mmHg")).map((x) => x.fid),
    ).toEqual(["map", "bmi"]));
  it("same formula + same result moves to top, no duplicate", () => {
    const l = addEntry(addEntry([], e("bmi", "22")), e("map", "93"));
    expect(addEntry(l, e("bmi", "22", 5)).map((x) => x.fid)).toEqual([
      "bmi",
      "map",
    ]);
  });
  it("same formula, different result is kept", () =>
    expect(addEntry([e("bmi", "22")], e("bmi", "30")).length).toBe(2));
  it(`caps at ${MAX_HISTORY}`, () => {
    let l: Entry[] = [];
    for (let i = 0; i < MAX_HISTORY + 10; i++)
      l = addEntry(l, e("bmi", String(i), i));
    expect(l.length).toBe(MAX_HISTORY);
  });
});

describe("ago", () => {
  const now = 1_000_000_000_000;
  it("just now", () => expect(ago(now - 20_000, now)).toBe("just now"));
  it("minutes", () => expect(ago(now - 5 * 60_000, now)).toBe("5 min ago"));
  it("hours", () => expect(ago(now - 3 * 3_600_000, now)).toBe("3 h ago"));
  it("days", () => expect(ago(now - 2 * 86_400_000, now)).toBe("2 d ago"));
});
