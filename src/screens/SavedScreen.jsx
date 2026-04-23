import { useState } from "react";
import { Plus, Trash2, Baby, Zap } from "lucide-react";
import { expirationStatus } from "../lib/api";
import { Badge, SeatThumbnail, EmptyState } from "../components/UI";

export default function SavedScreen({ savedSeats, children, onPickSeat, onRemoveSeat, onAddChild, onRemoveChild, onFitCheck, isAuthed }) {
  const [showChildForm, setShowChildForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [childWeight, setChildWeight] = useState("");
  const [childHeight, setChildHeight] = useState("");

  const submitChild = () => {
    if (!childName.trim()) return;
    onAddChild({
      name: childName.trim(),
      dob: childDob || undefined,
      weightLb: childWeight ? parseFloat(childWeight) : undefined,
      heightIn: childHeight ? parseFloat(childHeight) : undefined
    });
    setChildName(""); setChildDob(""); setChildWeight(""); setChildHeight("");
    setShowChildForm(false);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: "28px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4 }}>
          My Seats
        </div>
        <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.05, margin: "8px 0 20px", letterSpacing: -1 }}>
          Your garage.
        </h1>
      </div>

      {!isAuthed && (
        <div style={{ padding: "0 24px 16px" }}>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fbeed2", border: "1px solid #e8d59a", fontSize: 13, color: "#7a5a17", lineHeight: 1.5 }}>
            You're browsing without an account. Saved seats and children won't sync across devices. Sign in from Settings.
          </div>
        </div>
      )}

      {/* CHILDREN */}
      <div style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e" }}>Children</div>
          {!showChildForm && (
            <button onClick={() => setShowChildForm(true)} style={{ fontSize: 12, color: "#6d5d47", display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={14} /> Add child
            </button>
          )}
        </div>

        {children.length === 0 && !showChildForm && (
          <EmptyState title="No children yet" sub="Add a child to see which seats fit their current weight and height." />
        )}

        {children.map(child => (
          <div key={child.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, marginBottom: 8, borderRadius: 12, background: "#fff", border: "1px solid #ece7de" }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#eee8dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Baby size={18} color="#6d5d47" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 16, fontWeight: 500 }}>{child.name}</div>
              <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 2 }}>
                {[
                  child.weightLb && `${child.weightLb} lb`,
                  child.heightIn && `${child.heightIn}″`,
                  child.dob && `born ${new Date(child.dob).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                ].filter(Boolean).join(" · ") || "No stats yet"}
              </div>
            </div>
            <button onClick={() => onFitCheck(child)} aria-label="Fit check" title="Find seats that fit" style={{ padding: 8, color: "#2d5a32" }}>
              <Zap size={16} />
            </button>
            <button onClick={() => onRemoveChild(child.id)} aria-label="Remove" style={{ padding: 8, color: "#8a7e6e" }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {showChildForm && (
          <div className="fade-up" style={{ padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #e3dcc9", marginBottom: 8 }}>
            <input value={childName} onChange={e => setChildName(e.target.value)} placeholder="Name" autoFocus
                   style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e3dcc9", fontSize: 14, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={childWeight} onChange={e => setChildWeight(e.target.value)} placeholder="Weight (lb)" inputMode="decimal"
                     style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e3dcc9", fontSize: 14 }} />
              <input value={childHeight} onChange={e => setChildHeight(e.target.value)} placeholder="Height (in)" inputMode="decimal"
                     style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e3dcc9", fontSize: 14 }} />
            </div>
            <input type="date" value={childDob} onChange={e => setChildDob(e.target.value)}
                   style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e3dcc9", fontSize: 14, marginBottom: 12, color: childDob ? "#1a1917" : "#8a7e6e" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowChildForm(false)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #e3dcc9", fontSize: 14, color: "#5c5247" }}>Cancel</button>
              <button onClick={submitChild} disabled={!childName.trim()} style={{ flex: 2, padding: 12, borderRadius: 10, background: childName.trim() ? "#1a1917" : "#8a7e6e", color: "#f5f1ea", fontSize: 14, fontWeight: 500, opacity: childName.trim() ? 1 : 0.6 }}>Save child</button>
            </div>
          </div>
        )}
      </div>

      {/* SAVED SEATS */}
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 12 }}>
          Saved seats {savedSeats.length > 0 && `· ${savedSeats.length}`}
        </div>

        {savedSeats.length === 0 && (
          <EmptyState title="No saved seats" sub="Save a seat from its profile page. Tap Save to My Seats and enter the date of manufacture to track expiration." />
        )}

        {savedSeats.map(({ seat, dom, nickname }) => {
          const exp = expirationStatus(dom, seat.expirationYears);
          return (
            <div key={seat.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, marginBottom: 8, borderRadius: 12, background: "#fff", border: "1px solid #ece7de" }}>
              <button onClick={() => onPickSeat(seat)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, textAlign: "left" }}>
                <SeatThumbnail seat={seat} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2 }}>{nickname || seat.model}</div>
                  <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 4 }}>
                    {nickname ? `${seat.brand} ${seat.model} · ` : ""}{exp ? exp.label : "No DOM set"}
                  </div>
                </div>
              </button>
              {exp && (
                <Badge tone={exp.status === "expired" ? "bad" : exp.status === "warning" ? "warn" : "good"}>
                  {exp.status === "expired" ? "Expired" : exp.status === "warning" ? "Expiring" : "OK"}
                </Badge>
              )}
              <button onClick={() => onRemoveSeat(seat.id)} aria-label="Remove" style={{ padding: 8, color: "#8a7e6e" }}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
