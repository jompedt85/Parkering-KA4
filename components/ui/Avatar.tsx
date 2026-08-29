import type { Employee } from "@/lib/types";

export function Avatar({ emp, size = "sm", gold }: {
  emp: Employee;
  size?: "sm" | "md";
  gold?: boolean;
}) {
  const px = size === "md" ? 32 : 24;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: px, height: px, borderRadius: "50%",
        background: gold ? "var(--gold, #f5a623)" : "var(--ink-200, #e5e7eb)",
        color: gold ? "#fff" : "var(--ink-600, #4b5563)",
        fontSize: px * 0.42, fontWeight: 600, flexShrink: 0,
      }}
      title={emp.name}
    >
      {emp.initials}
    </span>
  );
}
