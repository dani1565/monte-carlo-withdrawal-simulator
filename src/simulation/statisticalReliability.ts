export type StatisticalWarningLevel = "strong" | "moderate" | null;

const WILSON_95_Z = 1.959963984540054;

export function tailObservationCount(
  paths: number,
  percentile: number,
): number {
  return Math.max(1, Math.ceil(paths * percentile));
}

export function degreesOfFreedomWarningLevel(
  degreesOfFreedom: number,
): StatisticalWarningLevel {
  if (degreesOfFreedom < 3) return "strong";
  if (degreesOfFreedom <= 4) return "moderate";
  return null;
}

export function tailObservationWarningLevel(
  observations: number,
): StatisticalWarningLevel {
  if (observations < 30) return "strong";
  if (observations < 100) return "moderate";
  return null;
}

export function eventCountWarningLevel(
  events: number,
): StatisticalWarningLevel {
  if (events < 25) return "strong";
  if (events < 100) return "moderate";
  return null;
}

export function wilson95Interval(
  successes: number,
  sampleSize: number,
): { lower: number; upper: number } {
  if (!Number.isInteger(sampleSize) || sampleSize <= 0)
    throw new RangeError("sampleSize must be a positive integer");
  if (!Number.isInteger(successes) || successes < 0 || successes > sampleSize)
    throw new RangeError(
      "successes must be an integer between 0 and sampleSize",
    );

  const rate = successes / sampleSize;
  const squaredZ = WILSON_95_Z ** 2;
  const denominator = 1 + squaredZ / sampleSize;
  const center = (rate + squaredZ / (2 * sampleSize)) / denominator;
  const halfWidth =
    (WILSON_95_Z / denominator) *
    Math.sqrt(
      (rate * (1 - rate)) / sampleSize + squaredZ / (4 * sampleSize ** 2),
    );

  return {
    lower: successes === 0 ? 0 : Math.max(0, center - halfWidth),
    upper: successes === sampleSize ? 1 : Math.min(1, center + halfWidth),
  };
}
