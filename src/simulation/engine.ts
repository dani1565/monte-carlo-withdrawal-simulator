import { SeededRandom } from "./random";
import {
  createHistogram,
  expectedShortfall,
  expectedUpside,
  mean,
  percentile,
} from "./statistics";
import { validateParams } from "./validation";
import type {
  SimulationParams,
  SimulationResult,
  StrategyResult,
  TimePoint,
  WithdrawalMode,
} from "./types";

const LIMIT = 1e15;
export function scheduledWithdrawal(
  p: SimulationParams,
  mode: WithdrawalMode,
  rate: number,
  year: number,
  balance: number,
): number {
  if (mode === "percentage") return balance * rate;
  return (
    p.initialInvestment *
    rate *
    (mode === "inflation" ? (1 + p.inflation) ** (year - 1) : 1)
  );
}

export function simulate(
  params: SimulationParams,
  onProgress?: (p: number) => void,
): SimulationResult {
  if (Object.keys(validateParams(params)).length)
    throw new Error("פרמטרים לא תקינים");
  const started = performance.now();
  const random = new SeededRandom(params.seed);
  const states = params.rates.flatMap((rate) =>
    params.modes.map((mode) => ({
      id: `${mode}:${rate}`,
      mode,
      rate,
      values: new Float64Array(params.paths).fill(params.initialInvestment),
      total: new Float64Array(params.paths),
      realTotal: new Float64Array(params.paths),
      income: new Float64Array(params.paths),
      shortfall: new Float64Array(params.paths),
      failed: new Uint8Array(params.paths),
      depleted: new Uint8Array(params.paths),
      capped: new Uint8Array(params.paths),
      depletionYears: new Float64Array(params.paths),
      samples: Array.from({ length: Math.min(24, params.paths) }, () => ({
        values: [params.initialInvestment],
      })),
      timeline: [] as TimePoint[],
    })),
  );
  const summarize = (s: (typeof states)[number], year: number): TimePoint => {
    const sorted = Array.from(s.values).sort((a, b) => a - b);
    return {
      year,
      median: percentile(sorted, 0.5),
      mean: mean(sorted),
      p5: percentile(sorted, 0.05),
      p25: percentile(sorted, 0.25),
      p75: percentile(sorted, 0.75),
      p95: percentile(sorted, 0.95),
      fundedRate: 1 - sum(s.failed) / params.paths,
      aliveRate: 1 - sum(s.depleted) / params.paths,
      incomeMedian: median(s.income),
    };
  };
  states.forEach((s) => s.timeline.push(summarize(s, 0)));
  const dailyDrift = Math.expm1(
    Math.log1p(params.annualDrift) / params.tradingDays,
  );
  const dailyVol = params.annualVolatility / Math.sqrt(params.tradingDays);
  const scale = Math.sqrt(
    (params.degreesOfFreedom - 2) / params.degreesOfFreedom,
  );
  const markDepleted = (
    s: (typeof states)[number],
    path: number,
    year: number,
  ) => {
    if (s.values[path] === 0 && !s.depleted[path]) {
      s.depleted[path] = 1;
      s.depletionYears[path] = year;
    }
  };
  const withdraw = (year: number) => {
    const at = params.timing === "beginning" ? year - 1 : year;
    for (const s of states)
      for (let path = 0; path < params.paths; path++) {
        const wanted = scheduledWithdrawal(
          params,
          s.mode,
          s.rate,
          year,
          s.values[path],
        );
        const paid = Math.min(wanted, s.values[path]);
        const missing = Math.max(0, wanted - paid);
        s.income[path] = paid;
        s.total[path] += paid;
        s.realTotal[path] += paid / (1 + params.inflation) ** at;
        s.shortfall[path] += missing;
        if (missing > Math.max(1e-8, wanted * 1e-12)) s.failed[path] = 1;
        s.values[path] = Math.max(0, s.values[path] - paid);
        markDepleted(s, path, year);
      }
  };
  for (let year = 1; year <= params.years; year++) {
    if (params.timing === "beginning") withdraw(year);
    for (let day = 0; day < params.tradingDays; day++)
      for (let path = 0; path < params.paths; path++) {
        // Same loop order and number of draws as the reference, including exhausted paths.
        const r = Math.max(
          -1,
          dailyDrift +
            dailyVol * random.studentT(params.degreesOfFreedom) * scale,
        );
        for (const s of states) {
          if (s.values[path] === 0) continue;
          const next = s.values[path] * (1 + r);
          if (next > LIMIT) s.capped[path] = 1;
          s.values[path] = Math.min(LIMIT, next);
          markDepleted(s, path, year);
        }
      }
    if (params.timing === "end") withdraw(year);
    states.forEach((s) => {
      s.timeline.push(summarize(s, year));
      s.samples.forEach((sample, path) => sample.values.push(s.values[path]));
    });
    onProgress?.(year / params.years);
  }
  const inflationFactor = (1 + params.inflation) ** params.years;
  const incomeFactor =
    (1 + params.inflation) **
    (params.timing === "beginning" ? params.years - 1 : params.years);
  const results: StrategyResult[] = states.map((s) => {
    const sorted = Array.from(s.values).sort((a, b) => a - b);
    const depletion = Array.from(s.depletionYears)
      .filter((y) => y > 0)
      .sort((a, b) => a - b);
    const successCount = params.paths - sum(s.failed);
    const firstIncomeReal =
      (params.initialInvestment * s.rate) /
      (params.timing === "end" ? 1 + params.inflation : 1);
    return {
      id: s.id,
      mode: s.mode,
      rate: s.rate,
      mean: mean(sorted),
      median: percentile(sorted, 0.5),
      realMedian: percentile(sorted, 0.5) / inflationFactor,
      p5: percentile(sorted, 0.05),
      p95: percentile(sorted, 0.95),
      cvar: expectedShortfall(sorted, params.cvarPercentile),
      positiveTailAverage: expectedUpside(
        sorted,
        params.positiveTailPercentile,
      ),
      successCount,
      successRate: successCount / params.paths,
      depletedCount: sum(s.depleted),
      medianDepletionYear: depletion.length ? percentile(depletion, 0.5) : null,
      totalWithdrawnMedian: median(s.total),
      realTotalWithdrawnMedian: median(s.realTotal),
      lastIncomeMedian: median(s.income),
      realLastIncomeMedian: median(s.income) / incomeFactor,
      incomePreservedRate:
        s.income.reduce(
          (count, cash) =>
            count + Number(cash / incomeFactor >= firstIncomeReal - 1e-8),
          0,
        ) / params.paths,
      shortfallMedian: median(s.shortfall),
      cappedCount: sum(s.capped),
      timeline: s.timeline,
      samples: s.samples,
      histogram: createHistogram(sorted),
    };
  });
  return {
    params,
    results,
    durationMs: performance.now() - started,
    portfolioValueLimit: LIMIT,
  };
}
function sum(a: Uint8Array): number {
  return a.reduce((n, v) => n + v, 0);
}
function median(a: Float64Array): number {
  return percentile(
    Array.from(a).sort((a, b) => a - b),
    0.5,
  );
}
