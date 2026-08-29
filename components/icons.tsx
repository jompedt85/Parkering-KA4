import React from "react";

function PIcon({ d, size = 18, sw = 1.75, fill = "none" }: {
  d: string | string[]; size?: number; sw?: number; fill?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
         strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

type IconProps = { size?: number };
export const IcCar = (p: IconProps) => <PIcon {...p} d={["M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13","M5 13h14v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z","M7.5 16h.01","M16.5 16h.01"]} />;
export const IcBolt = (p: IconProps) => <PIcon {...p} d={["M13 2 4 14h7l-1 8 9-12h-7z"]} fill="currentColor" sw={0} />;
export const IcCalendar = (p: IconProps) => <PIcon {...p} d={["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M3 9h18","M8 2v4","M16 2v4"]} />;
export const IcCheck = (p: IconProps) => <PIcon {...p} d={["M20 6 9 17l-5-5"]} sw={2.2} />;
export const IcX = (p: IconProps) => <PIcon {...p} d={["M18 6 6 18","M6 6l12 12"]} sw={2.2} />;
export const IcClock = (p: IconProps) => <PIcon {...p} d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 7v5l3 2"]} />;
export const IcGrid = (p: IconProps) => <PIcon {...p} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;
export const IcWeek = (p: IconProps) => <PIcon {...p} d={["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M3 9h18","M8 13h.01","M12 13h.01","M16 13h.01","M8 17h.01","M12 17h.01"]} />;
export const IcUsers = (p: IconProps) => <PIcon {...p} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 7a4 4 0 1 0 0 8 4 4 0 1 0 0-8z","M22 21v-2a4 4 0 0 0-3-3.87","M17 3.13a4 4 0 0 1 0 7.75"]} />;
export const IcAlert = (p: IconProps) => <PIcon {...p} d={["M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
export const IcChevL = (p: IconProps) => <PIcon {...p} d={["M15 18l-6-6 6-6"]} sw={2} />;
export const IcChevR = (p: IconProps) => <PIcon {...p} d={["M9 18l6-6-6-6"]} sw={2} />;
export const IcChevD = (p: IconProps) => <PIcon {...p} d={["M6 9l6 6 6-6"]} sw={2} />;
export const IcLogout = (p: IconProps) => <PIcon {...p} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
export const IcSearch = (p: IconProps) => <PIcon {...p} d={["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z","M21 21l-4.35-4.35"]} />;
export const IcInfo = (p: IconProps) => <PIcon {...p} d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 16v-4","M12 8h.01"]} />;
export const IcLock = (p: IconProps) => <PIcon {...p} d={["M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z","M8 9V7a4 4 0 0 1 8 0v2"]} />;
export const IcArrow = (p: IconProps) => <PIcon {...p} d={["M5 12h14","M12 5l7 7-7 7"]} sw={2} />;
