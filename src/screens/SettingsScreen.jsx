import { Bell, Clock, Info, LogIn, LogOut, User } from "lucide-react";

export default function SettingsScreen({ user, settings, onToggle, savedCount, childrenCount, onSignIn, onSignOut }) {
  const items = [
    { key: "recallAlerts", icon: <Bell size={18} color="#6d5d47" />, label: "Recall alerts", sub: "Notify me when NHTSA issues a recall on my saved seats" },
    { key: "expirationWarnings", icon: <Clock size={18} color="#6d5d47" />, label: "Expiration warnings", sub: "Reminder 12 months before a seat expires" },
    { key: "installTips", icon: <Info size={18} color="#6d5d47" />, label: "Install tips", sub: "Occasional tips on avoiding common mistakes" }
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: "28px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4 }}>Settings</div>
        <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.05, margin: "8px 0 24px", letterSpacing: -1 }}>
          Your preferences.
        </h1>
      </div>

      <div style={{ padding: "0 24px" }}>
        {/* ACCOUNT */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Account</div>
        <div style={{ background: "#fff", border: "1px solid #ece7de", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          {user ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "#eee8dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={18} color="#6d5d47" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{user.name || "Signed in"}</div>
                  <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                </div>
              </div>
              <button onClick={onSignOut} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e3dcc9", fontSize: 13, color: "#7a2a22" }}>
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#5c5247", lineHeight: 1.5, marginBottom: 12 }}>
                Sign in to save seats and children across devices and receive recall alerts.
              </div>
              <button onClick={onSignIn} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 10, background: "#1a1917", color: "#f5f1ea", fontSize: 14, fontWeight: 500 }}>
                <LogIn size={15} /> Sign in or create account
              </button>
            </>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Notifications</div>
        <div style={{ background: "#fff", border: "1px solid #ece7de", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          {items.map((item, i) => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i === items.length - 1 ? "none" : "1px solid #ece7de" }}>
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 2, lineHeight: 1.4 }}>{item.sub}</div>
              </div>
              <button onClick={() => onToggle(item.key)} role="switch" aria-checked={settings[item.key]}
                      style={{ width: 42, height: 24, borderRadius: 999, background: settings[item.key] ? "#1a1917" : "#d9d1c0", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: settings[item.key] ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          ))}
        </div>

        {/* STATS */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Your data</div>
        <div style={{ background: "#fff", border: "1px solid #ece7de", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <Row label="Saved seats" value={savedCount} />
          <Row label="Children" value={childrenCount} last />
        </div>

        {/* ABOUT */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>About</div>
        <div style={{ background: "#fff", border: "1px solid #ece7de", borderRadius: 12, padding: 16, fontSize: 13, color: "#5c5247", lineHeight: 1.6 }}>
          SeatCheck v0.4 · Public beta<br />
          Recall data from NHTSA · Seat specs from manufacturers · Always verify against your seat's printed label and your vehicle's manual.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: last ? "none" : "1px solid #ece7de" }}>
      <div style={{ fontSize: 14, color: "#5c5247" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
