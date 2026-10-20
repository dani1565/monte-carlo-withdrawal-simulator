import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../simulation/defaults";
import { decodeParams, encodeParams, parseParams } from "./parameters";
import { validateParams } from "../simulation/validation";
describe("parameter boundaries and storage", () => {
  it("round trips all inputs, without using leverage simulator storage", () => {
    expect(decodeParams(encodeParams(DEFAULT_PARAMS))).toEqual(DEFAULT_PARAMS);
    expect(decodeParams("?scenario=broken&v=1")).toBeNull();
    expect(decodeParams("?v=2&scenario={}")).toBeNull();
    expect(parseParams(null)).toBeNull();
    expect(parseParams([])).toBeNull();
    expect(parseParams({})).toBeNull();
  });
  it.each([
    { rates: [] },
    { rates: [0.04, 0.04] },
    { rates: [NaN] },
    { modes: [] },
    { modes: ["other"] },
    { timing: "middle" },
    { inflation: NaN },
    { years: 1.5 },
    { paths: 99 },
    { degreesOfFreedom: 2 },
    { seed: -1 },
    { rates: Array(7).fill(0.04) },
  ])("rejects invalid data %j", (change) => {
    expect(
      Object.keys(
        validateParams({
          ...DEFAULT_PARAMS,
          ...change,
        } as typeof DEFAULT_PARAMS),
      ).length,
    ).toBeGreaterThan(0);
    expect(parseParams({ ...DEFAULT_PARAMS, ...change })).toBeNull();
  });
  it("accepts allowed extremes and arbitrary user entered rates", () => {
    expect(
      validateParams({
        ...DEFAULT_PARAMS,
        rates: [0, 0.0375, 1],
        years: 100,
        paths: 100000,
        inflation: -0.05,
        annualDrift: -1,
        annualVolatility: 2,
        degreesOfFreedom: 2.01,
        tradingDays: 1,
        seed: 4294967295,
      }),
    ).toEqual({});
  });
});
