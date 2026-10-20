import type { SimulationParams } from "./simulation/types";
export const presets: {
  name: string;
  description: string;
  values: Partial<SimulationParams>;
}[] = [
  {
    name: "בסיס שוק אמריקאי",
    description:
      "9% תשואה, 18% תנודתיות וזנב לחץ 4.2, כמו בכלי המינוף. תרחיש סינתטי.",
    values: {
      annualDrift: 0.09,
      annualVolatility: 0.18,
      degreesOfFreedom: 4.2,
    },
  },
  {
    name: "תרחיש לחץ בסגנון 2008",
    description:
      "‎−4% תשואה, 36% תנודתיות ו־df=4. לחץ לאורך כל האופק, ללא שחזור היסטורי.",
    values: { annualDrift: -0.04, annualVolatility: 0.36, degreesOfFreedom: 4 },
  },
  {
    name: "זנבות שמנים קיצוניים",
    description: "7% תשואה, 25% תנודתיות ו־df=3. רגישות לאירועי קצה נדירים.",
    values: { annualDrift: 0.07, annualVolatility: 0.25, degreesOfFreedom: 3 },
  },
  {
    name: "שוק שורי אגרסיבי",
    description:
      "14% תשואה, 22% תנודתיות ו־df=7. גם צמיחה מהירה אינה מבטלת סיכון.",
    values: { annualDrift: 0.14, annualVolatility: 0.22, degreesOfFreedom: 7 },
  },
];
