"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.toLowerCase().endsWith("@visma.com")) {
      setError("Kun @visma.com-kontoer har tilgang.");
      return;
    }
    if (password.length < 6) {
      setError("Passordet må være minst 6 tegn.");
      return;
    }

    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Feil epost eller passord.");
      else window.location.href = "/parking";
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo("Sjekk eposten din for en bekreftelseslenke, og logg deretter inn.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      background: "var(--ink-50)", fontFamily: "var(--font-body)",
    }}>
      <div style={{
        background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 20,
        padding: "48px 40px", maxWidth: 400, width: "100%", boxShadow: "var(--shadow-lg)",
        textAlign: "center",
      }}>
        <img src="/HoC_Logo_Positive.svg" alt="House of Control" style={{ height: 32, marginBottom: 32 }} />
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-500)", marginBottom: 8 }}>
          Parkering
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Karenslyst allé 4
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-700)", margin: "0 0 28px" }}>
          {mode === "login" ? "Logg inn med Visma-eposten din." : "Opprett konto med Visma-eposten din."}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-700)", display: "block", marginBottom: 6 }}>
              E-post
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="fornavn.etternavn@visma.com" required autoFocus
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: "1.5px solid var(--border-strong)", fontFamily: "var(--font-body)",
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-700)", display: "block", marginBottom: 6 }}>
              Passord
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Minst 6 tegn" required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: "1.5px solid var(--border-strong)", fontFamily: "var(--font-body)",
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ background: "var(--danger-100)", color: "var(--danger)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background: "var(--success-100)", color: "var(--success)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
              {info}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: 0,
              background: "var(--ink-1000)", color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: "var(--font-body)", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? "Venter…" : mode === "login" ? "Logg inn" : "Opprett konto"}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
          style={{ marginTop: 20, background: "none", border: 0, fontSize: 13, color: "var(--ink-500)", cursor: "pointer", textDecoration: "underline" }}
        >
          {mode === "login" ? "Ny bruker? Opprett konto" : "Har allerede konto? Logg inn"}
        </button>
      </div>
    </div>
  );
}
