import { useCallback, useEffect, useRef, useState } from "react";
import { ParameterField } from "./components/ParameterField";
import { DistributionChart, TimelineChart } from "./components/Charts";
import { Tour } from "./components/Tour";
import { DEFAULT_PARAMS, MODE_NAMES, MODES } from "./simulation/defaults";
import type {
  SimulationParams,
  SimulationResult,
  StrategyResult,
} from "./simulation/types";
import { validateParams } from "./simulation/validation";
import {
  wilson95Interval,
  tailObservationCount,
  degreesOfFreedomWarningLevel,
} from "./simulation/statisticalReliability";
import {
  decodeParams,
  encodeParams,
  initialParams,
  saveParams,
} from "./state/parameters";
import { color, label, money, number, percent } from "./format";
import { presets } from "./presets";

type NumericKey = Exclude<keyof SimulationParams, "rates" | "modes" | "timing">;
function draftsFor(p: SimulationParams) {
  return Object.fromEntries(
    Object.entries(p).map(([key, value]) => [
      key,
      key === "rates"
        ? p.rates.map((r) => +(r * 100).toFixed(8)).join(", ")
        : typeof value === "number" &&
            [
              "annualDrift",
              "annualVolatility",
              "inflation",
              "cvarPercentile",
              "positiveTailPercentile",
            ].includes(key)
          ? String(+(value * 100).toFixed(8))
          : String(value),
    ]),
  );
}

export default function App() {
  const [params, setParams] = useState(initialParams);
  const [drafts, setDrafts] = useState(() => draftsFor(params));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedId, setSelectedId] = useState("inflation:0.04");
  const [real, setReal] = useState(true);
  const [chart, setChart] = useState<"balance" | "income" | "funding">(
    "balance",
  );
  const [paused, setPaused] = useState(false);
  const [rerun, setRerun] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const errors = validateParams(params);
  const invalid = Object.keys(errors).length > 0;
  const signature = encodeParams(params);
  const stale = !!result && encodeParams(result.params) !== signature;
  const selected =
    result?.results.find((s) => s.id === selectedId) ?? result?.results[0];
  const replace = (p: SimulationParams) => {
    setParams(p);
    setDrafts(draftsFor(p));
    setPaused(false);
  };
  const update = (key: NumericKey, raw: string, scale = 1) => {
    setDrafts((d) => ({ ...d, [key]: raw }));
    setParams((p) => ({
      ...p,
      [key]: raw.trim() === "" ? NaN : Number(raw) / scale,
    }));
    setPaused(false);
  };
  const run = useCallback(() => {
    const worker = new Worker(
      new URL("./simulation/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    setRunning(true);
    setProgress(0);
    setError("");
    worker.onmessage = (e) => {
      if (workerRef.current !== worker) return;
      if (e.data.type === "progress") setProgress(e.data.progress);
      if (e.data.type === "result") {
        setResult(e.data.result);
        setProgress(1);
        setRunning(false);
        worker.terminate();
        workerRef.current = null;
      }
      if (e.data.type === "error") {
        setError(e.data.message);
        setRunning(false);
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.onerror = () => {
      if (workerRef.current === worker) {
        setError("החישוב הופסק. אפשר להריץ שוב או להקטין את מספר המסלולים.");
        setRunning(false);
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.postMessage(params);
  }, [params]);
  useEffect(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
    if (invalid || paused) return;
    const timer = window.setTimeout(run, 450);
    return () => {
      window.clearTimeout(timer);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [run, invalid, paused, rerun]);
  useEffect(() => {
    if (!invalid) saveParams(params);
  }, [params, invalid]);

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = encodeParams(params);
    try {
      await navigator.clipboard.writeText(url.toString());
      setFeedback("קישור לתרחיש הועתק. אותו seed משחזר את התוצאות.");
    } catch {
      window.history.replaceState(null, "", url);
      setFeedback("התרחיש נשמר בכתובת הדפדפן. אפשר להעתיק אותה לשיתוף.");
    }
  };
  const field = (
    key: NumericKey,
    title: string,
    description: string,
    unit: string,
    min: number,
    max: number,
    step: number,
    scale = 1,
    range = false,
    details = description,
  ) => (
    <ParameterField
      key={key}
      id={key}
      label={title}
      description={description}
      details={details}
      unit={unit}
      value={drafts[key]}
      min={min}
      max={max}
      step={step}
      range={range}
      rangeMax={key === "paths" ? 10000 : undefined}
      error={errors[key]}
      onChange={(v) => update(key, v, scale)}
    />
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark">מ</div>
          <div>
            <h1>מבחן המשיכה</h1>
            <p>מעבדת הכנסה מהשקעות</p>
          </div>
        </div>
        <div className="header-actions">
          <a
            href="https://dani1565.github.io/Monte-Carlo-simulator/"
            target="_blank"
            rel="noreferrer"
          >
            למבחן המינוף ↗
          </a>
          <div
            className={`status-pill${running ? " status-pill--running" : ""}`}
            role="status"
          >
            <span className={running ? "pulse" : ""} />
            {running
              ? `מחשב · ${Math.round(progress * 100)}%`
              : invalid
                ? "בדקו את הפרמטרים"
                : paused
                  ? "החישוב נעצר"
                  : "המודל מוכן"}
          </div>
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">סימולטור מונטה קרלו למשיכות שנתיות</p>
          <h2>
            התיק עובד.
            <br />
            <em>לכמה זמן הכסף יספיק?</em>
          </h2>
        </div>
        <p className="hero-copy">
          השוו משיכה קבועה למשיכה צמודה למדד על אותם מסלולי שוק — ובדקו איך
          תנודתיות, אינפלציה וסדר התשואות משפיעים על ההכנסה ועל הכסף שנשאר.
        </p>
      </section>
      <Tour />
      <section
        id="presets"
        className="preset-strip"
        aria-label="תרחישי שוק מוכנים"
      >
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => replace({ ...params, ...p.values })}
          >
            <strong>{p.name}</strong>
            <span>{p.description}</span>
          </button>
        ))}
      </section>
      <div className="mobile-jump">
        <a href="#results">לתוצאות ולגרפים ↓</a>
        <span>שינוי פרמטר מעדכן את החישוב אוטומטית</span>
      </div>
      <div className="workspace">
        <aside className="controls" aria-label="פרמטרי הסימולציה">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">הנחות המודל</p>
              <h3>פרמטרים</h3>
            </div>
            <div className="parameter-actions">
              <button
                className="text-button"
                disabled={invalid}
                onClick={share}
              >
                שיתוף
              </button>
              <button
                className="text-button"
                onClick={() => {
                  window.history.replaceState(
                    null,
                    "",
                    window.location.pathname,
                  );
                  replace(DEFAULT_PARAMS);
                }}
              >
                איפוס
              </button>
            </div>
          </div>
          {feedback && (
            <p className="share-feedback" role="status">
              {feedback}
            </p>
          )}
          {window.location.search.includes("scenario=") &&
            !decodeParams(window.location.search) && (
              <p className="field-advisory">
                הקישור מכיל פרמטרים לא תקינים. נטענו הגדרות שמורות או ברירות
                מחדל.
              </p>
            )}
          <fieldset className="parameter-section">
            <legend>ההון ותוכנית המשיכה</legend>
            {field(
              "initialInvestment",
              "סכום התחלתי",
              "ההון שממנו מתחיל כל מסלול.",
              "₪",
              1,
              1e9,
              1000,
            )}
            {field(
              "years",
              "תקופת המשיכה",
              "כמה שנים התיק צריך לממן משיכות.",
              "שנים",
              1,
              100,
              1,
              1,
              true,
            )}
            <ParameterField
              id="rates"
              label="שיעורי משיכה להשוואה"
              description="אחוזים מההון ההתחלתי; אפשר להשוות עד 6 שיעורים."
              details="למשל 3, 4, 5. בתיק של מיליון ₪, 4% הם 40,000 ₪ בשנה הראשונה. 0% משמש תרחיש ייחוס ללא משיכות. בשיטת אחוז מהיתרה האחוז מוחל על השווי במועד המשיכה."
              unit="%"
              inputType="text"
              value={drafts.rates}
              min={0}
              max={100}
              step={0.1}
              error={errors.rates}
              onChange={(raw) => {
                setDrafts((d) => ({ ...d, rates: raw }));
                setParams((p) => ({
                  ...p,
                  rates:
                    raw.trim() === ""
                      ? []
                      : raw
                          .split(/[,،]/)
                          .map((s) =>
                            s.trim() === "" ? NaN : Number(s.trim()) / 100,
                          ),
                }));
                setPaused(false);
              }}
            />
            <div className="parameter-field">
              <p className="field-label" id="modes-label">
                שיטות משיכה להשוואה
              </p>
              <div
                className="mode-options"
                role="group"
                aria-labelledby="modes-label"
              >
                {MODES.map((mode) => (
                  <label key={mode}>
                    <input
                      type="checkbox"
                      checked={params.modes.includes(mode)}
                      onChange={() => {
                        setParams((p) => ({
                          ...p,
                          modes: p.modes.includes(mode)
                            ? p.modes.filter((m) => m !== mode)
                            : [...p.modes, mode],
                        }));
                        setPaused(false);
                      }}
                    />
                    <span>
                      <strong>{MODE_NAMES[mode]}</strong>
                      <small>
                        {mode === "fixed"
                          ? "אותו סכום בשקלים בכל שנה"
                          : mode === "inflation"
                            ? "הסכום ההתחלתי גדל לפי המדד"
                            : "האחוז מחושב מחדש בכל משיכה"}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              {errors.modes && (
                <p className="field-error" role="alert">
                  {errors.modes}
                </p>
              )}
            </div>
            {field(
              "inflation",
              "אינפלציה שנתית",
              "מדד קבוע להצמדת המשיכה ולהצגת כוח הקנייה.",
              "%",
              -5,
              20,
              0.1,
              100,
              false,
              "המשיכה הצמודה בשנה הראשונה שווה לשיעור המשיכה כפול ההון ההתחלתי. ההצמדה מתחילה בשנה השנייה. האינפלציה זהה בכל המסלולים ואינה אקראית או מתואמת לשוק.",
            )}
            <div className="parameter-field">
              <label htmlFor="timing" className="field-label">
                מועד המשיכה
              </label>
              <p className="field-description">
                האם הכסף יוצא לפני שנת התשואות או אחריה.
              </p>
              <select
                id="timing"
                value={params.timing}
                onChange={(e) => {
                  setParams((p) => ({
                    ...p,
                    timing: e.target.value as SimulationParams["timing"],
                  }));
                  setPaused(false);
                }}
              >
                <option value="beginning">בתחילת כל שנה</option>
                <option value="end">בסוף כל שנה</option>
              </select>
            </div>
          </fieldset>
          <fieldset className="parameter-section">
            <legend>השוק המדומה</legend>
            {field(
              "annualDrift",
              "תשואה שנתית צפויה",
              "מומרת לרכיב יומי מצטבר, כמו במבחן המינוף.",
              "%",
              -100,
              100,
              0.1,
              100,
              false,
              "הקצב היומי הוא (1+μ) בחזקת 1/D פחות 1. ללא תנודתיות, צבירה במשך שנה מחזירה את ההנחה השנתית בדיוק. זו אינה הבטחה לממוצע או לתשואה ממומשת עם תנודתיות.",
            )}
            {field(
              "annualVolatility",
              "תנודתיות שנתית",
              "עוצמת התנודות היומיות; כוללת ימים עם הפסדים.",
              "%",
              0,
              200,
              0.1,
              100,
            )}
            {field(
              "paths",
              "מספר מסלולים",
              "מספר העתידים האפשריים. עד 100,000 בהקלדה.",
              "מסלולים",
              100,
              100000,
              100,
              1,
              true,
              "יותר מסלולים משפרים את הדגימה ועולים בזמן חישוב. גם מדגם גדול עלול להחמיץ אירועים נדירים. כל השיטות מקבלות בדיוק אותם מסלולי שוק.",
            )}
          </fieldset>
          <details className="advanced-settings">
            <summary>הגדרות מתקדמות</summary>
            {field(
              "degreesOfFreedom",
              "עובי הזנבות · df",
              "Student-t: ערך נמוך נותן משקל רב יותר לאירועי קצה.",
              "df",
              2.01,
              100,
              0.1,
              1,
              false,
              "ההתפלגות מנורמלת לשונות. ב־df≤4 המומנט הרביעי אינו סופי, ובקרבת 2 קשה מאוד לדגום את האירועים הנדירים. בדקו רגישות גם לשינוי seed.",
            )}
            {field(
              "seed",
              "זרע אקראי · seed",
              "אותו מספר משחזר את אותם מסלולי שוק.",
              "seed",
              0,
              4294967295,
              1,
            )}
            <button
              className="parameter-field-action"
              onClick={() => {
                const a = new Uint32Array(1);
                crypto.getRandomValues(a);
                update("seed", String(a[0]));
              }}
            >
              ↻ מסלולי שוק חדשים
            </button>
            {field(
              "tradingDays",
              "ימי מסחר בשנה",
              "מספר הצעדים היומיים בכל שנת סימולציה.",
              "ימים",
              1,
              366,
              1,
            )}
            {field(
              "cvarPercentile",
              "זנב שלילי · CVaR",
              "ממוצע היתרות הסופיות הנמוכות ביותר.",
              "%",
              1,
              25,
              1,
              100,
            )}
            {field(
              "positiveTailPercentile",
              "זנב חיובי",
              "ממוצע היתרות הסופיות הגבוהות ביותר.",
              "%",
              1,
              25,
              1,
              100,
            )}
          </details>
          <button
            className="run-button"
            aria-label={running ? "עצירת החישוב" : "הרצת הסימולציה"}
            disabled={invalid}
            onClick={() => {
              if (running) {
                workerRef.current?.terminate();
                workerRef.current = null;
                setRunning(false);
                setPaused(true);
              } else {
                setPaused(false);
                setRerun((v) => v + 1);
              }
            }}
          >
            <span>{running ? "עצירת החישוב" : "הרצת הסימולציה"}</span>
            <span>{running ? `${Math.round(progress * 100)}%` : "←"}</span>
          </button>
          {running && (
            <div
              className="progress-track"
              role="progressbar"
              aria-label="התקדמות הסימולציה"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          {invalid && (
            <p className="validation-summary" role="alert">
              יש לתקן את השדות המסומנים כדי לחשב תוצאות.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <p className="run-disclaimer">
            החישוב מתבצע בדפדפן. ההגדרות נשמרות במכשיר זה.{" "}
            <a href="#legal-disclaimer">למידע ולהמחשה בלבד</a>.
          </p>
        </aside>
        <section
          id="results"
          className="dashboard"
          aria-label="תוצאות הסימולציה"
          aria-busy={running}
        >
          <div className="section-title">
            <div>
              <p className="eyebrow">לא רק היתרה הסופית</p>
              <h3>האם התוכנית מחזיקה?</h3>
            </div>
            {result && (
              <span>
                {number(result.params.paths)} paths ·{" "}
                {number(result.durationMs / 1000)}s · seed {result.params.seed}
              </span>
            )}
          </div>
          {result && (
            <div className="result-tools">
              <div
                className="display-switch"
                role="group"
                aria-label="יחידות תצוגה"
              >
                <button
                  aria-pressed={real}
                  className={real ? "active" : ""}
                  onClick={() => setReal(true)}
                >
                  כוח הקנייה של היום
                </button>
                <button
                  aria-pressed={!real}
                  className={!real ? "active" : ""}
                  onClick={() => setReal(false)}
                >
                  שקלים נומינליים
                </button>
              </div>
              <button className="text-button" onClick={() => exportCSV(result)}>
                ייצוא CSV ↓
              </button>
            </div>
          )}
          {(stale || running || paused) && (
            <p className="results-status" role="status">
              {running ? "מחשב מסלולים חדשים… " : paused ? "החישוב נעצר. " : ""}
              {result
                ? "מוצגות תוצאות ההרצה האחרונה שהושלמה."
                : "התוצאות יוצגו כשהחישוב יסתיים."}
              {stale ? " הפרמטרים המוצגים כעת שונים מההרצה הזאת." : ""}
            </p>
          )}
          {result && selected ? (
            <Results
              result={result}
              selected={selected}
              onSelect={setSelectedId}
              real={real}
              chart={chart}
              onChart={setChart}
            />
          ) : (
            <div className="empty-state">
              <div className="loading-cards">
                <div />
                <div />
                <div />
              </div>
              <p>
                {error ||
                  "מריצים אלפי עתידים אפשריים, ובודקים את המשיכות בכל אחד מהם."}
              </p>
            </div>
          )}
        </section>
      </div>
      <section className="legal-disclaimer model-notes">
        <details>
          <summary>הנחות המודל, הגדרות המדדים ומגבלות</summary>
          <p>
            מודל השוק זהה למבחן המינוף ב־1×: תשואות יומיות עצמאיות מהתפלגות
            Student-t מנורמלת לשונות. רכיב התשואה היומי הוא (1+μ)^(1/D)−1; רכיב
            התנודתיות הוא σ/√D × T(df) × √((df−2)/df). התשואה הפשוטה נעצרת
            ב־‎−100%. התנודתיות והחסימה עשויות לשנות את התשואה הממומשת לעומת
            הקלט.
          </p>
          <p>
            כל השיטות והשיעורים חולקים אותם מסלולי שוק. מועד המשיכה חל פעם בשנה.
            אין מינוף, מסים, דמי ניהול, הכנסות נוספות או הפקדות. האינפלציה
            קבועה; אין שינוי משטרי שוק, תלות סדרתית או שחזור תשואות היסטוריות.
            תרחישי השוק משנים רק את שלושת פרמטרי השוק ומשמרים את אופק המשיכה
            שבחרתם.
          </p>
          <p>
            שיעור מימון מלא הוא שיעור המסלולים ששילמו את כל המשיכות המתוכננות עד
            האופק. תשלום חלקי נחשב לחוסר מימון. התרוקנות היא הגעה לאפס בלבד, ללא
            סף שרירותי; תיק מאופס נשאר מאופס. שנת ההתרוקנות מסומנת כשנה שבה התיק
            התאפס, גם כשהמשיכה בתחילת השנה.
          </p>
          <p>
            בשיטת אחוז מהיתרה אין יעד הכנסה קבוע. המדד לשימור הכנסה בודק אם
            המשיכה האחרונה, בכוח הקנייה שלה, מגיעה לפחות לסכום הבסיס של השנה
            הראשונה בכוח הקנייה שלו. זהו מדד לשנה האחרונה בלבד.
          </p>
          <p>
            יתרות נמדדות בסוף כל שנה, לאחר תשואות ומשיכה. משיכות מהוונות למדד
            במועד התשלום; יתרות מהוונות לסוף השנה. סכום המשיכות המצטבר הוא הכסף
            ששולם בפועל. חציונים מחושבים בנפרד: אין לחבר את חציון היתרה לחציון
            המשיכות ולכנות זאת חציון העושר הכולל. CVaR כאן הוא ממוצע היתרות
            הנמוכות, ולא שיעור כישלון או הפסד כספי.
          </p>
          <p>
            רווח Wilson של 95% מתאר אי־ודאות בדגימה תחת הנחות המודל, ואינו כולל
            אי־ודאות בהנחות עצמן. אפס כשלים במדגם אינו הוכחה לסיכון אפס. תקרת
            החישוב היא 10¹⁵ ₪; כל חריגה מדווחת בתוצאות ומגבילה את פרשנות המדדים.
          </p>
          <p>
            מקור המודל והעיצוב:{" "}
            <a
              href="https://github.com/dani1565/Monte-Carlo-simulator"
              target="_blank"
              rel="noreferrer"
            >
              Monte-Carlo-simulator
            </a>
            . אין כאן כיול חדש או נתוני שוק חיים.
          </p>
        </details>
      </section>
      <section id="legal-disclaimer" className="legal-disclaimer" role="note">
        <h2>הבהרה משפטית</h2>
        <p>
          האתר והסימולטור נועדו למידע, לימוד והמחשה בלבד. אין בתוכן משום ייעוץ
          השקעות או שיווק השקעות, ואין בו הצעה או המלצה לבצע פעולה כלשהי או
          להימנע מביצועה. המידע אינו מותאם לנתוניו, למטרותיו ולצרכיו של אדם
          מסוים ואינו תחליף לייעוץ השקעות אישי המתחשב בהם מאת בעל רישיון מתאים
          על פי דין.
        </p>
        <p>
          התוצאות מבוססות על הנחות ועל מסלולים אקראיים, ואינן תחזית או הבטחה
          לתוצאה עתידית. השקעה כרוכה בסיכון להפסד עד כדי אובדן מלוא ההשקעה.
          שיעור משיכה אינו הבטחה להכנסה או ליכולת לממן הוצאות.
        </p>
      </section>
      <footer>
        <p>כלי מידע ומחקר כללי בלבד · מבחן המשיכה</p>
        <a
          href="https://github.com/dani1565/monte-carlo-withdrawal-simulator"
          target="_blank"
          rel="noreferrer"
        >
          קוד המקור ↗
        </a>
        <p>התוצאות הן סימולציה סטטיסטית ואינן תחזית</p>
      </footer>
    </main>
  );
}

function Results({
  result,
  selected,
  onSelect,
  real,
  chart,
  onChart,
}: {
  result: SimulationResult;
  selected: StrategyResult;
  onSelect: (id: string) => void;
  real: boolean;
  chart: "balance" | "income" | "funding";
  onChart: (kind: "balance" | "income" | "funding") => void;
}) {
  const p = result.params;
  const factor = real ? (1 + p.inflation) ** p.years : 1;
  const value = (n: number) => money(n / factor);
  const capped = result.results.some((s) => s.cappedCount > 0);
  const failures = p.paths - selected.successCount;
  const interval = wilson95Interval(selected.successCount, p.paths);
  const dfLevel = degreesOfFreedomWarningLevel(p.degreesOfFreedom);
  return (
    <>
      <div className="run-context">
        {number(p.years)} שנים · הון התחלתי {money(p.initialInvestment)} · תשואה{" "}
        {percent(p.annualDrift)} · תנודתיות {percent(p.annualVolatility)} · מדד{" "}
        {percent(p.inflation)} · משיכה{" "}
        {p.timing === "beginning" ? "בתחילת" : "בסוף"} השנה
      </div>
      {dfLevel && (
        <div className="insight">
          <span>!</span>
          <div>
            <strong>אי־ודאות מוגברת בדגימה · df={p.degreesOfFreedom}</strong>
            <p>
              {dfLevel === "strong"
                ? "קרוב ל־2, מדגם עלול להחמיץ אירועים נדירים שנושאים חלק גדול מהשונות."
                : "ב־df≤4 מדדי זנב ושונות עלולים להשתנות בחדות בין זרעים."}{" "}
              כדאי לבדוק כמה seeds ומספרי מסלולים.
            </p>
          </div>
        </div>
      )}
      {capped && (
        <div className="value-limit-warning" role="note">
          <div>
            <strong>נחצתה תקרת החישוב של 10¹⁵ ₪</strong>
            <p>
              יתרות ותקבולים מוצגים כחסמים תחתונים (≥) בתוכניות שנפגעו. גם
              שיעורי המימון והתרוקנות עשויים להיות מושפעים מהתקרה; אין לפרשם
              כאומדנים ללא חסימה.
            </p>
            <p>
              {result.results
                .filter((s) => s.cappedCount > 0)
                .map((s) => `${label(s)}: ${s.cappedCount} מסלולים`)
                .join(" · ")}
            </p>
          </div>
        </div>
      )}
      <div className="metric-grid">
        {result.results.map((s, i) => (
          <button
            key={s.id}
            className={`metric-card withdrawal-card${s.id === selected.id ? " active" : ""}`}
            style={{ "--accent": color(i) } as React.CSSProperties}
            onClick={() => onSelect(s.id)}
            aria-pressed={s.id === selected.id}
            aria-label={`בחירת ${label(s)}`}
          >
            <div className="metric-top">
              <strong>{percent(s.rate, 8)}</strong>
              <span>{MODE_NAMES[s.mode]}</span>
            </div>
            <div className="metric-main">
              <small>
                {s.mode === "percentage"
                  ? "שימור כוח הקנייה בהכנסה האחרונה"
                  : "מימון כל המשיכות עד סוף התקופה"}
              </small>
              <b
                className={
                  s.mode !== "percentage" && s.successRate < 0.8
                    ? "negative"
                    : ""
                }
              >
                {percent(
                  s.mode === "percentage"
                    ? s.incomePreservedRate
                    : s.successRate,
                )}
              </b>
              <small>
                {s.mode === "percentage"
                  ? "המשיכה האחרונה לפחות בגובה הבסיס הריאלי"
                  : "שיעור המסלולים שמימנו את התוכנית"}
              </small>
            </div>
            <div className="metric-details">
              <span>
                <small>יתרה חציונית {real ? "ריאלית" : "נומינלית"}</small>
                <b>
                  {s.cappedCount > 0 ? "≥ " : ""}
                  {value(s.median)}
                </b>
              </span>
              <span>
                <small>הגיעו לאפס</small>
                <b>{percent(s.depletedCount / p.paths)}</b>
              </span>
            </div>
            <p className="sampling-note">
              {s.mode === "percentage"
                ? "הכנסה משתנה; יתרה חיובית אינה יעד מחיה."
                : `${number(s.successCount)} מתוך ${number(p.paths)} מסלולים מימנו הכול.`}
            </p>
          </button>
        ))}
      </div>
      <div className="insight">
        <span>↳</span>
        <div>
          <strong>{label(selected)}</strong>
          <p>
            {selected.mode === "percentage"
              ? `ההכנסה החציונית האחרונה בכוח הקנייה של היום היא ${money(selected.realLastIncomeMedian)}. בדקו את שחיקת ההכנסה גם כשהתיק שורד.`
              : `${number(failures)} מתוך ${number(p.paths)} מסלולים לא מימנו את כל המשיכות. רווח Wilson של 95% למימון מלא: ${percent(interval.lower, 2)}–${percent(interval.upper, 2)}.`}
          </p>
          {selected.mode !== "percentage" &&
            Math.min(failures, selected.successCount) < 25 && (
              <p className="sampling-note sampling-note--strong">
                מעט אירועים באחד מצדי המדגם. גם אפס כשלים אינו מבטיח סיכון אפס.
              </p>
            )}
        </div>
      </div>
      <div className="cashflow-summary">
        <article>
          <small>סכום הבסיס של המשיכה הראשונה</small>
          <b>{money(p.initialInvestment * selected.rate)}</b>
          <p>
            סכום נומינלי; בפועל כפוף ליתרה הזמינה
            {selected.mode === "percentage" && p.timing === "end"
              ? " ולתשואות השנה הראשונה"
              : ""}
            .
          </p>
        </article>
        <article>
          <small>משיכות מצטברות · חציון</small>
          <b>
            {selected.cappedCount ? "≥ " : ""}
            {money(
              real
                ? selected.realTotalWithdrawnMedian
                : selected.totalWithdrawnMedian,
            )}
          </b>
          <p>
            הכסף שנמשך בפועל,{" "}
            {real ? "בכוח הקנייה של היום" : "בערכים נומינליים"}.
          </p>
        </article>
        <article>
          <small>משיכה אחרונה בפועל · חציון</small>
          <b>
            {selected.cappedCount ? "≥ " : ""}
            {money(
              real ? selected.realLastIncomeMedian : selected.lastIncomeMedian,
            )}
          </b>
          <p>כולל אפסים ותשלומים חלקיים במסלולים שנגמרו.</p>
        </article>
      </div>
      <div className="chart-view-tabs" role="group" aria-label="בחירת גרף">
        {(
          [
            ["balance", "יתרת התיק"],
            ["income", "הכנסה שנתית"],
            ["funding", "מימון לאורך זמן"],
          ] as const
        ).map(([kind, title]) => (
          <button
            key={kind}
            aria-pressed={chart === kind}
            className={chart === kind ? "active" : ""}
            onClick={() => onChart(kind)}
          >
            {title}
          </button>
        ))}
      </div>
      <TimelineChart
        result={result}
        selected={selected}
        real={real}
        kind={chart}
      />
      <p className="graph-note">
        הצבעים תואמים לכרטיסים. לחצו על כרטיס לבחירת תוכנית. הגרפים מציגים
        סיכומים שנתיים; העבירו את הסמן להצגת שנה.
      </p>
      <DistributionChart selected={selected} factor={factor} />
      <div className="tail-panels">
        <Tail
          title="התרחיש הרע"
          name="CVaR"
          v={selected.cvar / factor}
          p={p.cvarPercentile}
          paths={p.paths}
          capped={selected.cappedCount > 0}
        />
        <Tail
          title="הזנב החיובי"
          name="ממוצע התוצאות הגבוהות"
          v={selected.positiveTailAverage / factor}
          p={p.positiveTailPercentile}
          paths={p.paths}
          capped={selected.cappedCount > 0}
          positive
        />
      </div>
      <div className="chart-panel detail-panel">
        <h3>היתרה לא מספרת את כל הסיפור</h3>
        <p>
          טווח היתרה הסופית בין אחוזון 5 ל־95:{" "}
          <b>
            {selected.cappedCount ? "≥ " : ""}
            {value(selected.p5)}–{value(selected.p95)}
          </b>
          . ממוצע יתרה:{" "}
          <b>
            {selected.cappedCount ? "≥ " : ""}
            {value(selected.mean)}
          </b>
          .
        </p>
        <p>
          שנת התרוקנות חציונית בקרב המסלולים שהתרוקנו:{" "}
          <b>
            {selected.medianDepletionYear === null
              ? "לא נצפתה התרוקנות"
              : number(selected.medianDepletionYear)}
          </b>
          . המדד מתייחס ל־{number(selected.depletedCount)} מסלולים בלבד.
        </p>
        <p>
          היתרה לבדה אינה תשואה על ההשקעה: חלק מהכסף כבר נמשך לאורך הדרך. לכן לא
          מוצגת תשואה שנתית מחושבת מהיתרה הסופית.
        </p>
      </div>
      <div className="chart-panel">
        <details className="annual-table">
          <summary>טבלה שנתית · {label(selected)}</summary>
          <p className="sampling-note">
            יתרות בסוף השנה. משיכה: חציון ששולם באותה שנה. מדדי השווי{" "}
            {real ? "בכוח הקנייה של היום" : "נומינליים"}
            {selected.cappedCount ? " · ≥ חסמים תחתונים עקב תקרת החישוב" : ""}.
          </p>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                תוצאות שנתיות לתוכנית הנבחרת
              </caption>
              <thead>
                <tr>
                  <th>שנה</th>
                  <th>יתרה חציונית</th>
                  <th>אחוזון 5</th>
                  <th>אחוזון 95</th>
                  <th>משיכה שנתית</th>
                  <th>
                    {selected.mode === "percentage"
                      ? "יתרה חיובית"
                      : "מימון מלא עד השנה"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {selected.timeline.map((t) => {
                  const f = real ? (1 + p.inflation) ** t.year : 1;
                  const cf = real
                    ? (1 + p.inflation) **
                      (p.timing === "beginning"
                        ? Math.max(0, t.year - 1)
                        : t.year)
                    : 1;
                  return (
                    <tr key={t.year}>
                      <td>{t.year}</td>
                      <td>
                        {selected.cappedCount ? "≥ " : ""}
                        {money(t.median / f)}
                      </td>
                      <td>
                        {selected.cappedCount ? "≥ " : ""}
                        {money(t.p5 / f)}
                      </td>
                      <td>
                        {selected.cappedCount ? "≥ " : ""}
                        {money(t.p95 / f)}
                      </td>
                      <td>
                        {selected.cappedCount ? "≥ " : ""}
                        {money(t.incomeMedian / cf)}
                      </td>
                      <td>
                        {percent(
                          selected.mode === "percentage"
                            ? t.aliveRate
                            : t.fundedRate,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </>
  );
}
function Tail({
  title,
  name,
  v,
  p,
  paths,
  capped,
  positive = false,
}: {
  title: string;
  name: string;
  v: number;
  p: number;
  paths: number;
  capped: boolean;
  positive?: boolean;
}) {
  const n = tailObservationCount(paths, p);
  return (
    <div className={`tail-panel${positive ? " positive-tail" : ""}`}>
      <div>
        <p className="eyebrow">{title}</p>
        <h3>{name}</h3>
        <p>
          ממוצע היתרה הסופית ב־{percent(p)} התוצאות{" "}
          {positive ? "הגבוהות" : "הנמוכות"}.
        </p>
        <b className="tail-value">
          {capped ? "≥ " : ""}
          {money(v)}
        </b>
        <p
          className={`sampling-note${n < 100 ? " sampling-note--strong" : ""}`}
        >
          מבוסס על {number(n)} מתוך {number(paths)} מסלולים.
          {n < 100 ? " מדגם זנב קטן; התוצאה עלולה להשתנות מאוד בין seeds." : ""}
        </p>
      </div>
    </div>
  );
}
function exportCSV(result: SimulationResult) {
  const lines: unknown[][] = [
    ["מבחן המשיכה — תוצאות נומינליות וריאליות; שיעורים כשבר עשרוני"],
    ["הגדרות"],
    ...Object.entries(result.params).map(([k, v]) => [
      k,
      Array.isArray(v) ? v.join(";") : v,
    ]),
    [],
    [
      "שיטה",
      "שיעור משיכה",
      "מימון מלא",
      "שימור הכנסה ריאלית אחרונה",
      "הגיעו לאפס",
      "מסלולים בתקרה",
      "יתרה חציונית נומינלית",
      "יתרה חציונית ריאלית",
      "משיכות מצטברות חציוניות נומינליות",
      "משיכות מצטברות חציוניות ריאליות",
      "משיכה אחרונה חציונית נומינלית",
      "משיכה אחרונה חציונית ריאלית",
      "CVaR נומינלי",
      "זנב חיובי נומינלי",
    ],
  ];
  result.results.forEach((s) =>
    lines.push([
      MODE_NAMES[s.mode],
      s.rate,
      s.mode === "percentage" ? "לא ישים" : s.successRate,
      s.incomePreservedRate,
      s.depletedCount,
      s.cappedCount,
      s.median,
      s.realMedian,
      s.totalWithdrawnMedian,
      s.realTotalWithdrawnMedian,
      s.lastIncomeMedian,
      s.realLastIncomeMedian,
      s.cvar,
      s.positiveTailAverage,
    ]),
  );
  lines.push(
    [],
    [
      "במקרה חריגה מהתקרה, מדדי השווי הם חסמים תחתונים ושיעורי האירועים עשויים להיות מושפעים.",
    ],
    [],
    ["טבלה שנתית — ערכים נומינליים"],
    [
      "תוכנית",
      "שנה",
      "חציון",
      "ממוצע",
      "אחוזון 5",
      "אחוזון 95",
      "משיכה חציונית",
      "מימון מלא",
      "יתרה חיובית",
    ],
  );
  result.results.forEach((s) =>
    s.timeline.forEach((t) =>
      lines.push([
        label(s),
        t.year,
        t.median,
        t.mean,
        t.p5,
        t.p95,
        t.incomeMedian,
        s.mode === "percentage" ? "לא ישים" : t.fundedRate,
        t.aliveRate,
      ]),
    ),
  );
  const csv =
    "\uFEFF" +
    lines
      .map((row) =>
        row
          .map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "withdrawal-simulation.csv";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
