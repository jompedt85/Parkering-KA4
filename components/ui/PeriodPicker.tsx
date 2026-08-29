"use client";

export function PeriodPicker({
  value, onChange, allow,
}: {
  value: "full" | "am" | "pm";
  onChange: (v: "full" | "am" | "pm") => void;
  allow?: Array<"full" | "am" | "pm">;
}) {
  const opts: [string, string][] = [["full", "Hele dagen"], ["am", "Formiddag"], ["pm", "Ettermiddag"]];
  return (
    <div className="pk-period">
      {opts.map(([k, label]) => {
        const disabled = allow != null && !allow.includes(k as "full"|"am"|"pm");
        return (
          <button key={k} type="button" disabled={disabled}
            className={"pk-period-btn" + (value === k ? " on" : "")}
            onClick={() => !disabled && onChange(k as "full"|"am"|"pm")}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
