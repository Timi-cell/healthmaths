import { U } from "./units";
import type { Formula } from "./formulas";

export function formatResultForCopy(
  formula: Formula,
  result: string,
  values: Record<string, string>,
  units: Record<string, string>,
  interpretation: string | undefined,
  url: string,
) {
  const inputs = formula.in
    .map((input) => {
      const value = values[input.id] ?? input.o?.[0] ?? "";
      const unit = input.o
        ? ""
        : (units[input.id] ?? input.u ?? Object.keys(U[input.d ?? ""])[0]);
      return `${input.l} ${value}${unit ? ` ${unit}` : ""}`;
    })
    .join("; ");
  const lines = [`${formula.n}: ${result}`, `Inputs: ${inputs}`];

  if (interpretation) lines.push(`Interpretation: ${interpretation}`);
  lines.push(`Calculated with HealthMaths: ${url}`);
  return lines.join("\n");
}
