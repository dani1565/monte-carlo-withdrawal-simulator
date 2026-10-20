export type WithdrawalMode = "fixed" | "inflation" | "percentage";
export interface SimulationParams {
  initialInvestment: number;
  years: number;
  paths: number;
  annualDrift: number;
  annualVolatility: number;
  degreesOfFreedom: number;
  rates: number[];
  modes: WithdrawalMode[];
  inflation: number;
  timing: "beginning" | "end";
  cvarPercentile: number;
  positiveTailPercentile: number;
  seed: number;
  tradingDays: number;
}
export interface TimePoint {
  year: number;
  mean: number;
  median: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  fundedRate: number;
  aliveRate: number;
  incomeMedian: number;
}
export interface SamplePath {
  values: number[];
}
export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}
export interface StrategyResult {
  id: string;
  mode: WithdrawalMode;
  rate: number;
  mean: number;
  median: number;
  realMedian: number;
  p5: number;
  p95: number;
  cvar: number;
  positiveTailAverage: number;
  successRate: number;
  successCount: number;
  depletedCount: number;
  medianDepletionYear: number | null;
  totalWithdrawnMedian: number;
  realTotalWithdrawnMedian: number;
  lastIncomeMedian: number;
  realLastIncomeMedian: number;
  incomePreservedRate: number;
  shortfallMedian: number;
  cappedCount: number;
  timeline: TimePoint[];
  samples: SamplePath[];
  histogram: HistogramBin[];
}
export interface SimulationResult {
  params: SimulationParams;
  results: StrategyResult[];
  durationMs: number;
  portfolioValueLimit: number;
}
