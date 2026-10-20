import { MODES } from "./defaults";
import type { SimulationParams } from "./types";
export type Errors = Partial<Record<keyof SimulationParams, string>>;
export function validateParams(p: SimulationParams): Errors {
  const errors: Errors = {};
  const range = (
    key: keyof SimulationParams,
    low: number,
    high: number,
    integer = false,
  ) => {
    const v = p[key];
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      v < low ||
      v > high ||
      (integer && !Number.isInteger(v))
    )
      errors[key] =
        `יש להזין ${integer ? "מספר שלם " : "ערך "}בין ${low.toLocaleString("he-IL")} ל־${high.toLocaleString("he-IL")}`;
  };
  range("initialInvestment", 1, 1e9);
  range("years", 1, 100, true);
  range("paths", 100, 100000, true);
  range("annualDrift", -1, 1);
  range("annualVolatility", 0, 2);
  range("degreesOfFreedom", 2.01, 100);
  range("inflation", -0.05, 0.2);
  range("seed", 0, 4294967295, true);
  range("tradingDays", 1, 366, true);
  range("cvarPercentile", 0.01, 0.25);
  range("positiveTailPercentile", 0.01, 0.25);
  if (
    !Array.isArray(p.rates) ||
    p.rates.length < 1 ||
    p.rates.length > 6 ||
    p.rates.some((r) => !Number.isFinite(r) || r < 0 || r > 1) ||
    new Set(p.rates).size !== p.rates.length
  )
    errors.rates =
      "יש להזין 1–6 שיעורי משיכה שונים בין 0% ל־100%, מופרדים בפסיקים";
  if (
    !Array.isArray(p.modes) ||
    !p.modes.length ||
    p.modes.some((m) => !MODES.includes(m)) ||
    new Set(p.modes).size !== p.modes.length
  )
    errors.modes = "יש לבחור לפחות שיטת משיכה אחת";
  if (!["beginning", "end"].includes(p.timing))
    errors.timing = "יש לבחור מועד משיכה";
  return errors;
}
