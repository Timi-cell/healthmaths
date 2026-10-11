import { describe, expect, it } from "vitest";
import { F } from "../lib/formulas";
import { formatResultForCopy } from "../lib/share";

describe("copying a calculated result", () => {
  it("formats the result, inputs, interpretation, and calculator link on separate lines", () => {
    const formula = F.find((item) => item.id === "map");
    if (!formula) throw new Error("MAP formula is missing.");

    expect(
      formatResultForCopy(
        formula,
        "93 mmHg",
        { s: "120", dd: "80" },
        {},
        "Within the usual target range",
        "https://healthmaths.example/?f=map",
      ),
    ).toBe(
      "Mean arterial pressure (MAP): 93 mmHg\n" +
        "Inputs: Systolic BP 120 mmHg; Diastolic BP 80 mmHg\n" +
        "Interpretation: Within the usual target range\n" +
        "Calculated with HealthMaths: https://healthmaths.example/?f=map",
    );
  });

  it("omits the interpretation line when a formula has no interpretation", () => {
    const formula = F.find((item) => item.id === "map");
    if (!formula) throw new Error("MAP formula is missing.");

    const copied = formatResultForCopy(
      formula,
      "93 mmHg",
      { s: "120", dd: "80" },
      {},
      undefined,
      "https://healthmaths.example/?f=map",
    );

    expect(copied.split("\n")).toHaveLength(3);
    expect(copied).not.toContain("Interpretation:");
  });
});
