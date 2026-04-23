import { ExternalLink } from "lucide-react";

// Stable color map so a given brand always renders the same thumbnail tint
const BRAND_COLORS = {
  "Chicco": "#8b2332", "Graco": "#1f3a5f", "Britax": "#2a4a3a",
  "Evenflo": "#4a3a2a", "Safety 1st": "#2a5f7a", "Cybex": "#1a1a1a",
  "Nuna": "#2d4a3d", "Maxi-Cosi": "#4a4a2a", "Clek": "#1a1a1a",
  "Diono": "#3a2a4a", "Cosco": "#5a3a5a", "UPPAbaby": "#2a3a5a",
  "Peg Perego": "#4a2a2a"
};

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#eee8dc", fg: "#52453a", border: "#d9d1c0" },
    good:    { bg: "#e6f0e4", fg: "#2d5a32", border: "#c5dfc0" },
    warn:    { bg: "#fbeed2", fg: "#7a5a17", border: "#e8d59a" },
    bad:     { bg: "#f5dad6", fg: "#7a2a22", border: "#e0b0a9" }
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontSize: 12, fontWeight: 500, letterSpacing: 0.2
    }}>{children}</span>
  );
}

export function SeatThumbnail({ seat, size = 64 }) {
  const bg = seat.color || BRAND_COLORS[seat.brand] || "#4a4a4a";
  return (
    <div style={{
      width: size, height: size, background: bg, borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#f5f1ea", fontFamily: "Fraunces, serif", fontWeight: 600,
      fontSize: size * 0.35, flexShrink: 0,
      boxShadow: "0 1px 2px rgba(0,0,0,0.08), inset 0 -8px 24px rgba(0,0,0,0.25)"
    }}>{seat.brand[0]}</div>
  );
}

export function SeatCard({ seat, onClick, delay = 0, right = null }) {
  return (
    <button onClick={onClick} className="fade-up" style={{
      width: "100%", textAlign: "left",
      display: "flex", alignItems: "center", gap: 14,
      padding: 14, marginBottom: 8, borderRadius: 12,
      background: "#fff", border: "1px solid #ece7de",
      animationDelay: `${delay}ms`
    }}>
      <SeatThumbnail seat={seat} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7e6e" }}>
          {seat.brand}
        </div>
        <div className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2, marginTop: 2 }}>
          {seat.model}
        </div>
        <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 2 }}>
          {seat.type}{seat.msrp ? ` · ${seat.msrp}` : ""}
        </div>
      </div>
      {right}
    </button>
  );
}

export function ExternalLinkCard({ href, icon, title, sub }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px", borderRadius: 10, marginBottom: 8,
      background: "#fff", border: "1px solid #e3dcc9",
      textDecoration: "none", color: "#1a1917"
    }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: "#8a7e6e", marginTop: 2 }}>{sub}</div>}
      </div>
      <ExternalLink size={14} color="#8a7e6e" />
    </a>
  );
}

export function Spinner({ label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
      <div className="spinner" />
      {label && <div style={{ fontSize: 13, color: "#6d5d47" }}>{label}</div>}
    </div>
  );
}

export function EmptyState({ title, sub }) {
  return (
    <div style={{ padding: 20, borderRadius: 12, background: "#fff", border: "1px dashed #e3dcc9", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: "#6d5d47", lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ padding: 16, borderRadius: 10, background: "#f5dad6", border: "1px solid #e0b0a9", marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: "#7a2a22", lineHeight: 1.5, marginBottom: onRetry ? 10 : 0 }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ fontSize: 12, color: "#7a2a22", textDecoration: "underline" }}>
          Try again
        </button>
      )}
    </div>
  );
}

// URL helpers (moved from hardcoded catalog file)
export const nhtsaRecallUrl = (brand, model) =>
  `https://www.nhtsa.gov/recalls?nhtsaId=&query=${encodeURIComponent(`${brand} ${model}`)}#carseats`;

export const manualSearchUrl = (brand, model, site) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${brand} ${model} manual`)}+site:${site}`;

export const videoSearchUrl = (brand, model) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${brand} ${model} installation official`)}`;
