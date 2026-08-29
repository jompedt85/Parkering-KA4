export interface Employee {
  id: number;
  name: string;
  email: string;
  parking: boolean;
  ev: boolean;
  deling: string | null;
  // derived
  first: string;
  initials: string;
}

export interface Spot {
  id: string;        // 'A'-'E' shared, 'G1'-'G12' general
  label: string;     // 'P1'-'P9', 'L1'-'L8'
  kind: "shared" | "general" | "private";
  ev: boolean;
  owner1: number | null;
  owner2: number | null;
  // derived
  owners: number[];
  deling: string | null;
}

export interface Booking {
  id: string;
  date: string;      // ISO date
  spot_id: string;
  employee_id: number;
  period: "full" | "am" | "pm";
}

export interface Decision {
  date: string;
  employee_id: number;
  value: "in" | "out";
}

export interface Settings {
  deadline_hour: number;
}

export interface HalfDay {
  holder: number | null;
  mine: boolean;
}

export interface SpotStatus {
  spot: Spot;
  spotId: string;
  shared: boolean;
  solo: boolean;        // shared spot with exactly one owner (individual assigned spot)
  owners: number[];
  amOwner: boolean;
  bothOut: boolean;
  openToOthers: boolean;
  am: HalfDay;
  pm: HalfDay;
  auto: boolean;
  released: boolean;
  othersFree: Array<"am" | "pm">;
  freeForMe: Array<"am" | "pm">;
  evLocked: boolean;
  myPeriod: "full" | "am" | "pm" | null;
  isMine: boolean;
  kind: "mine" | "mine-partly" | "taken" | "free" | "partly" | "open" | "reserved";
}
