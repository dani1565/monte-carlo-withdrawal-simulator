import { describe, expect, it } from "vitest";
import {
  createHistogram,
  expectedShortfall,
  expectedUpside,
  percentile,
} from "./statistics";
describe("distribution summaries", () => {
  it("includes zeros in tails and percentiles", () => {
    expect(expectedShortfall([0, 0, 100, 200], 0.25)).toBe(0);
    expect(expectedUpside([0, 0, 100, 200], 0.25)).toBe(200);
    expect(percentile([0, 0, 100, 200], 0.5)).toBe(50);
  });
  it("bins all positive values, including amounts smaller than a cent", () => {
    const values = [0, 1e-8, 1e-7, 1e-6, 0.001, 1, 10];
    const bins = createHistogram(values);
    expect(bins.reduce((n, b) => n + b.count, 0)).toBe(values.length - 1);
    expect(bins[0].from).toBeLessThanOrEqual(1e-8);
    expect(bins.at(-1)!.to).toBeGreaterThanOrEqual(10);
  });
  it("handles empty, all zero, and large samples", () => {
    expect(createHistogram([0, 0])).toEqual([]);
    expect(
      createHistogram(Array(100000).fill(5)).reduce((n, b) => n + b.count, 0),
    ).toBe(100000);
  });
});
