import { useState } from "react";
const steps = [
  {
    title: "אותו שיעור, שתי תוכניות שונות",
    text: "משיכה של 4% מתיק התחלתי של מיליון ₪ היא 40,000 ₪ בשנה הראשונה. בסכום קבוע מושכים 40,000 ₪ בכל שנה. בהצמדה למדד של 2%, הסכום בשנה השנייה הוא 40,800 ₪ ובשלישית 41,616 ₪.",
    takeaway: "בשתי השיטות האחוז נקבע מהסכום ההתחלתי, ולא מחושב מחדש מהיתרה.",
  },
  {
    title: "סדר התשואות משנה",
    text: "כשמושכים כסף, ירידות בתחילת הדרך עלולות להשאיר פחות הון שישתתף בהתאוששות. ללא משיכות, ירידה של 20% ועלייה של 25% מחזירות את התיק לנקודת ההתחלה; עם משיכות, גם הסדר שלהן משנה את היתרה.",
    takeaway:
      "כל שיטות המשיכה נבדקות על אותם מסלולי שוק, כדי לאפשר השוואה הוגנת.",
  },
  {
    title: "האם הכסף מימן את התוכנית?",
    text: "מימון מלא פירושו שכל המשיכות המתוכננות שולמו במלואן עד סוף התקופה. התרוקנות פירושה שהתיק הגיע לאפס. אם המשיכה האחרונה שולמה בדיוק והתיק התאפס, התוכנית מומנה במלואה.",
    takeaway: "בדקו גם את שיעור המימון המלא, גם את ההכנסה בפועל וגם את היתרה.",
  },
  {
    title: "משיכה גמישה אינה הכנסה מובטחת",
    text: "בשיטת אחוז מהיתרה, מושכים בכל שנה את האחוז שנבחר מתוך השווי במועד המשיכה. התשלום קטן אחרי ירידות וגדל אחרי עליות. התיק יכול להישאר חי בזמן שההכנסה נשחקת מאוד.",
    takeaway:
      "בשיטה זו נציג את שימור כוח הקנייה של ההכנסה האחרונה, במקום לכנות הישרדות ״הצלחה״.",
  },
];
export function Tour() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <section
      className="simulation-tour compact-tour"
      aria-labelledby="simulation-intro-title"
    >
      <div className="tour-heading">
        <div>
          <p className="eyebrow">לפני שמתחילים</p>
          <h2 id="simulation-intro-title">איך בודקים אם הכסף יספיק?</h2>
          <p>
            הכלי בודק אם תיק ההשקעות מצליח לממן את המשיכות שבחרתם לאורך השנים,
            כמה כסף נמשך וכמה נשאר. אפשר להשוות סכום שנתי קבוע, משיכה צמודה למדד
            ומשיכה כאחוז מהיתרה.
          </p>
        </div>
      </div>
      <div className="simulation-intro-grid">
        <article>
          <h3>מה זה מונטה קרלו?</h3>
          <p>
            המנוע מגריל הרבה רצפים של עליות וירידות לפי ההנחות שבחרתם — אלפי
            ״עתידים אפשריים״. בכל תרחיש הוא מחשב את שווי התיק ואת המשיכות, ומסכם
            בכמה מהתרחישים התוכנית החזיקה לאורך כל התקופה.
          </p>
        </article>
        <article>
          <h3>למה לא להסתפק בהרצה היסטורית?</h3>
          <p>
            בדיקה היסטורית מראה מה היה קורה בתקופות שכבר התרחשו. מונטה קרלו בודק
            גם רצפים אחרים של עליות וירידות, כולל נפילות בתחילת המשיכות. היתרון
            הוא בחינת מגוון רחב יותר של תרחישים, כדי לראות עד כמה התוכנית רגישה
            לסדר התשואות.
          </p>
        </article>
        <article>
          <h3>ומה עם ״ברבור שחור״?</h3>
          <p>
            זהו כינוי לאירוע נדיר, קיצוני וקשה לצפייה, כמו נפילה חדה במיוחד
            בשוק. משיכות בזמן נפילה כזו עלולות לפגוע בתיק גם כשהתשואה הממוצעת
            נראית טובה. המודל מאפשר גם תנודות קיצוניות, כדי לבחון את הפגיעות של
            תוכנית המשיכה אליהן.
          </p>
        </article>
      </div>
      <p className="simulation-intro-note">
        הסימולציה אינה חוזה את העתיד או את המשבר הבא. התוצאות תלויות בהנחות
        המודל, והוא אינו כולל את כל הסיכונים האפשריים. בדיקה היסטורית מוסיפה
        בדיקה מול נתוני אמת; שתי השיטות משלימות זו את זו.
      </p>
      <div className="simulation-intro-actions">
        <button
          className="text-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? "סגירת פירוט שיטות המשיכה" : "איך משווים שיטות משיכה? ←"}
        </button>
      </div>
      {open && (
        <>
          <div className="tour-progress">
            <span>
              {step + 1} / {steps.length}
            </span>
            <div>
              {steps.map((_, i) => (
                <i
                  key={i}
                  className={i === step ? "active" : i < step ? "complete" : ""}
                />
              ))}
            </div>
          </div>
          <div className="tour-step" aria-live="polite">
            <h3>{steps[step].title}</h3>
            <div className="tour-step-content">
              <p>{steps[step].text}</p>
              <p className="tour-takeaway">{steps[step].takeaway}</p>
            </div>
          </div>
          <div className="tour-navigation">
            <button
              className="tour-secondary"
              disabled={!step}
              onClick={() => setStep(step - 1)}
            >
              הקודם
            </button>
            {step < steps.length - 1 ? (
              <button
                className="tour-primary"
                onClick={() => setStep(step + 1)}
              >
                הבא ←
              </button>
            ) : (
              <a
                className="tour-primary"
                href="#presets"
                onClick={() => setOpen(false)}
              >
                לסימולטור ←
              </a>
            )}
          </div>
        </>
      )}
    </section>
  );
}
