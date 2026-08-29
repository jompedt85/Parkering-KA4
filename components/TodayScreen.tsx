"use client";
import { useState } from "react";
import type { Employee, Spot, Booking, Decision } from "@/lib/types";
import {
  fmtLong, fromIso, isoDate, allStatuses, freeSpots, mySharedSpot, myHeldSpot,
  spotStatus, partnerOf, periodsFromFree, perTxt,
} from "@/lib/parking-logic";
import { IcCar, IcBolt, IcCheck, IcX, IcClock, IcAlert, IcInfo, IcLock, IcArrow } from "@/components/icons";
import { PeriodPicker } from "@/components/ui/PeriodPicker";

const TODAY_ISO = isoDate(new Date());

function HeroSpot({ spot, title, sub, dim, badge }: {
  spot?: Spot; title: string; sub: string; dim?: boolean; badge?: boolean;
}) {
  return (
    <div className="pk-hero-spot">
      <div
        className={"pk-spot-badge" + (spot?.ev ? " ev" : "")}
        style={dim ? { opacity: 0.5, filter: "grayscale(0.4)" } : badge ? { background: "var(--ink-100)", color: "var(--ink-500)" } : {}}
      >
        {badge ? <IcCar size={28} /> : spot?.label}
        {spot?.ev && !badge && <span className="ev-tag"><IcBolt size={12} /></span>}
      </div>
      <div><h2>{title}</h2><div className="sub">{sub}</div></div>
    </div>
  );
}

interface TodayScreenProps {
  employees: Employee[];
  spots: Spot[];
  bookings: Booking[];
  decisions: Decision[];
  viewIso: string;
  deadlinePassed: boolean;
  deadlineHour: number;
  now: Date;
  currentUser: Employee;
  onClaim: (period: "full"|"am"|"pm") => Promise<void>;
  onRelease: () => Promise<void>;
  onGrab: (spotId: string, period: "full"|"am"|"pm") => Promise<void>;
  onUngrab: (spotId: string) => Promise<void>;
}

export function TodayScreen({
  employees, spots, bookings, decisions, viewIso, deadlinePassed, deadlineHour, now, currentUser,
  onClaim, onRelease, onGrab, onUngrab,
}: TodayScreenProps) {
  const uid = currentUser.id;
  const meEv = currentUser.ev;
  const parker = currentUser.parking;
  const [period, setPeriod] = useState<"full"|"am"|"pm">("full");

  const sp = mySharedSpot(spots, uid);
  const myPrivateSpot = spots.find(s => s.kind === "private" && s.owners.includes(uid)) ?? null;
  const held = myHeldSpot(spots, bookings, viewIso, uid);
  const heldStatus = held ? spotStatus(held, bookings, decisions, viewIso, uid, deadlinePassed, employees) : null;
  const d = fromIso(viewIso);
  const isToday = viewIso === TODAY_ISO;

  const stats = allStatuses(spots, bookings, decisions, viewIso, uid, deadlinePassed, employees);
  const bookableSpots = spots.filter(s => s.kind !== "private");
  const totalBookable = bookableSpots.length;
  const freeCount = stats.filter(x => x.st.othersFree.length > 0).length;
  const inUse = stats.filter(x => ["mine","taken","mine-partly","partly"].includes(x.st.kind)).length;
  const parkers = employees.filter(e => e.parking);
  const dayDecisions = decisions.filter(dec => dec.date === viewIso);
  const confirmedOrDecided = new Set(dayDecisions.map(d => d.employee_id));
  const bookingOwners = new Set(bookings.filter(b => b.date === viewIso).map(b => b.employee_id));
  const respondedIds = new Set([...confirmedOrDecided, ...bookingOwners]);
  const unconfirmed = parkers.filter(p => !respondedIds.has(p.id)).length;
  const evFree = stats.filter(x => x.spot.ev && x.st.othersFree.length > 0).length;

  const deadline = new Date(d); deadline.setHours(deadlineHour, 0, 0, 0);
  const msLeft = deadline.getTime() - now.getTime();
  const countdown = msLeft > 0 ? `${Math.floor(msLeft/3600000)}t ${Math.floor((msLeft%3600000)/60000)}m igjen` : "passert";
  const dlHour = String(deadlineHour).padStart(2, "0");

  const free = freeSpots(spots, bookings, decisions, viewIso, uid, deadlinePassed, employees);

  let hero;
  if (!parker && held && heldStatus) {
    hero = (
      <>
        <div className="pk-statebar confirmed"><IcCheck size={16} /><span>Du har plass {held.label} · {perTxt(heldStatus.myPeriod!)}</span><span className="grow">Booket</span></div>
        <div className="pk-hero-body">
          <HeroSpot spot={held} title={`Du har sikret plass ${held.label}`} sub={`${held.ev ? "Ladeplass ⚡" : "Vanlig plass"} · ${perTxt(heldStatus.myPeriod!)} · booket av deg`} />
          <div className="pk-cta-row"><button className="pk-cta no" onClick={() => onUngrab(held.id)}><IcX size={17} /> Frigi plassen igjen</button></div>
        </div>
      </>
    );
  } else if (!parker) {
    hero = (
      <>
        <div className={"pk-statebar pending"}><IcAlert size={16} />Du har ingen fast plass<span className="grow">{freeCount} ledige</span></div>
        <div className="pk-hero-body">
          <HeroSpot badge title="Ingen fast plass" sub={
            deadlinePassed
              ? "Ledige plasser er nå åpne for alle — book en til høyre."
              : `Ledige plasser åpnes kl ${String(deadlineHour).padStart(2,"0")}:00 når faste plasser er bekreftet.`
          } />
          {!deadlinePassed && isToday && (
            <div className="pk-note" style={{ marginTop: 16 }}>
              <IcClock size={16} /> Ansatte med fast parkering har prioritet frem til kl {String(deadlineHour).padStart(2,"0")}:00. Ubekreftede plasser frigis automatisk da.
            </div>
          )}
          {deadlinePassed && meEv && (
            <div className="pk-note" style={{ marginTop: 16 }}><IcBolt size={16} /> Du er registrert med elbil og kan ta ladeplassene.</div>
          )}
        </div>
      </>
    );
  } else if (sp) {
    const st = spotStatus(sp, bookings, decisions, viewIso, uid, deadlinePassed, employees);
    const partnerId = partnerOf(sp, uid);
    const partner = partnerId ? employees.find(e => e.id === partnerId) ?? null : null;
    const pName = partner ? partner.first : null;
    const isSolo = !partner; // enkeltplass, ingen partner
    const typeTxt = sp.ev ? "ladeplass ⚡" : "vanlig plass";
    const spotDesc = isSolo
      ? `${typeTxt} · din faste plass`
      : `Delt ${typeTxt} (${sp.deling}) · deles med ${pName}`;
    const partnerHalf = !st.am.mine && st.am.holder === partnerId ? "am"
      : (!st.pm.mine && st.pm.holder === partnerId ? "pm" : null);
    const myDecision = dayDecisions.find(d => d.employee_id === uid)?.value ?? null;

    if (st.isMine) {
      hero = (
        <>
          <div className="pk-statebar confirmed"><IcCheck size={16} /><span>Du bruker plass {sp.label} · {perTxt(st.myPeriod!)}</span><span className="grow">Bekreftet</span></div>
          <div className="pk-hero-body">
            <HeroSpot spot={sp} title={`Plass ${sp.label} er din ${perTxt(st.myPeriod!)}`} sub={spotDesc} />
            <div className="pk-cta-row"><button className="pk-cta no" onClick={onRelease}><IcX size={17} /> Jeg kommer ikke likevel</button></div>
          </div>
        </>
      );
    } else if (st.kind === "taken" || (st.kind === "partly" && st.freeForMe.length === 0)) {
      hero = (
        <>
          <div className="pk-statebar released"><IcInfo size={16} />{isSolo ? "Noen andre" : (partner ? partner.first : "Kollega")} bruker plass {sp.label} i dag<span className="grow">Opptatt</span></div>
          <div className="pk-hero-body">
            <HeroSpot spot={sp} dim
              title={isSolo ? `Plass ${sp.label} er opptatt i dag` : `${pName} har plass ${sp.label} i dag`}
              sub={isSolo ? "Plassen er booket av en annen — book en annen ledig plass." : "Dere deler denne plassen — book en ledig plass under."} />
          </div>
        </>
      );
    } else if (myDecision === "out") {
      hero = (
        <>
          <div className="pk-statebar released"><IcArrow size={16} />Du har meldt deg av plass {sp.label}<span className="grow">{isSolo ? "Frigitt" : `Ledig for ${pName}`}</span></div>
          <div className="pk-hero-body">
            <HeroSpot spot={sp} dim title="Du står som borte i dag"
              sub={isSolo ? `Plass ${sp.label} er frigitt og kan bookes av andre.` : `Plass ${sp.label} er ledig for ${pName}.`} />
            <div className="pk-period-label">Ombestemt deg? Velg når du trenger den:</div>
            <PeriodPicker value={period} onChange={setPeriod} allow={periodsFromFree(st.freeForMe)} />
            <div className="pk-cta-row" style={{ marginTop: 14 }}><button className="pk-cta-yes" onClick={() => onClaim(period)}><IcCheck size={17} /> Jeg kommer likevel ({perTxt(period)})</button></div>
          </div>
        </>
      );
    } else {
      const autoMsg = st.released;
      const partnerNote = partnerHalf && partner ? `${partner.first} har tatt ${perTxt(partnerHalf)} — du kan ta resten.` : null;
      hero = (
        <>
          <div className={"pk-statebar " + (autoMsg ? "auto" : "pending")}><IcAlert size={16} />{autoMsg ? "Auto-frigitt — ikke bekreftet" : "Ikke bekreftet"}<span className="grow">{isToday ? countdown : ""}</span></div>
          <div className="pk-hero-body">
            <HeroSpot spot={sp} title={`Bruker du plass ${sp.label} i dag?`} sub={spotDesc} />
            {partnerNote && <div className="pk-note" style={{ marginBottom: 14 }}><IcInfo size={16} /> {partnerNote}</div>}
            <div className="pk-period-label">Når trenger du plassen?</div>
            <PeriodPicker value={period} onChange={setPeriod} allow={periodsFromFree(st.freeForMe)} />
            <div className="pk-cta-row" style={{ marginTop: 14 }}>
              <button className="pk-cta-yes" onClick={() => onClaim(period)}><IcCheck size={18} /> Ja, jeg kommer ({perTxt(period)})</button>
              <button className="pk-cta-no" onClick={onRelease}><IcX size={18} /> {isSolo ? "Nei — frigi plassen" : `Nei — la ${pName} få den`}</button>
            </div>
            {isToday && (
              <div className={"pk-deadline " + (deadlinePassed ? "past" : "ok")}>
                <IcClock size={16} />
                {deadlinePassed
                  ? `Fristen kl ${dlHour}:00 er passert — plassen frigis automatisk`
                  : `Bekreft før kl ${dlHour}:00 — ellers frigis plassen automatisk (${countdown})`}
              </div>
            )}
          </div>
        </>
      );
    }
  } else if (held && heldStatus) {
    hero = (
      <>
        <div className="pk-statebar confirmed"><IcCheck size={16} /><span>Du har plass {held.label} · {perTxt(heldStatus.myPeriod!)}</span><span className="grow">Booket</span></div>
        <div className="pk-hero-body">
          <HeroSpot spot={held} title={`Du har sikret plass ${held.label}`} sub={`${held.ev ? "Ladeplass ⚡" : "Vanlig plass"} · ${perTxt(heldStatus.myPeriod!)} · booket av deg`} />
          <div className="pk-cta-row"><button className="pk-cta no" onClick={() => onUngrab(held.id)}><IcX size={17} /> Frigi plassen igjen</button></div>
        </div>
      </>
    );
  } else if (myPrivateSpot) {
    // Ute 1 / Ute 2 — fast plass som ikke trenger booking
    hero = (
      <>
        <div className="pk-statebar confirmed"><IcCheck size={16} />Din faste plass: {myPrivateSpot.label}<span className="grow">Fast plass</span></div>
        <div className="pk-hero-body">
          <HeroSpot spot={myPrivateSpot} title={`Plass ${myPrivateSpot.label} er din`} sub="Denne plassen er reservert kun for deg — ingen booking nødvendig." />
        </div>
      </>
    );
  } else {
    hero = (
      <>
        <div className="pk-statebar pending"><IcAlert size={16} />Du har ingen plass i dag<span className="grow">{freeCount} ledige</span></div>
        <div className="pk-hero-body">
          <HeroSpot badge title="Du har ikke booket plass" sub="Du har parkering, men ingen fast plass. Book en ledig plass — hele eller halve dagen." />
          {meEv && <div className="pk-note" style={{ marginTop: 16 }}><IcBolt size={16} /> Du er registrert med elbil og kan ta ladeplassene.</div>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pk-h">
        <div className="eyebrow">{isToday ? "I dag" : "Valgt dag"}</div>
        <h1 style={{ textTransform: "capitalize" }}>{fmtLong(d)}</h1>
        <p>Hei {currentUser.first} — her oppdaterer du om du trenger parkering i dag.</p>
      </div>

      <div className="pk-stats">
        <div className="pk-stat accent"><div className="l">Ledige nå</div><div className="v">{freeCount}<small> / {totalBookable}</small></div></div>
        <div className="pk-stat"><div className="l">I bruk</div><div className="v">{inUse}</div></div>
        <div className="pk-stat warn"><div className="l">Ikke bekreftet</div><div className="v">{unconfirmed}<small> / {parkers.length}</small></div></div>
        <div className="pk-stat"><div className="l">Ladeplasser ⚡</div><div className="v">{evFree}<small> ledig</small></div></div>
      </div>

      <div className="pk-cols">
        <div className="pk-hero">{hero}</div>
        <div>
            <div className="pk-section-title"><IcCar size={15} /> Ledige plasser nå · førstemann til mølla</div>
            {free.length === 0 && <div className="pk-card" style={{ textAlign: "center", color: "var(--ink-500)" }}>Ingen ledige plasser akkurat nå.</div>}
            <div className="pk-free-list">
              {free.map(s => {
                const st = spotStatus(s, bookings, decisions, viewIso, uid, deadlinePassed, employees);
                const locked = st.evLocked && st.freeForMe.length === 0;
                const opts = periodsFromFree(st.freeForMe);
                const half = st.kind === "partly";
                return (
                  <div className="pk-free-row" key={s.id}>
                    <div className={"pk-free-tag" + (s.ev ? " ev" : "")}>{s.label}</div>
                    <div className="pk-free-meta">
                      <div className="lbl">{s.label}
                        {s.ev && <span className="pk-chip ev" style={{ marginLeft: 8 }}><IcBolt size={11} /> Lade</span>}
                        {st.shared && !st.solo && s.deling && <span className="pk-chip neutral" style={{ marginLeft: 6 }}>⇄ delt {s.deling}</span>}
                      </div>
                      <div className="desc">{s.ev ? "Ladeplass — kun elbil" : "Vanlig plass"}{half ? (st.am.holder ? " · kun ettermiddag ledig" : " · kun formiddag ledig") : ""}</div>
                    </div>
                    {locked
                      ? <button className="pk-grab locked" disabled><IcLock size={14} /> Elbil</button>
                      : <div className="pk-grab-periods">
                          {opts.map(p => (
                            <button key={p} className={"pk-grab-mini" + (p === "full" ? " full" : "")} onClick={() => {
                              if (sp && s.id === sp.id) onClaim(p); else onGrab(s.id, p);
                            }}>
                              {p === "full" ? "Ta hele dagen" : p === "am" ? "Formiddag" : "Ettermiddag"}
                            </button>
                          ))}
                        </div>}
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </>
  );
}
