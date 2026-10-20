import { useState } from "react";

export interface ParameterFieldProps {
  id: string;
  label: string;
  description: string;
  details: string;
  unit: string;
  value: string;
  min: number;
  max: number;
  rangeMax?: number;
  step: number;
  error?: string;
  advisory?: string;
  advisoryTone?: "moderate" | "strong";
  range?: boolean;
  inputType?: "number" | "text";
  action?: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
  onChange: (value: string) => void;
}

export function ParameterField({
  id,
  label,
  description,
  details,
  unit,
  value,
  min,
  max,
  rangeMax,
  step,
  error,
  advisory,
  advisoryTone = "moderate",
  range,
  inputType = "number",
  action,
  onChange,
}: ParameterFieldProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const descriptionId = `${id}-description`;
  const detailsId = `${id}-details`;
  const errorId = `${id}-error`;
  const advisoryId = `${id}-advisory`;
  const describedBy = [
    descriptionId,
    detailsOpen ? detailsId : "",
    advisory ? advisoryId : "",
    error ? errorId : "",
  ]
    .filter(Boolean)
    .join(" ");
  const numericValue = Number(value);
  const sliderMax = rangeMax ?? max;
  const sliderValue = Number.isFinite(numericValue)
    ? Math.max(min, Math.min(sliderMax, numericValue))
    : min;
  const fill = ((sliderValue - min) / (sliderMax - min)) * 100;

  return (
    <div className={`parameter-field ${error ? "invalid" : ""}`}>
      <div className="parameter-heading">
        <label htmlFor={id}>{label}</label>
      </div>
      <p id={descriptionId} className="field-description">
        {description}
      </p>
      <div className="number-control">
        <input
          id={id}
          type={inputType}
          inputMode={inputType === "number" ? "decimal" : "text"}
          value={value}
          min={inputType === "number" ? min : undefined}
          max={inputType === "number" ? max : undefined}
          step={inputType === "number" ? step : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </div>
      {action && (
        <button
          className="parameter-field-action"
          type="button"
          onClick={action.onClick}
        >
          {action.icon && (
            <span className="parameter-field-action-icon" aria-hidden="true">
              {action.icon}
            </span>
          )}
          <span>{action.label}</span>
        </button>
      )}
      {range && (
        <>
          <input
            className="range"
            aria-label={`${label} — מחוון`}
            aria-describedby={describedBy}
            type="range"
            min={min}
            max={sliderMax}
            step={step}
            value={sliderValue}
            style={{ "--fill": `${fill}%` } as React.CSSProperties}
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="range-ends">
            <span>{min}</span>
            <span>{sliderMax}</span>
          </div>
        </>
      )}
      <button
        className="field-help-toggle"
        type="button"
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        onClick={() => setDetailsOpen((current) => !current)}
      >
        <span className="field-help-icon" aria-hidden="true">
          ?
        </span>
        <span>הסבר ודוגמה</span>
        <span className="field-help-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      <p id={detailsId} className="field-details" hidden={!detailsOpen}>
        {details}
      </p>
      {advisory && (
        <p
          id={advisoryId}
          className={`field-advisory field-advisory--${advisoryTone}`}
        >
          {advisory}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
