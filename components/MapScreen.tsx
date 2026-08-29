"use client";
import { useState } from "react";
import type { Employee, Spot, Booking, Decision } from "@/lib/types";
import { fmtLong, fromIso, isoDate, allStatuses, mySharedSpot, spotStatus } from "@/lib/parking-logic";
import { IcBolt, IcInfo } from "@/components/icons";
import { PeriodPicker } from "@/components/ui/PeriodPicker";
import { Stall } from "@/components/ui/Stall";

const TODAY_ISO = isoDate(new Date());

interface MapScreenProps {
  employees: Employee[];
  spots: Spot[];
  bookings: Booking[];
  decisions: Decision[];
  viewIso: string;
  deadlinePassed: boolean;
  deadlineHour: number;
  currentUser: Employee;
  onGrab: (spotId: string, period: "full"|"am"|"pm") => Promise<void>;
  onClaim: (period: "full"|"am"|"pm") => Promise<void>;
}

export function MapScreen({ employees, spots, bookings, decisions, viewIso, deadlinePassed, deadlineHour, currentUser, onGrab, onClaim }: MapScreenProps) {
  const uid = currentUser.id;
  const meEv = currentUser.ev;
  const parker = currentUser.parking;
  const d = fromIso(viewIso);
  const isToday = viewIso === TODAY_ISO;
  const [period, setPeriod] = useState<"full"|"am"|"pm">("full");
  const mine = mySharedSpot(spots, uid);

  const stats = allStatuses(spots, bookings, decisions, viewIso, uid, deadlinePassed, employees);
  const bookableSpots = spots.filter(s => s.kind !== "private");
  const totalBookable = bookableSpots.length;
  const evTotal = bookableSpots.filter(s => s.ev).length;
  const freeCount = stats.filter(x => x.st.othersFree.length > 0).length;
  const evFree = stats.filter(x => x.spot.ev && x.st.othersFree.length > 0).length;

  const sortSpots = (a: Spot, b: Spot) => {
    // General/shared spots first, then private
    const kindOrder = (s: Spot) => s.kind === "private" ? 1 : 0;
    if (kindOrder(a) !== kindOrder(b)) return kindOrder(a) - kindOrder(b);
    // Within same kind: sort by numeric part of label, then alphabetically
    const numA = parseInt(a.label.replace(/\D/g, "")) || 999;
    const numB = parseInt(b.label.replace(/\D/g, "")) || 999;
    if (numA !== numB) return numA - numB;
    return a.label.localeCompare(b.label, "no");
  };
  const charging = spots.filter(s => s.ev).sort(sortSpots);
  const regular = spots.filter(s => !s.ev).sort(sortSpots);
  const chargingGeneral = charging.filter(s => s.kind !== "private");
  const chargingPrivate = charging.filter(s => s.kind === "private");
  const regularGeneral = regular.filter(s => s.kind !== "private");
  const regularPrivate = regular.filter(s => s.kind === "private");

  const pick = (s: Spot) => {
    if (mine && s.id === mine.id) onClaim(period); else onGrab(s.id, period);
  };

  return (
    <>
      <div className="pk-h">
        <div className="eyebrow">Plasskart</div>
        <h1 style={{ textTransform: "capitalize" }}>{fmtLong(d)}</h1>
        <p>Alle plasser ved KA4, KA6 og KA7. ⚡ = ladeplass (kun elbil). ⇄ = deles av to. Ledige plasser åpner for booking etter kl {String(deadlineHour).padStart(2,"0")}:00. Velg periode og trykk.</p>
      </div>

      <div className="pk-stats">
        <div className="pk-stat accent"><div className="l">Ledige nå</div><div className="v">{freeCount}<small> / {totalBookable}</small></div></div>
        <div className="pk-stat"><div className="l">Ladeplasser ledig</div><div className="v">{evFree}<small> / {evTotal}</small></div></div>
        <div className="pk-stat"><div className="l">Totalt plasser</div><div className="v">{totalBookable}<small> bookbare</small></div></div>
        <div className="pk-stat"><div className="l">Din status</div><div className="v" style={{ fontSize: 18 }}>{!parker ? "Ingen plass" : meEv ? "Elbil ⚡" : "Vanlig bil"}</div></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span className="pk-period-label" style={{ margin: 0 }}>Book for:</span>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="pk-map">
        <div className="pk-lane">
          <div className="pk-lane-label"><span>Ladeplasser ⚡ (kun elbil)</span></div>
          <div className="pk-stalls" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
            {charging.map(s => (
              <Stall key={s.id} spot={s}
                status={spotStatus(s, bookings, decisions, viewIso, uid, deadlinePassed, employees)}
                onPick={() => pick(s)} employees={employees} />
            ))}
          </div>
        </div>
        <div className="pk-lane">
          <div className="pk-lane-label"><span>Vanlige plasser</span></div>
          <div className="pk-stalls" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
            {regular.map(s => (
              <Stall key={s.id} spot={s}
                status={spotStatus(s, bookings, decisions, viewIso, uid, deadlinePassed, employees)}
                onPick={() => pick(s)} employees={employees} />
            ))}
          </div>
        </div>
        <div className="pk-legend">
          <span><i className="pk-sw free"></i> Ledig — trykk for å ta</span>
          <span><i className="pk-sw partly"></i> Halv ledig</span>
          <span><i className="pk-sw taken"></i> I bruk</span>
          <span><i className="pk-sw shared"></i> Delt (rullerer)</span>
          <span><i className="pk-sw mine"></i> Din plass</span>
          <span>⇄ Delt mellom to</span>
        </div>
      </div>
      {!isToday && <div className="pk-note" style={{ marginTop: 16 }}><IcInfo size={16} /> Du ser en annen dag enn i dag.</div>}
    </>
  );
}
