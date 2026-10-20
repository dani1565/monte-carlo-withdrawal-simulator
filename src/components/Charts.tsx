import { useState } from "react";
import { color, label, money, percent } from "../format";
import type { SimulationResult, StrategyResult } from "../simulation/types";

type Kind = "balance" | "income" | "funding";
export function TimelineChart({
  result,
  selected,
  real,
  kind,
}: {
  result: SimulationResult;
  selected: StrategyResult;
  real: boolean;
  kind: Kind;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [samples, setSamples] = useState(false);
  const [log, setLog] = useState(true);
  const p = result.params;
  const W = 860,
    H = 320,
    left = 78,
    right = 18,
    top = 18,
    bottom = 38;
  const x = (year: number) => left + (year / p.years) * (W - left - right);
  const factor = (year: number) =>
    real
      ? (1 + p.inflation) **
        (kind === "income" && p.timing === "beginning"
          ? Math.max(0, year - 1)
          : year)
      : 1;
  const value = (s: StrategyResult, year: number) => {
    const t = s.timeline[year];
    return kind === "balance"
      ? t.median / factor(year)
      : kind === "income"
        ? t.incomeMedian / factor(year)
        : s.mode === "percentage"
          ? t.aliveRate
          : t.fundedRate;
  };
  const data = result.results.flatMap((s) =>
    s.timeline
      .filter((t) => kind !== "income" || t.year > 0)
      .map((t) => value(s, t.year)),
  );
  if (kind === "balance")
    selected.timeline.forEach((t) =>
      data.push(t.p95 / factor(t.year), t.mean / factor(t.year)),
    );
  if (kind === "balance" && samples)
    selected.samples
      .slice(0, 12)
      .forEach((s) => s.values.forEach((v, i) => data.push(v / factor(i))));
  const max = kind === "funding" ? 1 : Math.max(1, ...data) * 1.06;
  const unit =
    kind === "income"
      ? Math.max(1, (p.initialInvestment * Math.max(...p.rates)) / 10)
      : Math.max(1, p.initialInvestment / 10);
  const transform = (v: number) =>
    kind !== "funding" && log ? Math.log1p(v / unit) : v;
  const y = (v: number) =>
    top + (1 - transform(v) / transform(max)) * (H - top - bottom);
  const from = kind === "income" ? 1 : 0;
  const line = (s: StrategyResult) =>
    s.timeline
      .filter((t) => t.year >= from)
      .map((t, i) => `${i ? "L" : "M"}${x(t.year)},${y(value(s, t.year))}`)
      .join(" ");
  const selectedIndex = result.results.findIndex((s) => s.id === selected.id);
  const band =
    selected.timeline
      .map(
        (t, i) => `${i ? "L" : "M"}${x(t.year)},${y(t.p95 / factor(t.year))}`,
      )
      .join(" ") +
    [...selected.timeline]
      .reverse()
      .map((t) => `L${x(t.year)},${y(t.p5 / factor(t.year))}`)
      .join(" ") +
    "Z";
  // The chart stays mounted when a shorter simulation replaces its results.
  const at = Math.max(from, Math.min(p.years, hover ?? p.years));
  const title =
    kind === "balance"
      ? "איך התיק מתפתח לאורך השנים?"
      : kind === "income"
        ? "כמה כסף נמשך בפועל בכל שנה?"
        : "כמה מסלולים ממשיכים לממן את התוכנית?";
  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div>
          <h3>{title}</h3>
          <p>
            {kind === "balance"
              ? "חציונים לכל התוכניות · טווח 5%–95% וממוצע לתוכנית הנבחרת"
              : kind === "income"
                ? "משיכה שנתית חציונית בפועל; אינה כוללת כסף שלא היה זמין בתיק"
                : "קבועה וצמודה: מימון מלא עד אותה שנה · אחוז מהיתרה: יתרה חיובית בלבד"}
          </p>
        </div>
        {kind !== "funding" && (
          <label className="chart-option">
            <input
              type="checkbox"
              checked={log}
              onChange={(e) => setLog(e.target.checked)}
            />{" "}
            סולם דחוס
          </label>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title}
        className="timeline-svg"
        onPointerLeave={() => setHover(null)}
      >
        <title>{title}</title>
        <desc>הערכים המדויקים לתוכנית הנבחרת מופיעים בטבלה השנתית בהמשך.</desc>
        {[0, 1, 2, 3, 4].map((i) => {
          const v =
            kind !== "funding" && log
              ? Math.expm1((transform(max) * i) / 4) * unit
              : (max * i) / 4;
          return (
            <g key={i}>
              <line
                x1={left}
                x2={W - right}
                y1={y(v)}
                y2={y(v)}
                stroke="#263532"
              />
              <text x={left - 9} y={y(v) + 4} textAnchor="end">
                {kind === "funding" ? percent(v, 0) : money(v)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: Math.min(6, p.years + 1) }, (_, i) =>
          Math.round((i * p.years) / Math.min(5, p.years)),
        ).map((t) => (
          <text key={t} x={x(t)} y={H - 13} textAnchor="middle">
            {t}
          </text>
        ))}
        {kind === "balance" && (
          <>
            <path d={band} fill={color(selectedIndex)} opacity=".1" />
            <path
              d={selected.timeline
                .map(
                  (t, i) =>
                    `${i ? "L" : "M"}${x(t.year)},${y(t.mean / factor(t.year))}`,
                )
                .join(" ")}
              fill="none"
              stroke={color(selectedIndex)}
              strokeDasharray="5 5"
              opacity=".65"
            />
            {samples &&
              selected.samples
                .slice(0, 12)
                .map((s, i) => (
                  <path
                    key={i}
                    d={s.values
                      .map(
                        (v, t) => `${t ? "L" : "M"}${x(t)},${y(v / factor(t))}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke={color(selectedIndex)}
                    opacity=".2"
                  />
                ))}
          </>
        )}
        {result.results.map((s, i) => (
          <path
            key={s.id}
            d={line(s)}
            fill="none"
            stroke={color(i)}
            strokeWidth={s.id === selected.id ? 3 : 1.5}
            opacity={s.id === selected.id ? 1 : 0.4}
            strokeDasharray={
              s.mode === "fixed"
                ? "7 3"
                : s.mode === "percentage"
                  ? "2 3"
                  : undefined
            }
          />
        ))}
        <line
          x1={x(at)}
          x2={x(at)}
          y1={top}
          y2={H - bottom}
          stroke="#8ca09b"
          opacity=".5"
        />
        <circle
          cx={x(at)}
          cy={y(value(selected, at))}
          r="4"
          fill={color(selectedIndex)}
        />
        <rect
          x={left}
          y={top}
          width={W - left - right}
          height={H - top - bottom}
          fill="transparent"
          onPointerMove={(e) => {
            const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
            const year =
              ((((e.clientX - r.left) / r.width) * W - left) /
                (W - left - right)) *
              p.years;
            setHover(Math.max(from, Math.min(p.years, Math.round(year))));
          }}
        />
      </svg>
      <div className="chart-readout" aria-live="off">
        <span>
          {label(selected)} · שנה {at}
        </span>
        <b>
          {selected.cappedCount > 0 && kind !== "funding" ? "≥ " : ""}
          {kind === "funding"
            ? percent(value(selected, at))
            : money(value(selected, at))}
        </b>
      </div>
      <div className="chart-footnote">
        <span>
          {kind === "funding"
            ? "הישרדות של תיק גמיש אינה מבטיחה הכנסה מספקת."
            : `${real ? "בכוח הקנייה של היום" : "בשקלים נומינליים"} · ${log ? "סולם log(1+x) הכולל אפס אמיתי" : "סולם ליניארי"} · ציר אופקי: שנים`}
          {selected.cappedCount > 0
            ? " · נתוני השווי בגרף הם חסמים תחתונים (≥); שיעורי האירועים מושפעים מהתקרה."
            : ""}
        </span>
        {kind === "balance" && (
          <label className="chart-option">
            <input
              type="checkbox"
              checked={samples}
              onChange={(e) => setSamples(e.target.checked)}
            />{" "}
            מסלולים לדוגמה
          </label>
        )}
      </div>
    </div>
  );
}

export function DistributionChart({
  selected,
  factor,
}: {
  selected: StrategyResult;
  factor: number;
}) {
  const bins = selected.histogram;
  const max = Math.max(1, selected.depletedCount, ...bins.map((b) => b.count));
  const data = [{ count: selected.depletedCount, from: 0, to: 0 }, ...bins];
  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div>
          <h3>התפלגות היתרה בסוף התקופה</h3>
          <p>
            עמודת אפס נפרדת · יתרות חיוביות בקבוצות לוגריתמיות ·{" "}
            {label(selected)}
          </p>
        </div>
      </div>
      <svg
        viewBox="0 0 860 220"
        role="img"
        aria-label="התפלגות היתרה בסוף התקופה"
        className="histogram-svg"
      >
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line
              x1="65"
              x2="840"
              y1={180 - i * 75}
              y2={180 - i * 75}
              stroke="#263532"
            />
            <text x="55" y={185 - i * 75} textAnchor="end">
              {Math.round((max * i) / 2)}
            </text>
          </g>
        ))}
        {data.map((b, i) => (
          <rect
            key={i}
            x={66 + (i * 774) / data.length}
            y={180 - (b.count / max) * 150}
            width={Math.max(1, 774 / data.length - 3)}
            height={(b.count / max) * 150}
            fill={i === 0 ? "#ff6b72" : "#51e5b4"}
            opacity=".8"
          >
            <title>
              {i === 0
                ? "אפס"
                : `${money(b.from / factor)}–${money(b.to / factor)}`}
              : {b.count} מסלולים
            </title>
          </rect>
        ))}
        <text x="65" y="207">
          אפס
        </text>
        {bins.length > 0 && (
          <>
            <text x="140" y="207">
              {money(bins[0].from / factor)}
            </text>
            <text x="840" y="207" textAnchor="end">
              {money(bins.at(-1)!.to / factor)}
            </text>
          </>
        )}
      </svg>
      <p className="sampling-note">
        ציר אנכי: מספר מסלולים · ציר אופקי: יתרה סופית · כל המסלולים נכללים,
        לרבות אפסים.
      </p>
    </div>
  );
}
