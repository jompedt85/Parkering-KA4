"use client";
import { useState } from "react";
import type { Employee, Spot, Booking, Decision } from "@/lib/types";
import {
  isoDate, fromIso, addDays, mondayOf, weekNumber, WD_SHORT, MO,
  freeSpots, mySharedSpot, partnerOf,
} from "@/lib/parking-logic";
import { IcChevL, IcChevR, IcCheck, IcX, IcCar, IcInfo } from "@/components/icons";

const TODAY = new Date(); TODAY.setHours(12,0,0,0);
const TODAY_ISO = isoDate(TODAY);

interface WeekScreenProps {
  employees: Employee[];
  spots: Spot[];
  bookings: Booking[];
  decisions: Decision[];
  deadlinePassed: boolean;
  deadlineHour: number;
  currentUser: Employee;
  onSetDecision: (date: string, value: "in"|"out"|null) => Promise<void>;
}

export function WeekScreen({ employees, spots, bookings, decisions, deadlinePassed, deadlineHour, currentUser, onSetDecision }: WeekScreenProps) {
  const [offset, setOffset] = useState(0);
  const uid = currentUser.id;
  const parker = currentUser.parking;
  const sp = mySharedSpot(spots, uid);
  const partnerId = sp ? partnerOf(sp, uid) : null;
  const partner = partnerId ? employees.find(e => e.id === partnerId) ?? null : null;

  const monday = addDays(mondayOf(TODAY), offset * 7);
  const days = [0,1,2,3,4].map(i => addDays(monday, i));
  const wk = weekNumber(monday);
  const lastDay = addDays(monday, 4);
  const rangeLabel = `${monday.getDate()}.–${lastDay.getDate()}. ${MO[lastDay.getMonth()]}`;

  if (!parker) {
    return (
      <>
        <div className="pk-h"><div className="eyebrow">Min uke</div><h1>Planlegg uka</h1></div>
        <div className="pk-note"><IcInfo size={16} /> Du har ikke parkeringstilgang, så det er ingenting å planlegge her.</div>
      </>
    );
  }

  return (
    <>
      <div className="pk-h">
        <div className="eyebrow">Min uke</div>
        <h1>Planlegg uka</h1>
        <p>{sp
          ? `Si fra hvilke dager du bruker den delte plassen din (plass ${sp.label}, deles med ${partner ? partner.name : "kollega"}). Dager du slipper, blir ledige.`
          : "Marker hvilke dager du trenger parkering."}</p>
      </div>

      <div className="pk-date-nav" style={{ marginBottom: 18 }}>
        <button className="pk-date-btn" onClick={() => setOffset(o => o-1)} aria-label="Forrige uke"><IcChevL size={18} /></button>
        <div className="pk-date-label" style={{ minWidth: 220 }}>Uke {wk} · {rangeLabel}</div>
        <button className="pk-date-btn" onClick={() => setOffset(o => o+1)} aria-label="Neste uke"><IcChevR size={18} /></button>
        {offset !== 0 && <button className="pk-date-today" onClick={() => setOffset(0)}>Denne uka</button>}
      </div>

      <div className="pk-week">
        {days.map(day => {
          const di = isoDate(day);
          const dp = di === TODAY_ISO ? deadlinePassed : false;
          const free = freeSpots(spots, bookings, decisions, di, uid, dp, employees).length;
          const isToday = di === TODAY_ISO;
          const dec = decisions.find(d => d.date === di && d.employee_id === uid)?.value ?? null;
          const unanswered = dec == null && day >= TODAY;
          return (
            <div key={di} className={"pk-day" + (isToday ? " is-today" : "") + (unanswered ? " unanswered" : "")}>
              <div className="pk-day-head">
                <span className="pk-day-name">{WD_SHORT[day.getDay()]}{isToday ? " · i dag" : ""}</span>
                <span className="pk-day-num">{day.getDate()}.</span>
              </div>
              <div className="pk-day-avail"><IcCar size={13} /> <b>{free}</b> ledige</div>
              <div className="pk-seg">
                <button className={"pk-seg-btn" + (dec === "in" ? " on-yes" : "")}
                  onClick={() => onSetDecision(di, dec === "in" ? null : "in")}>
                  <IcCheck size={13} /> {sp ? "Bruker" : "Trenger"}
                </button>
                <button className={"pk-seg-btn" + (dec === "out" ? " on-no" : "")}
                  onClick={() => onSetDecision(di, dec === "out" ? null : "out")}>
                  <IcX size={13} /> {sp ? "Slipper" : "Nei"}
                </button>
              </div>
              {unanswered && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", textAlign: "center" }}>Ikke svart</div>}
              {dec === "out" && sp && <div style={{ fontSize: 11, color: "var(--info)", textAlign: "center", fontWeight: 600 }}>Plass {sp.label} frigitt</div>}
            </div>
          );
        })}
      </div>

      <div className="pk-note" style={{ marginTop: 20 }}>
        <IcInfo size={16} />
        <div>Dager merket <b style={{ color: "var(--warning)" }}>«Ikke svart»</b> teller som ubekreftet. {sp ? "Den delte plassen din" : "En reservert plass"} frigis automatisk hvis ingen har bekreftet innen fristen kl {String(deadlineHour).padStart(2,"0")}:00.</div>
      </div>
    </>
  );
}
