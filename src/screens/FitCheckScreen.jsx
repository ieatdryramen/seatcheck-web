import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ChevronLeft, Zap } from "lucide-react";
import { api } from "../lib/api";
import { Badge, SeatCard, Spinner, ErrorBox } from "../components/UI";

export default function FitCheckScreen({ child, onBack, onPickSeat }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotFitting, setShowNotFitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // If child has a real ID (server-stored), use the authenticated endpoint.
        // Otherwise use the ad-hoc endpoint with raw stats.
        const ageMonths = child.dob
          ? Math.floor((Date.now() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
          : undefined;

        const data = child.id && !child.id.startsWith("local-")
          ? await api.fitCheckChild(child.id)
          : await api.fitCheck({ weightLb: child.weightLb, heightIn: child.heightIn, ageMonths });
        setResult(data);
      } catch (err) {
        setError(err.message || "Fit check failed");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [child]);

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onBack} aria-label="Back" style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px 10px 8px", marginLeft: -4, fontSize: 15, color: "#1a1917" }}>
          <ChevronLeft size={22} /> Back
        </button>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={12} /> Fit check
        </div>
        <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.05, margin: "8px 0 4px", letterSpacing: -0.8 }}>
          {child.name}
        </h1>
        <div style={{ fontSize: 13, color: "#6d5d47", marginBottom: 20 }}>
          {[
            child.weightLb && `${child.weightLb} lb`,
            child.heightIn && `${child.heightIn}″`,
            child.dob && `${Math.floor((Date.now() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))} months old`
          ].filter(Boolean).join(" · ")}
        </div>

        {loading && <Spinner label="Checking all 30 seats…" />}
        {error && <ErrorBox message={error} />}

        {result && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <Badge tone="good"><CheckCircle2 size={12} /> {result.fitting.length} fit</Badge>
              <Badge tone="neutral"><XCircle size={12} /> {result.notFitting.length} don't</Badge>
            </div>

            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 12 }}>
              Fitting seats
            </div>

            {result.fitting.length === 0 && (
              <div style={{ padding: 16, borderRadius: 10, background: "#fbeed2", border: "1px solid #e8d59a", fontSize: 13, color: "#7a5a17", lineHeight: 1.5 }}>
                No seats currently fit. Check that the weight and height are correct, or the child may have outgrown the catalog.
              </div>
            )}

            {result.fitting.map((r, i) => (
              <div key={r.seatId} className="fade-up" style={{ marginBottom: 8, animationDelay: `${i * 30}ms` }}>
                <SeatCardWithFitModes result={r} onClick={() => onPickSeat({ id: r.seatId, brand: r.brand, model: r.model, type: r.type })} />
              </div>
            ))}

            {result.notFitting.length > 0 && (
              <>
                <button onClick={() => setShowNotFitting(!showNotFitting)} style={{ fontSize: 12, color: "#6d5d47", textDecoration: "underline", marginTop: 24, marginBottom: 12 }}>
                  {showNotFitting ? "Hide" : "Show"} {result.notFitting.length} seat{result.notFitting.length > 1 ? "s" : ""} that don't fit
                </button>

                {showNotFitting && result.notFitting.map((r, i) => (
                  <div key={r.seatId} className="fade-up" style={{ marginBottom: 8, animationDelay: `${i * 20}ms`, opacity: 0.75 }}>
                    <SeatCardWithFitModes result={r} onClick={() => onPickSeat({ id: r.seatId, brand: r.brand, model: r.model, type: r.type })} dim />
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SeatCardWithFitModes({ result, onClick, dim }) {
  // Collapse mode info into a short label — which modes fit/don't
  const fittingLabels = result.fittingModes.map(m => m.label).join(", ");
  const reasons = result.nearMissModes?.flatMap(m => m.reasons).filter(Boolean);
  const summary = result.fits
    ? `Fits: ${fittingLabels}`
    : reasons?.[0] || "Doesn't currently fit";

  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left",
      padding: 14, borderRadius: 12,
      background: "#fff", border: "1px solid #ece7de",
      display: "flex", alignItems: "flex-start", gap: 14
    }}>
      <div style={{
        width: 6, alignSelf: "stretch", borderRadius: 999,
        background: dim ? "#d9d1c0" : "#5a8a5e"
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7e6e" }}>{result.brand}</div>
        <div className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2, marginTop: 2 }}>{result.model}</div>
        <div style={{ fontSize: 12, color: result.fits ? "#2d5a32" : "#7a2a22", marginTop: 4, lineHeight: 1.4 }}>
          {summary}
        </div>
      </div>
    </button>
  );
}
