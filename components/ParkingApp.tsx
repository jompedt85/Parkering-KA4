"use client";
import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { Employee, Spot, Booking, Decision, Settings } from "@/lib/types";
import { deriveEmployee, isShared, isoDate, addDays, fromIso, fmtShort, mySharedSpot } from "@/lib/parking-logic";
import { createClient } from "@/lib/supabase/client";
import { TodayScreen } from "@/components/TodayScreen";
import { MapScreen } from "@/components/MapScreen";
import { WeekScreen } from "@/components/WeekScreen";
import { OverviewScreen } from "@/components/OverviewScreen";
import { Avatar } from "@/components/ui/Avatar";
import {
  IcCalendar, IcGrid, IcWeek, IcUsers, IcChevL, IcChevR, IcChevD, IcClock, IcSearch, IcCheck, IcLogout,
} from "@/components/icons";

const TODAY_ISO = isoDate(new Date());

const NAV = [
  { id: "today" as const, label: "I dag", Icon: IcCalendar },
  { id: "map" as const, label: "Plasskart", Icon: IcGrid },
  { id: "week" as const, label: "Min uke", Icon: IcWeek },
  { id: "overview" as const, label: "Oversikt", Icon: IcUsers },
];

function metaLine(emp: Employee, spots: Spot[]): string {
  const sp = spots.find(s => isShared(s) && s.owners.includes(emp.id));
  if (sp) return "Delt plass " + sp.label;
  if (emp.parking) return "Generell parkering";
  return "Ingen parkering";
}

export function ParkingApp({ user }: { user: User }) {
  const supabase = createClient();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [settings, setSettings] = useState<Settings>({ deadline_hour: 7 });
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const [screen, setScreen] = useState<"today"|"map"|"week"|"overview">("today");
  const [viewIso, setViewIso] = useState(TODAY_ISO);
  const [now, setNow] = useState(() => new Date());
  const [showSwitch, setShowSwitch] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; kind?: string }>>([]);
  const [switchQ, setSwitchQ] = useState("");

  const pushToast = useCallback((msg: string, kind?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, msg, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2800);
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Load static data (employees, spots, settings)
  useEffect(() => {
    async function load() {
      try {
        const [empRes, spotRes, setRes] = await Promise.all([
          supabase.from("employees").select("*").order("name"),
          supabase.from("spots").select("*"),
          supabase.from("settings").select("*").single(),
        ]);

        if (empRes.error) throw new Error("employees: " + empRes.error.message);
        if (spotRes.error) throw new Error("spots: " + spotRes.error.message);

        const rawEmps: Employee[] = (empRes.data ?? []).map((e: Record<string,unknown>) => deriveEmployee({
          id: e.id as number, name: e.name as string, email: e.email as string,
          parking: e.parking as boolean, ev: e.ev as boolean, deling: e.deling as string|null,
        }));

        const rawSpots: Spot[] = (spotRes.data ?? []).map((s: Record<string,unknown>) => ({
          id: s.id as string, label: s.label as string, kind: s.kind as "shared"|"general",
          ev: s.ev as boolean, owner1: s.owner1 as number|null, owner2: s.owner2 as number|null,
          owners: [s.owner1, s.owner2].filter((x): x is number => x != null),
          deling: s.kind === "shared" ? (s.id as string) : null,
        }));

        setEmployees(rawEmps);
        setSpots(rawSpots);
        if (setRes.data) setSettings({ deadline_hour: setRes.data.deadline_hour });

        // Find current user by email
        const me = rawEmps.find(e => e.email.toLowerCase() === user.email?.toLowerCase());
        setCurrentUser(me ?? rawEmps[0] ?? null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.email]);

  // Load bookings and decisions for ±2 weeks
  const loadDynamic = useCallback(async () => {
    const from = isoDate(addDays(new Date(), -14));
    const to = isoDate(addDays(new Date(), 14));
    const [bRes, dRes] = await Promise.all([
      supabase.from("bookings").select("*").gte("date", from).lte("date", to),
      supabase.from("decisions").select("*").gte("date", from).lte("date", to),
    ]);
    setBookings(bRes.data ?? []);
    setDecisions(dRes.data ?? []);
  }, []);

  useEffect(() => { if (!loading) loadDynamic(); }, [loading, loadDynamic]);

  // Realtime subscription for bookings and decisions
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("parking-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadDynamic)
      .on("postgres_changes", { event: "*", schema: "public", table: "decisions" }, loadDynamic)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loading, loadDynamic]);

  // Clock tick
  useEffect(() => {
    const h = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(h);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--ink-50)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🅿</div>
          <div style={{ fontSize: 14, color: "var(--ink-500)" }}>Laster parkering…</div>
        </div>
      </div>
    );
  }

  if (loadError || !currentUser) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--ink-50)" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Kunne ikke laste data</div>
          {loadError && (
            <div style={{ fontSize: 12, color: "var(--ink-500)", fontFamily: "monospace", background: "#fff", padding: "12px", borderRadius: 8, marginBottom: 16, wordBreak: "break-all" }}>
              {loadError}
            </div>
          )}
          {!loadError && (
            <div style={{ fontSize: 14, color: "var(--ink-500)", marginBottom: 16 }}>
              E-posten din ({user.email}) er ikke registrert i ansattelisten.
              Be en administrator legge deg til.
            </div>
          )}
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
            style={{ padding: "10px 20px", borderRadius: 10, border: 0, background: "var(--ink-1000)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Logg ut
          </button>
        </div>
      </div>
    );
  }

  const deadlinePassed = viewIso === TODAY_ISO
    ? now.getHours() >= settings.deadline_hour
    : false;

  const meParks = currentUser.parking;
  const sp = mySharedSpot(spots, currentUser.id);
  const dayDecisions = decisions.filter(d => d.date === viewIso);
  const myDecision = dayDecisions.find(d => d.employee_id === currentUser.id)?.value ?? null;
  const myUnanswered = viewIso === TODAY_ISO && meParks && myDecision == null;

  const d = fromIso(viewIso);

  // --- Actions ---
  async function upsertDecision(date: string, value: "in"|"out"|null) {
    if (!currentUser) return;
    if (value == null) {
      await supabase.from("decisions").delete()
        .eq("date", date).eq("employee_id", currentUser.id);
    } else {
      await supabase.from("decisions").upsert({
        date, employee_id: currentUser.id, value,
      }, { onConflict: "date,employee_id" });
    }
    loadDynamic();
  }

  async function deleteMyBookingsForDate(date: string, spotId?: string) {
    if (!currentUser) return;
    let q = supabase.from("bookings").delete()
      .eq("date", date).eq("employee_id", currentUser.id);
    if (spotId) q = q.eq("spot_id", spotId);
    await q;
  }

  async function onClaim(period: "full"|"am"|"pm") {
    if (!sp || !currentUser) return;
    await deleteMyBookingsForDate(viewIso);
    const rows = period === "full"
      ? [{ date: viewIso, spot_id: sp.id, employee_id: currentUser.id, period: "full" }]
      : [{ date: viewIso, spot_id: sp.id, employee_id: currentUser.id, period }];
    await supabase.from("bookings").upsert(rows, { onConflict: "date,spot_id,period" });
    await upsertDecision(viewIso, "in");
    pushToast("Bekreftet — plassen din er klar");
    loadDynamic();
  }

  async function onRelease() {
    if (sp) await deleteMyBookingsForDate(viewIso, sp.id);
    await upsertDecision(viewIso, "out");
    pushToast("Plassen er frigitt for andre");
    loadDynamic();
  }

  async function onGrab(spotId: string, period: "full"|"am"|"pm") {
    if (!currentUser) return;
    await deleteMyBookingsForDate(viewIso);
    const rows = period === "full"
      ? [{ date: viewIso, spot_id: spotId, employee_id: currentUser.id, period: "full" }]
      : [{ date: viewIso, spot_id: spotId, employee_id: currentUser.id, period }];
    await supabase.from("bookings").upsert(rows, { onConflict: "date,spot_id,period" });
    const spot = spots.find(s => s.id === spotId);
    const ptxt = period === "am" ? " (formiddag)" : period === "pm" ? " (ettermiddag)" : "";
    pushToast(`Du har tatt plass ${spot?.label ?? spotId}${ptxt}`, spot?.ev ? "ev" : undefined);
    loadDynamic();
  }

  async function onUngrab(spotId: string) {
    await deleteMyBookingsForDate(viewIso, spotId);
    pushToast("Plassen er frigitt igjen");
    loadDynamic();
  }

  async function onSetDecision(date: string, value: "in"|"out"|null) {
    await upsertDecision(date, value);
    if (value === "out" && sp) await deleteMyBookingsForDate(date, sp.id);
    if (value === "in" && sp && currentUser) {
      await supabase.from("bookings").upsert(
        [{ date, spot_id: sp.id, employee_id: currentUser.id, period: "full" }],
        { onConflict: "date,spot_id,period" }
      );
    }
    loadDynamic();
  }

  async function onToggleEv(id: number) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    await supabase.from("employees").update({ ev: !emp.ev }).eq("id", id);
    setEmployees(es => es.map(e => e.id === id ? { ...e, ev: !e.ev } : e));
  }

  async function onToggleParking(id: number) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    await supabase.from("employees").update({ parking: !emp.parking }).eq("id", id);
    setEmployees(es => es.map(e => e.id === id ? { ...e, parking: !e.parking } : e));
  }

  async function onSetSharedOwner(spotId: string, slot: 0|1, empId: number|null) {
    const col = slot === 0 ? "owner1" : "owner2";
    await supabase.from("spots").update({ [col]: empId }).eq("id", spotId);
    setSpots(ss => ss.map(s => {
      if (s.id !== spotId) return s;
      const updated = { ...s, [slot === 0 ? "owner1" : "owner2"]: empId };
      updated.owners = [updated.owner1, updated.owner2].filter((x): x is number => x != null);
      return updated;
    }));
    pushToast("Delte plasser oppdatert");
  }

  async function onSetDeadline(h: number) {
    await supabase.from("settings").update({ deadline_hour: h }).eq("id", 1);
    setSettings(s => ({ ...s, deadline_hour: h }));
  }

  const showDateNav = screen !== "week";

  const DateNav = ({ wide }: { wide?: boolean }) => (
    <div className="pk-date-nav">
      <button className="pk-date-btn" onClick={() => setViewIso(isoDate(addDays(d, -1)))} aria-label="Forrige dag"><IcChevL size={18} /></button>
      <div className="pk-date-label" style={wide ? {} : { minWidth: 140 }}>
        {viewIso === TODAY_ISO ? "I dag" : fmtShort(d)}
      </div>
      <button className="pk-date-btn" onClick={() => setViewIso(isoDate(addDays(d, 1)))} aria-label="Neste dag"><IcChevR size={18} /></button>
      {viewIso !== TODAY_ISO && <button className="pk-date-today" onClick={() => setViewIso(TODAY_ISO)}>I dag</button>}
    </div>
  );

  return (
    <div className="pk-app">
      <aside className="pk-sidebar">
        <div className="pk-side-brand">
          <img src="/HoC_Logo_Positive.svg" alt="House of Control" />
        </div>
        <div style={{ padding: "12px 18px 4px" }}>
          <div className="pk-side-loc">Parkering<span>Karenslyst allé 4 · Skøyen</span></div>
        </div>
        <nav className="pk-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} className={"pk-nav-link" + (screen === id ? " active" : "")} onClick={() => setScreen(id)}>
              <Icon size={18} /> {label}
              {id === "today" && myUnanswered && <span className="pk-nav-badge">!</span>}
            </button>
          ))}
        </nav>
        <div className="pk-user-card" onClick={() => setShowSwitch(true)}>
          <Avatar emp={currentUser} gold={!!sp} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pk-user-name">{currentUser.name}</div>
            <div className="pk-user-meta">{metaLine(currentUser, spots)}{currentUser.ev && <span style={{ color: "var(--brand-cyan-700)" }}>· ⚡</span>}</div>
          </div>
          <IcChevD size={14} />
        </div>
      </aside>

      <div className="pk-main">
        <div className="pk-mobtop">
          <img src="/HoC_Logo_Positive.svg" alt="House of Control" />
          <div className="pk-user-card" style={{ margin: 0, flex: "none" }} onClick={() => setShowSwitch(true)}>
            <Avatar emp={currentUser} gold={!!sp} />
            <IcChevD size={14} />
          </div>
        </div>

        <header className="pk-topbar">
          {showDateNav ? <DateNav wide /> : <div style={{ fontWeight: 700 }}>Min uke</div>}
          <div className="pk-top-right">
            <div className="pk-clock"><IcClock size={15} /> {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}</div>
            <button className="pk-grab" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              style={{ background: "var(--ink-50)", color: "#010101", boxShadow: "inset 0 0 0 1px var(--border-strong)" }}>
              <IcLogout size={14} /> Logg ut
            </button>
          </div>
        </header>

        <div className="pk-content">
          {showDateNav && (
            <div className="pk-mob-datebar">
              <DateNav />
              <div className="pk-clock"><IcClock size={14} /> {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}</div>
            </div>
          )}

          {screen === "today" && (
            <TodayScreen employees={employees} spots={spots} bookings={bookings} decisions={decisions}
              viewIso={viewIso} deadlinePassed={deadlinePassed} deadlineHour={settings.deadline_hour}
              now={now} currentUser={currentUser} onClaim={onClaim} onRelease={onRelease} onGrab={onGrab} onUngrab={onUngrab} />
          )}
          {screen === "map" && (
            <MapScreen employees={employees} spots={spots} bookings={bookings} decisions={decisions}
              viewIso={viewIso} deadlinePassed={deadlinePassed} deadlineHour={settings.deadline_hour} currentUser={currentUser} onGrab={onGrab} onClaim={onClaim} />
          )}
          {screen === "week" && (
            <WeekScreen employees={employees} spots={spots} bookings={bookings} decisions={decisions}
              deadlinePassed={deadlinePassed} deadlineHour={settings.deadline_hour}
              currentUser={currentUser} onSetDecision={onSetDecision} />
          )}
          {screen === "overview" && (
            <OverviewScreen employees={employees} spots={spots} bookings={bookings} decisions={decisions}
              settings={settings} viewIso={viewIso} deadlinePassed={deadlinePassed} currentUser={currentUser}
              onToggleEv={onToggleEv} onToggleParking={onToggleParking}
              onSetSharedOwner={onSetSharedOwner} onSetDeadline={onSetDeadline} />
          )}
        </div>
      </div>

      <nav className="pk-mobnav">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)}>
            <Icon size={20} /> {label}
            {id === "today" && myUnanswered && <span className="pk-nav-badge">!</span>}
          </button>
        ))}
      </nav>

      {showSwitch && (
        <div className="pk-overlay" onClick={() => setShowSwitch(false)}>
          <div className="pk-modal" onClick={e => e.stopPropagation()}>
            <div className="pk-modal-head">
              <h3>{currentUser.name}</h3>
              <p>{user.email}</p>
            </div>
            <div className="pk-modal-search">
              <IcSearch size={16} />
              <input autoFocus placeholder="Søk etter navn…" value={switchQ} onChange={e => setSwitchQ(e.target.value)} />
            </div>
            <div className="pk-people">
              {employees.filter(e => e.name.toLowerCase().includes(switchQ.toLowerCase())).map(emp => {
                const sel = emp.id === currentUser.id;
                return (
                  <button key={emp.id} className={"pk-person" + (sel ? " sel" : "")} onClick={() => { setCurrentUser(emp); setShowSwitch(false); setSwitchQ(""); pushToast(`Byttet til ${emp.first}`); }}>
                    <Avatar emp={emp} gold={sel} />
                    <div style={{ flex: 1 }}>
                      <div className="pk-person-name">{emp.name}</div>
                      <div className="pk-person-meta">
                        <span>{metaLine(emp, spots)}</span>
                        {emp.ev && <span style={{ color: "var(--brand-cyan-700)" }}>⚡ Elbil</span>}
                      </div>
                    </div>
                    {sel && <IcCheck size={16} />}
                  </button>
                );
              })}
            </div>
            <button className="pk-cta ghost" style={{ margin: 12 }} onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>
              <IcLogout size={16} /> Logg ut
            </button>
          </div>
        </div>
      )}

      <div className="pk-toasts">
        {toasts.map(t => (
          <div key={t.id} className={"pk-toast" + (t.kind === "ev" ? " ev" : "")}>
            <IcCheck size={16} /> {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
