"use client";
import { useState } from "react";
import type { Employee, Spot, Booking, Decision, Settings } from "@/lib/types";
import { allStatuses, isShared } from "@/lib/parking-logic";
import { IcBolt, IcInfo, IcClock, IcSearch } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";

interface OverviewScreenProps {
  employees: Employee[];
  spots: Spot[];
  bookings: Booking[];
  decisions: Decision[];
  settings: Settings;
  viewIso: string;
  deadlinePassed: boolean;
  currentUser: Employee;
  onToggleEv: (id: number) => Promise<void>;
  onToggleParking: (id: number) => Promise<void>;
  onSetSharedOwner: (spotId: string, slot: 0|1, empId: number|null) => Promise<void>;
  onSetDeadline: (h: number) => Promise<void>;
}

export function OverviewScreen({
  employees, spots, bookings, decisions, settings, viewIso, deadlinePassed, currentUser,
  onToggleEv, onToggleParking, onSetSharedOwner, onSetDeadline,
}: OverviewScreenProps) {
  const [tab, setTab] = useState<"today"|"shared"|"people">("today");
  const [q, setQ] = useState("");
  const uid = currentUser.id;
  const stats = allStatuses(spots, bookings, decisions, viewIso, uid, deadlinePassed, employees);
  const parkers = employees.filter(e => e.parking);
  const free = stats.filter(x => x.st.othersFree.length > 0).length;
  const dayDecisions = decisions.filter(d => d.date === viewIso);
  const bookingOwners = new Set(bookings.filter(b => b.date === viewIso).map(b => b.employee_id));
  const respondedIds = new Set([...dayDecisions.map(d => d.employee_id), ...bookingOwners]);
  const pending = parkers.filter(p => !respondedIds.has(p.id)).length;
  const released = stats.filter(x => x.st.released).length;
  const sharedSpots = spots.filter(s => isShared(s));

  return (
    <>
      <div className="pk-h">
        <div className="eyebrow">Oversikt · kontoransvarlig</div>
        <h1>Parkeringsoversikt</h1>
        <p>Hvem står hvor, de delte plassene (A–E), og hvem som har parkering og lading på Karenslyst allé 4.</p>
      </div>

      <div className="pk-tabs">
        <button className={"pk-tab" + (tab === "today" ? " active" : "")} onClick={() => setTab("today")}>Hvem står hvor</button>
        <button className={"pk-tab" + (tab === "shared" ? " active" : "")} onClick={() => setTab("shared")}>Delte plasser</button>
        <button className={"pk-tab" + (tab === "people" ? " active" : "")} onClick={() => setTab("people")}>Personer &amp; frist</button>
      </div>

      {tab === "today" && (
        <>
          <div className="pk-stats">
            <div className="pk-stat accent"><div className="l">Ledige</div><div className="v">{free}</div></div>
            <div className="pk-stat warn"><div className="l">Ikke bekreftet</div><div className="v">{pending}<small> / {parkers.length}</small></div></div>
            <div className="pk-stat"><div className="l">Frigitt i dag</div><div className="v">{released}</div></div>
            <div className="pk-stat"><div className="l">Frist</div><div className="v" style={{ fontSize: 22 }}>{String(settings.deadline_hour).padStart(2,"0")}:00</div></div>
          </div>
          <div className="pk-table-card">
            <table className="pk-tbl">
              <thead><tr><th>Plass</th><th>Type</th><th>Tilhører</th><th>Status</th><th>Hvem står her nå</th></tr></thead>
              <tbody>
                {stats.map(({ spot, st }) => {
                  const am = st.am.holder ? employees.find(e => e.id === st.am.holder) ?? null : null;
                  const pm = st.pm.holder ? employees.find(e => e.id === st.pm.holder) ?? null : null;
                  const owners = (st.owners || []).map(o => employees.find(e => e.id === o)).filter(Boolean) as Employee[];
                  let occ;
                  if (am && pm && am.id === pm.id) occ = <span className="who-cell"><Avatar emp={am} size="sm" gold={st.isMine} /> {am.name}</span>;
                  else if (am || pm) occ = <span style={{ fontSize: 12.5 }}>{am ? am.first+" (form.)" : ""}{am && pm ? " · " : ""}{pm ? pm.first+" (ettm.)" : ""}</span>;
                  else occ = <span className="muted">Ledig</span>;
                  return (
                    <tr key={spot.id}>
                      <td><b style={{ fontVariantNumeric: "tabular-nums" }}>{spot.label}</b></td>
                      <td>
                        {spot.ev ? <span className="pk-chip ev"><IcBolt size={11} /> Lade</span> : <span className="muted">Vanlig</span>}
                        {isShared(spot) && <span className="pk-chip neutral" style={{ marginLeft: 6 }}>⇄ {spot.deling}</span>}
                      </td>
                      <td>{owners.length ? <span style={{ fontSize: 12.5 }}>{owners.map(o => o.first).join(" / ")}</span> : <span className="muted">— rullerende</span>}</td>
                      <td><StatusChip status={st} /></td>
                      <td>{occ}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "shared" && (
        <>
          <div className="pk-note" style={{ marginBottom: 16 }}><IcInfo size={16} /> Hver delt plass brukes av to personer som rullerer. Endre hvem som deler en plass her.</div>
          <div className="pk-table-card">
            <table className="pk-tbl">
              <thead><tr><th>Plass</th><th>Type</th><th>Deles av</th></tr></thead>
              <tbody>
                {sharedSpots.map(spot => {
                  return (
                    <tr key={spot.id}>
                      <td><b>{spot.label}</b> <span style={{ color: "var(--ink-400)" }}>· deling {spot.deling}</span></td>
                      <td>{spot.ev ? <span className="pk-chip ev"><IcBolt size={11} /> Lade</span> : <span className="muted">Vanlig</span>}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {([0,1] as const).map(slot => (
                            <select key={slot} className="pk-select"
                              value={slot === 0 ? (spot.owner1 ?? "") : (spot.owner2 ?? "")}
                              onChange={e => onSetSharedOwner(spot.id, slot, e.target.value ? Number(e.target.value) : null)}>
                              <option value="">— velg person</option>
                              {employees.map(p => <option key={p.id} value={p.id}>{p.name}{p.ev ? " ⚡" : ""}</option>)}
                            </select>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "people" && (
        <>
          <div className="pk-card" style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="pk-section-title" style={{ margin: 0 }}><IcClock size={15} /> Frist for daglig bekreftelse</div>
              <div style={{ fontSize: 13, color: "var(--ink-700)", marginTop: 4 }}>Plasser som ikke er bekreftet frigis automatisk.</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <button className="pk-date-btn" onClick={() => onSetDeadline(Math.max(6, settings.deadline_hour - 1))}>−</button>
              <div style={{ fontSize: 24, fontWeight: 700, minWidth: 70, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{String(settings.deadline_hour).padStart(2,"0")}:00</div>
              <button className="pk-date-btn" onClick={() => onSetDeadline(Math.min(12, settings.deadline_hour + 1))}>+</button>
            </div>
          </div>
          <div className="pk-modal-search" style={{ margin: "0 0 14px", maxWidth: 360 }}>
            <IcSearch size={16} />
            <input placeholder="Søk ansatt…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="pk-table-card">
            <table className="pk-tbl">
              <thead><tr><th>Ansatt</th><th>Delt plass</th><th>Parkering</th><th>Elbil ⚡</th></tr></thead>
              <tbody>
                {employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase())).map(emp => {
                  const sharedSpot = emp.deling ? sharedSpots.find(s => s.deling === emp.deling) : null;
                  return (
                    <tr key={emp.id}>
                      <td><span className="who-cell"><Avatar emp={emp} size="sm" /> {emp.name}</span></td>
                      <td>{sharedSpot ? <b>{sharedSpot.label} <span style={{ color: "var(--ink-400)", fontWeight: 400 }}>({emp.deling})</span></b> : <span className="muted">—</span>}</td>
                      <td>
                        <button className={"pk-chip " + (emp.parking ? "in" : "neutral")} style={{ cursor: "pointer", border: 0 }} onClick={() => onToggleParking(emp.id)}>
                          {emp.parking ? <><span className="dot"></span> Har plass</> : "Ingen"}
                        </button>
                      </td>
                      <td>
                        <button className={"pk-chip " + (emp.ev ? "ev" : "neutral")} style={{ cursor: "pointer", border: 0 }} onClick={() => onToggleEv(emp.id)}>
                          {emp.ev ? <><IcBolt size={11} /> Elbil</> : "Vanlig"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
