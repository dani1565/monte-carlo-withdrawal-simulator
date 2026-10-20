import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParameterField } from "./ParameterField";

describe("ParameterField", () => {
  it("מציג הסבר קצר קבוע ומרחיב פירוט מקומי נגיש לפי בקשת המשתמש", () => {
    render(
      <ParameterField
        id="volatility"
        label="תנודתיות שנתית"
        description="קובעת עד כמה התשואות עשויות לסטות מהממוצע."
        details="ערך גבוה מייצר עליות וירידות חדות יותר."
        unit="%"
        value="18"
        min={0}
        max={200}
        step={0.1}
        onChange={() => undefined}
      />,
    );

    const input = screen.getByLabelText("תנודתיות שנתית");
    const toggle = screen.getByRole("button", { name: "הסבר ודוגמה" });

    expect(
      screen.getByText("קובעת עד כמה התשואות עשויות לסטות מהממוצע."),
    ).toBeVisible();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "volatility-details");
    expect(
      screen.getByText("ערך גבוה מייצר עליות וירידות חדות יותר."),
    ).not.toBeVisible();
    expect(input).toHaveAccessibleDescription(
      "קובעת עד כמה התשואות עשויות לסטות מהממוצע.",
    );

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("ערך גבוה מייצר עליות וירידות חדות יותר."),
    ).toBeVisible();
    expect(input).toHaveAccessibleDescription(
      "קובעת עד כמה התשואות עשויות לסטות מהממוצע. ערך גבוה מייצר עליות וירידות חדות יותר.",
    );
  });

  it("מקשר תווית, הסבר ושגיאה לשדה המספרי", () => {
    render(
      <ParameterField
        id="years"
        label="טווח השקעה"
        description="משך הסימולציה"
        details="מספר השנים בכל מסלול."
        unit="שנים"
        value="0"
        min={1}
        max={100}
        step={1}
        error="מספר השנים אינו תקין"
        onChange={() => undefined}
      />,
    );
    const input = screen.getByLabelText("טווח השקעה");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "משך הסימולציה מספר השנים אינו תקין",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("מספר השנים אינו תקין");
  });

  it("מעביר הקלדה מדויקת כמחרוזת בלי לתקן ערך לא חוקי", () => {
    const onChange = vi.fn();
    render(
      <ParameterField
        id="return"
        label="תשואה"
        description="באחוזים"
        details="הנחת התשואה של המודל."
        unit="%"
        value="9"
        min={-100}
        max={100}
        step={0.1}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("תשואה"), {
      target: { value: "9.25" },
    });
    expect(onChange).toHaveBeenCalledWith("9.25");
  });

  it("מציג פעולה אופציונלית בתוך השדה ומפעיל אותה", () => {
    const onAction = vi.fn();
    render(
      <ParameterField
        id="seed"
        label="זרע אקראי (seed)"
        description="seed קבוע משחזר את אותה סדרת תרחישים; seed חדש יוצר סדרה חדשה."
        details="מספר שמאפשר לשחזר בדיוק את אותה סדרת הגרלות."
        unit="seed"
        value="2026"
        min={0}
        max={4_294_967_295}
        step={1}
        action={{ label: "הגרל seed אקראי", icon: "↻", onClick: onAction }}
        onChange={() => undefined}
      />,
    );

    const button = screen.getByRole("button", { name: "הגרל seed אקראי" });
    expect(button).toHaveClass("parameter-field-action");
    expect(button.closest(".parameter-field")).toBeInTheDocument();
    expect(button.querySelector('[aria-hidden="true"]')).toHaveTextContent("↻");

    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledOnce();
  });

  it("מציג גם מחוון אופציונלי ששולט באותו ערך", () => {
    const onChange = vi.fn();
    render(
      <ParameterField
        id="years"
        label="שנים"
        description="משך"
        details="מספר השנים בכל מסלול."
        unit="שנים"
        value="20"
        min={1}
        max={40}
        step={1}
        range
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("שנים — מחוון"), {
      target: { value: "25" },
    });
    expect(onChange).toHaveBeenCalledWith("25");
  });

  it("מאפשר למחוון תקרה רכה נפרדת מתקרת הקלט ומנגיש הודעה צמודה", () => {
    render(
      <ParameterField
        id="paths"
        label="מספר מסלולים"
        description="דגימות אקראיות · חישוב כבד"
        details="מספר ההרצות האקראיות הנפרדות."
        unit="מסלולים"
        value="50000"
        min={100}
        max={100000}
        rangeMax={10000}
        step={100}
        range
        advisory="מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב."
        onChange={() => undefined}
      />,
    );

    const input = screen.getByLabelText("מספר מסלולים");
    const slider = screen.getByLabelText("מספר מסלולים — מחוון");
    expect(input).toHaveAttribute("max", "100000");
    expect(input).toHaveAccessibleDescription(
      "דגימות אקראיות · חישוב כבד מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב.",
    );
    expect(slider).toHaveAttribute("max", "10000");
    expect(slider).toHaveValue("10000");
    expect(slider).toHaveAccessibleDescription(
      "דגימות אקראיות · חישוב כבד מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב.",
    );
    expect(screen.getByText("10000", { exact: true })).toBeInTheDocument();
  });

  it("מסמן אזהרת יציבות חזקה ומקשר אותה לתיאור הנגיש של השדה", () => {
    render(
      <ParameterField
        id="degreesOfFreedom"
        label="עובי הזנבות"
        description="פחות דרגות חופש פירושן יותר אירועים חריגים."
        details="פרמטר Student-t."
        unit="df"
        value="2.5"
        min={2.01}
        max={100}
        step={0.1}
        advisory="אזהרת יציבות גבוהה: המדגם עלול להחמיץ אירועים נדירים."
        advisoryTone="strong"
        onChange={() => undefined}
      />,
    );

    const input = screen.getByLabelText("עובי הזנבות");
    const advisory = screen.getByText(
      "אזהרת יציבות גבוהה: המדגם עלול להחמיץ אירועים נדירים.",
    );
    expect(advisory).toHaveClass("field-advisory--strong");
    expect(input).toHaveAccessibleDescription(
      "פחות דרגות חופש פירושן יותר אירועים חריגים. אזהרת יציבות גבוהה: המדגם עלול להחמיץ אירועים נדירים.",
    );
  });
});
