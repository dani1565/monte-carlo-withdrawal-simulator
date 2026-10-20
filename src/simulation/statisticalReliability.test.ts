import { describe, expect, it } from "vitest";
import {
  degreesOfFreedomWarningLevel,
  eventCountWarningLevel,
  tailObservationCount,
  tailObservationWarningLevel,
  wilson95Interval,
} from "./statisticalReliability";

describe("אמינות סטטיסטית", () => {
  it("מחשב את מספר התצפיות בפועל לפי אותה הגדרת עיגול של מדדי הזנב", () => {
    expect(tailObservationCount(2_000, 0.05)).toBe(100);
    expect(tailObservationCount(2_000, 0.01)).toBe(20);
    expect(tailObservationCount(101, 0.05)).toBe(6);
  });

  it("מסווג אזהרת df חזקה מתחת ל־3 ומתונה עד 4", () => {
    expect(degreesOfFreedomWarningLevel(2.99)).toBe("strong");
    expect(degreesOfFreedomWarningLevel(3)).toBe("moderate");
    expect(degreesOfFreedomWarningLevel(4)).toBe("moderate");
    expect(degreesOfFreedomWarningLevel(4.01)).toBeNull();
  });

  it("מסווג גודל מדגם זנב לפי הספים 30 ו־100", () => {
    expect(tailObservationWarningLevel(29)).toBe("strong");
    expect(tailObservationWarningLevel(30)).toBe("moderate");
    expect(tailObservationWarningLevel(99)).toBe("moderate");
    expect(tailObservationWarningLevel(100)).toBeNull();
  });

  it("מסווג ספירת אירועים לפי הספים 25 ו־100", () => {
    expect(eventCountWarningLevel(24)).toBe("strong");
    expect(eventCountWarningLevel(25)).toBe("moderate");
    expect(eventCountWarningLevel(99)).toBe("moderate");
    expect(eventCountWarningLevel(100)).toBeNull();
  });

  it("מחשב רווח Wilson של 95% גם כאשר לא נצפה אף אירוע", () => {
    expect(wilson95Interval(0, 2_000)).toEqual({
      lower: 0,
      upper: expect.closeTo(0.001917047281252934, 12),
    });
  });

  it("מחשב רווח Wilson של 95% לספירת מחיקות חד־ספרתית", () => {
    const interval = wilson95Interval(8, 2_000);
    expect(interval.lower).toBeCloseTo(0.00202824660696517, 12);
    expect(interval.upper).toBeCloseTo(0.007873464296037741, 12);
  });
});
