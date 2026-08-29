import { IcBolt } from "@/components/icons";
import type { Employee, Spot, SpotStatus } from "@/lib/types";
import { occupancyText } from "@/lib/parking-logic";

export function Stall({ spot, status, onPick, employees }: {
  spot: Spot;
  status: SpotStatus;
  onPick: () => void;
  employees: Employee[];
}) {
  const owners = (status.owners || [])
    .map(o => employees.find(e => e.id === o)?.first)
    .filter(Boolean).join(" / ");

  let cls = "pk-stall ";
  let who = "";
  const clickable = status.freeForMe.length > 0;

  if (status.kind === "mine" || status.kind === "mine-partly") {
    cls += "mine";
    who = status.myPeriod === "full" ? "Din" : status.myPeriod === "am" ? "Din form." : "Din ettm.";
  } else if (status.kind === "reserved") {
    cls += "locked"; who = "Reservert";
  } else if (status.kind === "open") {
    if (status.solo) { cls += "locked"; who = "Ikke bekreftet"; }
    else { cls += "shared"; who = "Deles"; }
  } else if (status.kind === "free") {
    if (status.evLocked) { cls += "locked"; who = "Kun elbil"; }
    else { cls += spot.ev ? "ev-free" : "free"; who = "Ledig"; }
  } else if (status.kind === "partly") {
    if (status.evLocked) { cls += "locked"; who = "Kun elbil"; }
    else { cls += "partly"; who = status.am.holder ? "Ettm. ledig" : "Form. ledig"; }
  } else {
    cls += "taken"; who = occupancyText(status, employees);
  }

  return (
    <button
      className={cls}
      onClick={clickable ? onPick : undefined}
      disabled={!clickable}
      title={`${spot.label}${spot.ev ? " · ladeplass" : ""}${status.shared ? " · deles: " + owners : ""}`}
    >
      {spot.ev && <span className="pk-ev-ic"><IcBolt size={11} /></span>}
      {status.shared && !status.solo && <span className="pk-fix-ic">⇄</span>}
      <span className="pk-stall-id">{spot.label}</span>
      <span className="pk-stall-who">{who}</span>
    </button>
  );
}
