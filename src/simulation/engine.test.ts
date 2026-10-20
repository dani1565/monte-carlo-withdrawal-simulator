import { describe, expect, it } from "vitest";
import { simulate, scheduledWithdrawal } from "./engine";
import { DEFAULT_PARAMS } from "./defaults";
import type { SimulationParams } from "./types";

const base: SimulationParams = {
  ...DEFAULT_PARAMS,
  initialInvestment: 1000,
  years: 3,
  paths: 100,
  tradingDays: 4,
  annualDrift: 0,
  annualVolatility: 0,
  rates: [0.1],
  modes: ["fixed", "inflation", "percentage"],
  inflation: 0.1,
};

describe("annual withdrawals", () => {
  it("keeps nominal payments fixed and compounds indexed payments from year two", () => {
    expect(scheduledWithdrawal(base, "fixed", 0.1, 3, 800)).toBe(100);
    expect(scheduledWithdrawal(base, "inflation", 0.1, 1, 1000)).toBe(100);
    expect(scheduledWithdrawal(base, "inflation", 0.1, 3, 800)).toBeCloseTo(
      121,
    );
    expect(scheduledWithdrawal(base, "percentage", 0.1, 3, 800)).toBe(80);
  });
  it("matches closed form balances and actual cash received without returns", () => {
    const r = simulate(base).results;
    expect(r[0].median).toBeCloseTo(700);
    expect(r[0].totalWithdrawnMedian).toBeCloseTo(300);
    expect(r[1].median).toBeCloseTo(669);
    expect(r[1].totalWithdrawnMedian).toBeCloseTo(331);
    expect(r[2].median).toBeCloseTo(729);
    expect(r[2].lastIncomeMedian).toBeCloseTo(81);
    expect(r[0].realMedian).toBeCloseTo(700 / 1.1 ** 3);
    expect(r[1].realTotalWithdrawnMedian).toBeCloseTo(300);
  });
  it("distinguishes full funding from depletion, including exact final payment", () => {
    const exact = simulate({
      ...base,
      years: 2,
      rates: [0.5],
      modes: ["fixed"],
    }).results[0];
    expect(exact.successRate).toBe(1);
    expect(exact.depletedCount).toBe(100);
    expect(exact.medianDepletionYear).toBe(2);
    const short = simulate({ ...base, rates: [0.5], modes: ["fixed"] })
      .results[0];
    expect(short.successRate).toBe(0);
    expect(short.totalWithdrawnMedian).toBe(1000);
    expect(short.shortfallMedian).toBe(500);
    expect(short.timeline.at(-1)?.fundedRate).toBe(0);
    expect(short.samples[0].values.at(-1)).toBe(0);
  });
  it("applies timing before or after the investment year and discounts cash at its payment time", () => {
    const p = {
      ...base,
      years: 1,
      annualDrift: 0.1,
      modes: ["fixed"] as const,
    };
    const begin = simulate({ ...p, modes: [...p.modes], timing: "beginning" })
      .results[0];
    const end = simulate({ ...p, modes: [...p.modes], timing: "end" })
      .results[0];
    expect(begin.median).toBeCloseTo(990);
    expect(end.median).toBeCloseTo(1000);
    expect(begin.realTotalWithdrawnMedian).toBeCloseTo(100);
    expect(end.realTotalWithdrawnMedian).toBeCloseTo(100 / 1.1);
  });
  it("uses identical market paths across modes/rates, independent of their order", () => {
    const p = { ...base, annualVolatility: 0.25, rates: [0, 0.04], paths: 100 };
    const a = simulate(p);
    const b = simulate({
      ...p,
      rates: [...p.rates].reverse(),
      modes: [...p.modes].reverse(),
    });
    for (const s of a.results)
      expect(b.results.find((t) => t.id === s.id)).toEqual(s);
    expect(a.results.filter((s) => s.rate === 0).map((s) => s.median)).toEqual([
      a.results[0].median,
      a.results[0].median,
      a.results[0].median,
    ]);
  });
  it("is reproducible, changes with seed, and preserves the original daily market process", () => {
    const p = {
      ...base,
      modes: ["fixed"] as SimulationParams["modes"],
      rates: [0],
      annualDrift: 0.09,
      annualVolatility: 0.18,
    };
    expect(simulate(p).results).toEqual(simulate(p).results);
    expect(simulate(p).results).not.toEqual(
      simulate({ ...p, seed: 7 }).results,
    );
    // Fixture produced by reference commit dbe69dc3, engine.ts at leverage 1x.
    const r = simulate(p).results[0];
    expect(r.median).toBe(1320.936616084272);
    expect(r.mean).toBe(1340.671497639314);
    expect(r.cvar).toBe(668.848928452307);
    expect(r.positiveTailAverage).toBe(2318.117223903354);
    expect(r.samples[0].values).toEqual([
      1000, 1335.5677192956805, 1718.5966925537477, 1736.4027482005001,
    ]);
  });
  it("reports caps, keeps all values finite, and never revives zero balances", () => {
    const cap = simulate({
      ...base,
      initialInvestment: 1e9,
      years: 30,
      annualDrift: 1,
      rates: [0],
      modes: ["fixed"],
    }).results[0];
    expect(cap.cappedCount).toBe(100);
    expect(cap.median).toBe(1e15);
    const zero = simulate({
      ...base,
      annualDrift: -1,
      rates: [0.04],
      modes: ["fixed"],
    }).results[0];
    expect(zero.median).toBe(0);
    expect(zero.depletedCount).toBe(100);
    expect(zero.successRate).toBe(0);
  });
  it("shows income erosion for percentage withdrawals rather than calling it retirement success", () => {
    const r = simulate({ ...base, rates: [0.5], modes: ["percentage"] })
      .results[0];
    expect(r.depletedCount).toBe(0);
    expect(r.incomePreservedRate).toBe(0);
    expect(r.realLastIncomeMedian).toBeLessThan(500);
  });
});
