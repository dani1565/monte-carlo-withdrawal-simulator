import type { HistogramBin } from "./types";

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentile(sortedValues: number[], p: number): number {
  if (!sortedValues.length) return 0;
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return (
    sortedValues[lower] +
    (sortedValues[Math.min(lower + 1, sortedValues.length - 1)] -
      sortedValues[lower]) *
      fraction
  );
}

export function expectedShortfall(
  sortedValues: number[],
  percentileValue: number,
): number {
  if (!sortedValues.length) return 0;
  const count = Math.max(1, Math.ceil(sortedValues.length * percentileValue));
  return mean(sortedValues.slice(0, count));
}

export function expectedUpside(
  sortedValues: number[],
  percentileValue: number,
): number {
  if (!sortedValues.length) return 0;
  const count = Math.max(1, Math.ceil(sortedValues.length * percentileValue));
  return mean(sortedValues.slice(-count));
}

export function createHistogram(
  values: number[],
  binCount = 28,
): HistogramBin[] {
  const positive = values.filter((value) => value > 0);
  if (!positive.length) return [];
  // Keep arbitrarily small positive balances distinct from true depletion.
  // Avoid spreading a user-controlled sample size into function arguments.
  const minLog = Math.log10(
    positive.reduce((a, b) => Math.min(a, b), Infinity),
  );
  const maxLog = Math.log10(positive.reduce((a, b) => Math.max(a, b), 0));
  const span = Math.max(maxLog - minLog, 0.01);
  const bins = Array.from({ length: binCount }, (_, index) => ({
    from: Math.pow(10, minLog + (index / binCount) * span),
    to: Math.pow(10, minLog + ((index + 1) / binCount) * span),
    count: 0,
  }));
  positive.forEach((value) => {
    const index = Math.min(
      binCount - 1,
      Math.floor(((Math.log10(value) - minLog) / span) * binCount),
    );
    bins[Math.max(0, index)].count += 1;
  });
  return bins;
}
