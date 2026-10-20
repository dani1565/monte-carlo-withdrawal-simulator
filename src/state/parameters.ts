import { DEFAULT_PARAMS } from "../simulation/defaults";
import { validateParams } from "../simulation/validation";
import type { SimulationParams } from "../simulation/types";
const KEY = "withdrawal:parameters:v1";
export function encodeParams(p: SimulationParams): string {
  return new URLSearchParams({
    v: "1",
    scenario: JSON.stringify(p),
  }).toString();
}
export function decodeParams(search: string): SimulationParams | null {
  try {
    const q = new URLSearchParams(search);
    if (q.get("v") !== "1" || !q.get("scenario")) return null;
    return parseParams(JSON.parse(q.get("scenario")!));
  } catch {
    return null;
  }
}
export function parseParams(value: unknown): SimulationParams | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const candidate = Object.fromEntries(
    Object.keys(DEFAULT_PARAMS).map((key) => [key, input[key]]),
  ) as unknown as SimulationParams;
  return Object.keys(validateParams(candidate)).length ? null : candidate;
}
export function initialParams(): SimulationParams {
  const shared = decodeParams(window.location.search);
  if (shared) return shared;
  try {
    return (
      parseParams(JSON.parse(window.localStorage.getItem(KEY) ?? "null")) ??
      DEFAULT_PARAMS
    );
  } catch {
    return DEFAULT_PARAMS;
  }
}
export function saveParams(p: SimulationParams) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* Optional browser storage. */
  }
}
