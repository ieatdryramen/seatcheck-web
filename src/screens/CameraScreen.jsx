import { useState, useRef, useEffect } from "react";
import { Camera, ChevronLeft, Zap, RotateCcw, Type, Aperture } from "lucide-react";
import { api } from "../lib/api";
import { SeatThumbnail } from "../components/UI";

export default function CameraScreen({ onBack, onIdentified }) {
  // Stages: permission-check | ready | capturing | identifying | results | error | manual
  const [stage, setStage] = useState("permission-check");
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [manualText, setManualText] = useState("");
  const [facingMode, setFacingMode] = useState("environment");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const workerRef = useRef(null);

  const startCamera = async () => {
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser does not support camera access");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage("ready");
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Enable camera access in your browser settings, or type the label below.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Type the label text below.");
      } else {
        setError(`${err.message}. Type the label below.`);
      }
      setStage("manual");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (workerRef.current) workerRef.current.terminate().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setStage("capturing");
    setOcrProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop video feed during OCR to save battery
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      workerRef.current = worker;

      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();
      workerRef.current = null;

      const cleaned = text.replace(/\s+/g, " ").trim();
      setOcrText(cleaned);
      setStage("identifying");

      if (cleaned.length < 3) {
        setError("Couldn't read any text from the photo. Try a clearer shot or type what you see.");
        setStage("error");
        return;
      }

      const data = await api.identify({ ocrText: cleaned });
      if (!data.candidates?.length) {
        setError(`Found text but no matches. Read: "${cleaned.slice(0, 100)}${cleaned.length > 100 ? "…" : ""}". Try again with a better shot or type the brand/model.`);
        setStage("error");
        return;
      }
      setCandidates(data.candidates);
      setStage("results");
    } catch (err) {
      console.error(err);
      setError(err.message || "Identification failed");
      setStage("error");
    }
  };

  const submitManual = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setOcrText(manualText.trim());
    setStage("identifying");
    try {
      const data = await api.identify({ ocrText: manualText.trim() });
      if (!data.candidates?.length) {
        setError("No matches. Include the brand and any numbers from the label.");
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

  const restart = () => {
    setCandidates([]);
    setOcrText("");
    setManualText("");
    setError(null);
    setStage("permission-check");
    startCamera();
  };

  const switchCamera = () => {
    setFacingMode(f => (f === "environment" ? "user" : "environment"));
  };

  return (
    <div className="fade-in" style={{ minHeight: "100vh", background: "#1a1917", color: "#f5f1ea", paddingBottom: 40 }}>
      <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} aria-label="Back" style={{ color: "#f5f1ea", display: "flex", alignItems: "center", gap: 4, padding: "10px 14px 10px 8px", marginLeft: -4, fontSize: 15 }}>
          <ChevronLeft size={22} /> Back
        </button>
        {stage === "ready" && (
          <button onClick={switchCamera} aria-label="Switch camera" style={{ color: "#f5f1ea", padding: 10 }}>
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {stage === "permission-check" && (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 15, color: "#a89e8c" }}>Starting camera…</div>
          <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 8 }}>Allow camera access when your browser asks.</div>
        </div>
      )}

      {stage === "ready" && (
        <div style={{ padding: "20px 0 0" }}>
          <div style={{ position: "relative", margin: "0 16px", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "3/4" }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                border: "2px solid rgba(245, 241, 234, 0.85)",
                borderRadius: 12,
                width: "85%", height: "35%",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)"
              }} />
            </div>
            <div style={{
              position: "absolute", bottom: 12, left: 12, right: 12,
              textAlign: "center", fontSize: 12, color: "#f5f1ea",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)"
            }}>
              Frame the brand/model label in the box
            </div>
          </div>

          <div style={{ padding: "20px 24px", display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => { setStage("manual"); if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }} style={{
              padding: "14px", borderRadius: 12,
              background: "#2a2924", border: "1px solid #3a3832",
              color: "#f5f1ea", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontSize: 13
            }}>
              <Type size={16} /> Type it
            </button>
            <button onClick={captureAndIdentify} style={{
              flex: 1, padding: "18px", borderRadius: 999,
              background: "#f5f1ea", color: "#1a1917",
              fontSize: 16, fontWeight: 600, letterSpacing: 0.2,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10
            }}>
              <Aperture size={20} strokeWidth={2.2} /> Capture
            </button>
          </div>
        </div>
      )}

      {(stage === "capturing" || stage === "identifying") && (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, margin: "0 auto 24px", borderRadius: 16, background: "#2a2924", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="skeleton" style={{ width: 60, height: 60, borderRadius: 12 }} />
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3 }}>
            {stage === "capturing" ? "Reading label…" : "Identifying seat…"}
          </div>
          <div style={{ fontSize: 13, color: "#a89e8c", marginTop: 8 }}>
            {stage === "capturing" ? (ocrProgress ? `${ocrProgress}% complete` : "Running on-device OCR") : "Matching against catalog"}
          </div>
          {ocrText && stage === "identifying" && (
            <div style={{ fontSize: 11, color: "#6d5d47", marginTop: 16, padding: "12px 16px", background: "#2a2924", borderRadius: 8, textAlign: "left", fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }}>
              Read: "{ocrText.slice(0, 200)}{ocrText.length > 200 ? "…" : ""}"
            </div>
          )}
        </div>
      )}

      {stage === "manual" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#a89e8c", marginBottom: 10 }}>
            Type it
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 20 }}>
            What does the label say?
          </div>
          {error && (
            <div style={{ padding: 12, borderRadius: 10, background: "#3a2a26", border: "1px solid #5a3a32", fontSize: 13, color: "#f5b1a9", marginBottom: 16, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          <form onSubmit={submitManual}>
            <input value={manualText} onChange={e => setManualText(e.target.value)}
                   placeholder="e.g. Chicco KeyFit 35 04079828" autoFocus
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
          <div style={{ fontSize: 11, color: "#6d5d47", marginTop: 14, textAlign: "center" }}>
            Brand, model, or any numbers from the label all work.
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button onClick={restart} style={{ color: "#a89e8c", fontSize: 13, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Camera size={14} /> Try camera again
            </button>
          </div>
        </div>
      )}

      {stage === "error" && (
        <div style={{ padding: "40px 24px" }}>
          <div style={{ fontSize: 15, color: "#f5b1a9", marginBottom: 20, lineHeight: 1.5 }}>{error}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={restart} style={{
              padding: "12px 24px", borderRadius: 999,
              background: "#f5f1ea", color: "#1a1917",
              fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6
            }}>
              <Camera size={15} /> Try camera again
            </button>
            <button onClick={() => { setStage("manual"); setError(null); setManualText(ocrText || ""); }} style={{
              padding: "12px 24px", borderRadius: 999,
              background: "#2a2924", border: "1px solid #3a3832", color: "#f5f1ea",
              fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6
            }}>
              <Type size={15} /> Type the label
            </button>
          </div>
        </div>
      )}

      {stage === "results" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#a89e8c", marginBottom: 4 }}>
            <Zap size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Best match
          </div>
          <button onClick={() => onIdentified(candidates[0].seat)} className="fade-up" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 18, marginTop: 8, marginBottom: 12, borderRadius: 14, background: "#2a2924", border: "1px solid #3a3832" }}>
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

          {ocrText && (
            <div style={{ fontSize: 10, color: "#6d5d47", marginTop: 20, padding: 10, background: "#2a2924", borderRadius: 8, fontFamily: "ui-monospace, monospace", lineHeight: 1.4 }}>
              OCR read: "{ocrText.slice(0, 160)}{ocrText.length > 160 ? "…" : ""}"
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button onClick={restart} style={{ color: "#a89e8c", fontSize: 13, textDecoration: "underline" }}>
              None of these — try again
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
