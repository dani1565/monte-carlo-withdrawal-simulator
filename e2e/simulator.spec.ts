import { test, expect } from "@playwright/test";
const scenario = {
  initialInvestment: 1000,
  years: 3,
  paths: 100,
  annualDrift: 0,
  annualVolatility: 0,
  degreesOfFreedom: 5,
  rates: [0.1],
  modes: ["fixed", "inflation", "percentage"],
  inflation: 0.1,
  timing: "beginning",
  cvarPercentile: 0.05,
  positiveTailPercentile: 0.05,
  seed: 2026,
  tradingDays: 4,
};
const url =
  "/?" + new URLSearchParams({ v: "1", scenario: JSON.stringify(scenario) });

test("calculates all modes with real workers, charts, real/nominal toggle, annual table, CSV, and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await expect(page.locator(".metric-card")).toHaveCount(3);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page
    .getByRole("button", { name: "שקלים נומינליים", exact: true })
    .click();
  await page
    .getByRole("button", { name: "בחירת 10% · סכום קבוע", exact: true })
    .click();
  await expect(page.locator(".metric-card.active")).toContainText("700");
  await page
    .getByRole("button", { name: "בחירת 10% · צמודה למדד", exact: true })
    .click();
  await expect(page.locator(".metric-card.active")).toContainText("669");
  const labelSize = await page
    .locator(".timeline-svg text")
    .first()
    .evaluate((el) => {
      const text = el as SVGTextElement;
      return (
        parseFloat(getComputedStyle(text).fontSize) * text.getScreenCTM()!.a
      );
    });
  expect(labelSize).toBeGreaterThanOrEqual(10);
  await page.getByRole("button", { name: "הכנסה שנתית", exact: true }).click();
  await expect(page.locator(".chart-readout")).toContainText("121");
  await page
    .getByRole("button", { name: "כוח הקנייה של היום", exact: true })
    .click();
  await expect(page.locator(".chart-readout")).toContainText("100");
  await page.locator(".annual-table summary").click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ייצוא CSV ↓" }).click();
  expect((await download).suggestedFilename()).toBe(
    "withdrawal-simulation.csv",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${test.info().project.name}-results.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("invalid input stops new calculations, preserves explicitly marked old results, recovers, persists and resets", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator(".metric-card")).toHaveCount(3);
  await page.getByLabel("שיעורי משיכה להשוואה", { exact: true }).fill("4, 4");
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "הרצת הסימולציה", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".results-status")).toContainText("שונים");
  await page.getByLabel("שיעורי משיכה להשוואה", { exact: true }).fill("20");
  await expect(
    page.getByRole("button", { name: "בחירת 20% · סכום קבוע", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByLabel("שיעורי משיכה להשוואה", { exact: true }),
  ).toHaveValue("20");
  await page.getByRole("button", { name: "איפוס", exact: true }).click();
  await expect(
    page.getByLabel("שיעורי משיכה להשוואה", { exact: true }),
  ).toHaveValue("3, 4, 5");
  await page.getByLabel("מספר מסלולים", { exact: true }).fill("100");
  await page.getByLabel("תקופת המשיכה", { exact: true }).fill("2");
  await expect(page.locator(".results-status")).toHaveCount(0, {
    timeout: 60000,
  });
  await expect(page.locator(".metric-card")).toHaveCount(6);
});

test("partial and exact final funding are different from zero balance", async ({
  page,
}) => {
  await page.goto(
    "/?" +
      new URLSearchParams({
        v: "1",
        scenario: JSON.stringify({
          ...scenario,
          years: 2,
          rates: [0.5],
          modes: ["fixed"],
        }),
      }),
  );
  await expect(page.locator(".metric-card .metric-main b")).toHaveText("100%");
  await expect(page.locator(".metric-card .metric-details")).toContainText(
    "100%",
  );
  await page.getByLabel("תקופת המשיכה", { exact: true }).fill("3");
  await expect(page.locator(".metric-card .metric-main b")).toHaveText("0%");
});

test("default workload completes and cancelling leaves the interface usable", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator(".metric-card")).toHaveCount(3);
  await page.getByRole("button", { name: "איפוס", exact: true }).click();
  await expect(page.locator(".metric-card")).toHaveCount(6, { timeout: 60000 });
  await expect(page.locator(".results-status")).toHaveCount(0, {
    timeout: 60000,
  });
  await page.locator(".timeline-svg").hover({ position: { x: 250, y: 80 } });
  await page.getByLabel("מספר מסלולים", { exact: true }).fill("100000");
  await page.getByRole("button", { name: /עצירת החישוב/ }).click();
  await expect(page.locator(".results-status")).toContainText("נעצר");
  await page.getByLabel("מספר מסלולים", { exact: true }).fill("100");
  await page.getByLabel("תקופת המשיכה", { exact: true }).fill("2");
  await expect(page.locator(".results-status")).toHaveCount(0, {
    timeout: 60000,
  });
});
