import { useState } from "react";
import { Camera, ChevronLeft } from "lucide-react";
import { api } from "../lib/api";
import { SeatThumbnail } from "../components/UI";

export default function CameraScreen({ onBack, onIdentified }) {
  const [stage, setStage] = useState("ready");   // ready | identifying | results | error
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [manualText, setManualText] = useState("");

  const identify = async (ocrText) => {
    setStage("identifying");
    setError(null);
    try {
      const data = await api.identify({ ocrText });
      if (!data.candidates?.length) {
        setError("No matches. Try typing the brand and model from the label.");
        setStage("error");
        return;
      }
      setCandidates(data.candidates);
      setStage("results");
    } catch (err) {
      setError(err.message || "Identification failed");
      setStage("error");
    }
  };

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    identify(manualText.trim());
  };

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: "#1a1917", color: "#f5f1ea", paddingBottom: 40 }}>
      <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onBack} aria-label="Back" style={{ color: "#f5f1ea", display: "flex", alignItems: "center", gap: 4, padding: "10px 14px 10px 8px", marginLeft: -4, fontSize: 15 }}>
          <ChevronLeft size={22} /> Back
        </button>
      </div>

      {stage === "ready" && (
        <div style={{ padding: "20px 24px", textAlign: "center" }}>
          <div style={{
            margin: "24px auto 24px", width: 280, height: 260,
            border: "2px dashed #5c5247", borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 16
          }}>
            <Camera size={48} strokeWidth={1.5} color="#a89e8c" />
            <div style={{ fontSize: 13, color: "#a89e8c", maxWidth: 220, lineHeight: 1.4 }}>
              Live camera OCR is coming soon. Type what you see on the label:
            </div>
          </div>

          <form onSubmit={submitManual}>
            <input value={manualText} onChange={e => setManualText(e.target.value)}
                   placeholder="e.g. Chicco KeyFit 35 04079828"
                   style={{
                     width: "100%", padding: "14px 16px", borderRadius: 12,
                     background: "#2a2924", border: "1px solid #3a3832",
                     color: "#f5f1ea", fontSize: 15, marginBottom: 12, outline: "none"
                   }} />
            <button type="submit" disabled={!manualText.trim()} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: manualText.trim() ? "#f5f1ea" : "#3a3832",
              color: manualText.trim() ? "#1a1917" : "#a89e8c",
              fontSize: 15, fontWeight: 500
            }}>
              Identify
            </button>
          </form>
          <div style={{ fontSize: 11, color: "#6d5d47", marginTop: 14 }}>
            You can type the brand, model, or any numbers from the label.
          </div>
        </div>
      )}

      {stage === "identifying" && (
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, margin: "0 auto 24px", borderRadius: 16, background: "#2a2924", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="skeleton" style={{ width: 60, height: 60, borderRadius: 12 }} />
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3 }}>
            Identifying seat…
          </div>
          <div style={{ fontSize: 13, color: "#a89e8c", marginTop: 8 }}>
            Matching against the catalog
          </div>
        </div>
      )}

      {stage === "error" && (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#f5b1a9", marginBottom: 20 }}>{error}</div>
          <button onClick={() => setStage("ready")} style={{
            padding: "12px 28px", borderRadius: 999,
            background: "#f5f1ea", color: "#1a1917",
            fontSize: 14, fontWeight: 500
          }}>Try again</button>
        </div>
      )}

      {stage === "results" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#a89e8c", marginBottom: 4 }}>Best match</div>
          <button onClick={() => onIdentified(candidates[0].seat)} className="fade-up" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 18, marginBottom: 12, borderRadius: 14, background: "#2a2924", border: "1px solid #3a3832" }}>
            <SeatThumbnail seat={candidates[0].seat} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#a89e8c" }}>{candidates[0].seat.brand}</div>
              <div className="serif" style={{ fontSize: 20, fontWeight: 500, marginTop: 2, color: "#f5f1ea" }}>{candidates[0].seat.model}</div>
              <div style={{ fontSize: 12, color: "#a89e8c", marginTop: 4 }}>{Math.round(candidates[0].confidence * 100)}% confident</div>
            </div>
          </button>

          {candidates.length > 1 && (
            <>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#a89e8c", marginBottom: 8, marginTop: 24 }}>Other possibilities</div>
              {candidates.slice(1).map((c, i) => (
                <button key={c.seat.id} onClick={() => onIdentified(c.seat)} className="fade-up" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 14, marginBottom: 8, borderRadius: 12, background: "#2a2924", border: "1px solid #3a3832", animationDelay: `${(i + 1) * 80}ms` }}>
                  <SeatThumbnail seat={c.seat} size={42} />
                  <div style={{ flex: 1 }}>
                    <div className="serif" style={{ fontSize: 15, fontWeight: 500, color: "#f5f1ea" }}>{c.seat.brand} {c.seat.model}</div>
                    <div style={{ fontSize: 11, color: "#a89e8c" }}>{Math.round(c.confidence * 100)}% confident</div>
                  </div>
                </button>
              ))}
            </>
          )}

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <button onClick={() => { setStage("ready"); setCandidates([]); setManualText(""); }} style={{ color: "#a89e8c", fontSize: 13, textDecoration: "underline" }}>
              None of these — try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
