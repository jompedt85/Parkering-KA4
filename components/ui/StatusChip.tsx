import type { SpotStatus } from "@/lib/types";

export function StatusChip({ status }: { status: SpotStatus }) {
  if (status.kind === "mine") return <span className="pk-chip in"><span className="dot"></span>Din – hele dagen</span>;
  if (status.kind === "mine-partly") return <span className="pk-chip in"><span className="dot"></span>Din – {status.am.mine ? "formiddag" : "ettermiddag"}</span>;
  if (status.kind === "taken") return <span className="pk-chip in"><span className="dot"></span>I bruk</span>;
  if (status.kind === "partly") return <span className="pk-chip pending"><span className="dot"></span>Halv ledig</span>;
  if (status.kind === "open") return <span className="pk-chip pending"><span className="dot"></span>Ledig · deles</span>;
  if (status.kind === "free" && status.auto) return <span className="pk-chip auto"><span className="dot"></span>Auto-frigitt</span>;
  if (status.kind === "free" && status.released) return <span className="pk-chip out"><span className="dot"></span>Frigitt · ledig</span>;
  return <span className="pk-chip neutral"><span className="dot" style={{ background: "var(--success)" }}></span>Ledig</span>;
}
