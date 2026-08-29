import type { Employee, Spot, Booking, Decision, SpotStatus } from "./types";

// --- Date helpers ---
const WD = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
export const WD_SHORT = ["søn","man","tir","ons","tor","fre","lør"];
export const MO = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function fromIso(s: string): Date {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d, 12);
}
export function fmtLong(d: Date): string { return `${WD[d.getDay()]} ${d.getDate()}. ${MO[d.getMonth()]}`; }
export function fmtShort(d: Date): string { return `${WD_SHORT[d.getDay()]} ${d.getDate()}.`; }
export function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
export function mondayOf(d: Date): Date { const x = new Date(d); const wd = (x.getDay()+6)%7; return addDays(x, -wd); }
export function weekNumber(d: Date): number {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay()+6)%7;
  x.setUTCDate(x.getUTCDate()-day+3);
  const ft = new Date(Date.UTC(x.getUTCFullYear(),0,4));
  const fd = (ft.getUTCDay()+6)%7;
  ft.setUTCDate(ft.getUTCDate()-fd+3);
  return 1+Math.round((x.getTime()-ft.getTime())/(7*864e5));
}

// --- Employee helpers ---
export function deriveEmployee(e: Omit<Employee, "first"|"initials">): Employee {
  const parts = e.name.split(" ");
  const first = parts[0];
  const initials = parts.map(p => p[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  return { ...e, first, initials };
}

// --- Spot helpers ---
export function isShared(s: Spot): boolean { return s.kind === "shared"; }
export function isPrivate(s: Spot): boolean { return s.kind === "private"; }
export function labelNum(s: Spot): number { return parseInt(String(s.label).slice(1), 10); }

// --- Holder extraction from bookings ---
export function getHolderFromBookings(
  bookings: Booking[],
  spotId: string,
  date: string
): { am: number | null; pm: number | null } {
  const dayBookings = bookings.filter(b => b.date === date && b.spot_id === spotId);
  let am: number | null = null;
  let pm: number | null = null;
  for (const b of dayBookings) {
    if (b.period === "full") { am = b.employee_id; pm = b.employee_id; }
    else if (b.period === "am") am = b.employee_id;
    else if (b.period === "pm") pm = b.employee_id;
  }
  return { am, pm };
}

// --- Core spot status ---
export function spotStatus(
  spot: Spot,
  bookings: Booking[],
  decisions: Decision[],
  date: string,
  currentUserId: number,
  deadlinePassed: boolean,
  employees: Employee[]
): SpotStatus {
  const uid = currentUserId;
  const { am, pm } = getHolderFromBookings(bookings, spot.id, date);

  // Private spots: kun eier kan booke, aldri åpen for andre
  if (isPrivate(spot)) {
    const amOwner = spot.owners.includes(uid);
    const myPeriod = (am === uid && pm === uid) ? "full" : am === uid ? "am" : pm === uid ? "pm" : null;
    const isMine = myPeriod != null;
    const isTaken = am != null || pm != null;
    return {
      spot, spotId: spot.id, shared: false, solo: false, owners: spot.owners, amOwner,
      bothOut: false, openToOthers: false,
      am: { holder: am, mine: am === uid }, pm: { holder: pm, mine: pm === uid },
      auto: false, released: false,
      othersFree: [],
      freeForMe: amOwner && !isTaken ? ["am", "pm"] : amOwner && myPeriod !== "full" ? (am == null ? ["am"] : pm == null ? ["pm"] : []) : [],
      evLocked: false, myPeriod, isMine,
      kind: isMine ? (myPeriod === "full" ? "mine" : "mine-partly") : isTaken ? "taken" : amOwner ? "free" : "reserved",
    };
  }

  const shared = isShared(spot);
  // solo = shared spot with exactly one owner (individual assigned, not a deling pair)
  const solo = shared && spot.owners.filter(o => o != null).length <= 1;
  const owners = spot.owners;
  const amOwner = owners.includes(uid);

  const dayDecisions = decisions.filter(d => d.date === date);
  const getDecision = (empId: number) => dayDecisions.find(d => d.employee_id === empId)?.value ?? null;

  const bothOut = shared && owners.length > 0 && owners.every(o => getDecision(o) === "out");
  const openToOthers = shared ? (bothOut || deadlinePassed) : true;

  const st: SpotStatus = {
    spot, spotId: spot.id, shared, solo, owners, amOwner, bothOut, openToOthers,
    am: { holder: am, mine: am === uid },
    pm: { holder: pm, mine: pm === uid },
    auto: shared && deadlinePassed && !bothOut,
    released: shared && (bothOut || deadlinePassed),
    othersFree: [],
    freeForMe: [],
    evLocked: false,
    myPeriod: null,
    isMine: false,
    kind: "free",
  };

  const hasEv = employees.find(e => e.id === uid)?.ev === true;
  const hasParking = employees.find(e => e.id === uid)?.parking === true;
  // Etter fristen åpner ALLE plasser (inkl. elbil) for alle ansatte.
  // Før fristen: kun de med parkering kan booke; elbilplasser krever elbil-registrering.
  const canEv = !spot.ev || hasEv || deadlinePassed;
  const canAccess = canEv && (hasParking || deadlinePassed);

  if (am == null && openToOthers) st.othersFree.push("am");
  if (pm == null && openToOthers) st.othersFree.push("pm");

  const slotOpenToMe = (empty: boolean) => empty && canAccess && (shared ? (amOwner || openToOthers) : true);
  if (slotOpenToMe(am == null)) st.freeForMe.push("am");
  if (slotOpenToMe(pm == null)) st.freeForMe.push("pm");

  st.evLocked = spot.ev && !canEv && (am == null || pm == null);
  st.myPeriod = (am === uid && pm === uid) ? "full" : am === uid ? "am" : pm === uid ? "pm" : null;
  st.isMine = st.myPeriod != null;

  if (am != null && pm != null) st.kind = st.isMine ? "mine" : "taken";
  else if (am == null && pm == null) st.kind = (shared && !openToOthers) ? "open" : "free";
  else st.kind = st.isMine ? "mine-partly" : "partly";

  return st;
}

export function allStatuses(
  spots: Spot[], bookings: Booking[], decisions: Decision[],
  date: string, currentUserId: number, deadlinePassed: boolean, employees: Employee[]
) {
  return spots.map(spot => ({ spot, st: spotStatus(spot, bookings, decisions, date, currentUserId, deadlinePassed, employees) }));
}

export function freeSpots(
  spots: Spot[], bookings: Booking[], decisions: Decision[],
  date: string, currentUserId: number, deadlinePassed: boolean, employees: Employee[]
): Spot[] {
  return spots.filter(s => spotStatus(s, bookings, decisions, date, currentUserId, deadlinePassed, employees).othersFree.length > 0);
}

export function mySharedSpot(spots: Spot[], currentUserId: number): Spot | null {
  return spots.find(s => isShared(s) && s.owners.includes(currentUserId)) ?? null;
}

export function partnerOf(spot: Spot, uid: number): number | null {
  return spot.owners.find(o => o !== uid) ?? null;
}

export function myHeldSpot(
  spots: Spot[], bookings: Booking[], date: string, currentUserId: number
): Spot | null {
  const uid = currentUserId;
  const sharedSpot = mySharedSpot(spots, uid);
  const found = spots.find(s => {
    if (sharedSpot && s.id === sharedSpot.id) return false;
    const { am, pm } = getHolderFromBookings(bookings, s.id, date);
    return am === uid || pm === uid;
  });
  return found ?? null;
}

export function periodsFromFree(freeForMe: Array<"am"|"pm">): Array<"full"|"am"|"pm"> {
  const opts: Array<"full"|"am"|"pm"> = [];
  if (freeForMe.includes("am") && freeForMe.includes("pm")) opts.push("full");
  if (freeForMe.includes("am")) opts.push("am");
  if (freeForMe.includes("pm")) opts.push("pm");
  return opts;
}

export function occupancyText(status: SpotStatus, employees: Employee[]): string {
  const a = status.am.holder, p = status.pm.holder;
  const nm = (id: number | null) => id != null ? (employees.find(e => e.id === id)?.first ?? "") : "";
  if (a && p && a === p) return nm(a);
  if (a && p) return `${nm(a)} / ${nm(p)}`;
  if (a) return `${nm(a)} (form.)`;
  if (p) return `${nm(p)} (ettm.)`;
  return "Ledig";
}

export const PERIOD_LABEL: Record<string, string> = {
  full: "Hele dagen", am: "Formiddag", pm: "Ettermiddag"
};

export function perTxt(p: string): string {
  return p === "full" ? "hele dagen" : p === "am" ? "formiddag" : "ettermiddag";
}
