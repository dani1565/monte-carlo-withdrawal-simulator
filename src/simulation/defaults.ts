import type { SimulationParams, WithdrawalMode } from "./types";
export const DEFAULT_PARAMS: SimulationParams = {
  initialInvestment: 1_000_000,
  years: 30,
  paths: 2000,
  annualDrift: 0.09,
  annualVolatility: 0.18,
  degreesOfFreedom: 5,
  rates: [0.03, 0.04, 0.05],
  modes: ["fixed", "inflation"],
  inflation: 0.02,
  timing: "beginning",
  cvarPercentile: 0.05,
  positiveTailPercentile: 0.05,
  seed: 2026,
  tradingDays: 252,
};
export const MODE_NAMES: Record<WithdrawalMode, string> = {
  fixed: "סכום קבוע",
  inflation: "צמודה למדד",
  percentage: "אחוז מהיתרה",
};
export const MODES: WithdrawalMode[] = ["fixed", "inflation", "percentage"];
