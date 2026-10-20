import { MODE_NAMES } from "./simulation/defaults";
import type { StrategyResult } from "./simulation/types";
export const percent = (n: number, digits = 1) =>
  new Intl.NumberFormat("he-IL", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(n);
export const money = (n: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
    notation: Math.abs(n) >= 1e7 ? "compact" : "standard",
  }).format(n);
export const number = (n: number) =>
  n.toLocaleString("he-IL", { maximumFractionDigits: 1 });
export const label = (s: Pick<StrategyResult, "mode" | "rate">) =>
  `${percent(s.rate, 8)} · ${MODE_NAMES[s.mode]}`;
const colors = [
  "#51e5b4",
  "#5da9ff",
  "#f5c15d",
  "#b989ff",
  "#ff7a81",
  "#36c5f0",
  "#f88cb9",
  "#bfd66b",
  "#a9b5ff",
  "#f5a46b",
  "#78d9e5",
  "#d8a4ea",
  "#8dd99a",
  "#e7cc8d",
  "#ec9f9f",
  "#7db0df",
  "#b1e8d0",
  "#c9bbef",
];
export const color = (index: number) => colors[index % colors.length];
