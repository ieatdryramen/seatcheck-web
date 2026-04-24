import { useState, useRef, useEffect } from "react";
import {
  Camera, ChevronLeft, Zap, RotateCcw, Type, Aperture,
  Tag, Car, Baby, Upload, AlertTriangle, CheckCircle2, HelpCircle,
  ShieldAlert, Info
} from "lucide-react";
import { api } from "../lib/api";
import { SeatThumbnail } from "../components/UI";

// ============================================================
// Mode picker — first screen user sees when they tap "Identify by photo"
// ============================================================
const MODES = [
  {
    key: "label",
    icon: Tag,
    title: "Identify a seat",
    sub: "Photograph the label or sticker to find the seat in the catalog",
    color: "#c4a971"
  },
  {
    key: "empty_install",
    icon: Car,
    title: "Check an empty install",
    sub: "Photograph a seat installed in your car — no child in it",
    color: "#8fa585",
    beta: true
  },
  {
    key: "harness_check",
    icon: Baby,
    title: "Check a harness",
    sub: "Photograph your child strapped in — we'll do a second-look review",
    color: "#c48b8b",
    beta: true
  }
];

// ============================================================
// Main component
// ============================================================
export default function CameraScreen({ onBack, onIdentified }) {
  const [mode, setMode] = useState(null);         // null = picker, else "label"|"empty_install"|"harness_check"
  const [stage, setStage] = useState("source");   // source | capture | capturing | identifying | results | error | manual
  const [source, setSource] = useState(null);     // "camera" | "upload"

  // Shared state across modes
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null); // { base64, mediaType, dataUrl }
  const [manualText, setManualText] = useState("");

  // Mode-specific results
  const [candidates, setCandidates] = useState([]);        // label mode
  const [ocrText, setOcrText] = useState("");              // label mode (debug display)
  const [ocrProgress, setOcrProgress] = useState(0);
  const [visionResult, setVisionResult] = useState(null);  // install/harness modes

  // Camera
  const [facingMode, setFacingMode] = useState("environment");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const workerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (workerRef.current) workerRef.current.terminate().catch(() => {});
    };
  }, []);

  // --- Camera start/stop ---
  const startCamera = async () => {
    setError(null);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser does not support camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage("capture");
    } catch (err) {
      console.error("Camera error:", err);
      const msg = err.name === "NotAllowedError"
        ? "Camera access denied. Pick a photo from your library or type the label."
        : err.name === "NotFoundError"
        ? "No camera found. Pick a photo from your library."
        : `${err.message}`;
      setError(msg);
      setStage("source");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Re-start camera when facing mode changes
  useEffect(() => {
    if (source === "camera" && stage === "capture") startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // --- Source selection ---
  const chooseCamera = () => {
    setSource("camera");
    setStage("capture");
    startCamera();
  };

  const chooseUpload = () => {
    setSource("upload");
    fileInputRef.current?.click();
  };

  const onFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selection of same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      setStage("source");
      return;
    }
    // Read as base64 for Claude Vision, and as dataURL for preview + OCR input
    const dataUrl = await readFileAsDataURL(file);
    const base64 = dataUrl.split(",")[1];
    const mediaType = file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";
    setCapturedImage({ base64, mediaType, dataUrl });
    // Straight to processing
    await processImage({ base64, mediaType, dataUrl });
  };

  // --- Capture from camera ---
  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    setCapturedImage({ base64, mediaType: "image/jpeg", dataUrl });
    stopCamera();
    await processImage({ base64, mediaType: "image/jpeg", dataUrl });
  };

  // --- The processing pipeline, one of two flavors ---
  const processImage = async ({ base64, mediaType, dataUrl }) => {
    setStage("capturing");
    setOcrProgress(0);

    try {
      if (mode === "label") {
        // OCR flow: extract text from image, send to /api/identify
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100));
          }
        });
        workerRef.current = worker;
        const { data: { text } } = await worker.recognize(dataUrl);
        await worker.terminate();
        workerRef.current = null;
        const cleaned = text.replace(/\s+/g, " ").trim();
        setOcrText(cleaned);
        setStage("identifying");

        if (cleaned.length < 3) {
          setError("Couldn't read any text. Try a clearer shot of the label, or type what you see.");
          setStage("error");
          return;
        }
        const data = await api.identify({ ocrText: cleaned });
        if (!data.candidates?.length) {
          setError(`Found text but no matches. Read: "${cleaned.slice(0, 100)}${cleaned.length > 100 ? "…" : ""}".`);
          setStage("error");
          return;
        }
        setCandidates(data.candidates);
        setStage("results");
      } else {
        // Vision flow: send image to Claude
        setStage("identifying");
        const result = await api.checkInstall({
          mode,
          imageBase64: base64,
          mediaType
        });
        setVisionResult(result);
        setStage("results");
      }
    } catch (err) {
      console.error(err);
      const msg = err.status === 503
        ? "The install-check feature isn't configured yet. Try the label mode for now."
        : err.message || "Something went wrong analyzing the photo.";
      setError(msg);
      setStage("error");
    }
  };

  // --- Manual text fallback (label mode only) ---
  const submitManual = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setStage("identifying");
    try {
      const data = await api.identify({ ocrText: manualText.trim() });
      if (!data.candidates?.length) {
        setError("No matches. Include the brand and any numbers from the label.");
        setStage("error");
        return;
      }
      setOcrText(manualText.trim());
      setCandidates(data.candidates);
      setStage("results");
    } catch (err) {
      setError(err.message || "Identification failed");
      setStage("error");
    }
  };

  // --- Reset helpers ---
  const resetToSource = () => {
    setCandidates([]); setVisionResult(null); setCapturedImage(null);
    setOcrText(""); setManualText(""); setError(null);
    setStage("source"); setSource(null);
  };

  const backToModePicker = () => {
    stopCamera();
    resetToSource();
    setMode(null);
  };

  // ============================================================
  // RENDERS
  // ============================================================

  // ---- Mode picker ----
  if (!mode) {
    return (
      <div className="fade-in" style={{ minHeight: "100vh", background: "#f5f1ea", paddingBottom: 40 }}>
        <div style={{ padding: "16px 16px 0" }}>
          <button onClick={onBack} aria-label="Back" style={{ color: "#1a1917", display: "flex", alignItems: "center", gap: 4, padding: "10px 14px 10px 8px", marginLeft: -4, fontSize: 15 }}>
            <ChevronLeft size={22} /> Back
          </button>
        </div>
        <div style={{ padding: "20px 24px 32px" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4 }}>
            Identify by photo
          </div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.05, margin: "8px 0 8px", letterSpacing: -0.8 }}>
            What are you photographing?
          </h1>
          <p style={{ fontSize: 14, color: "#5c5247", margin: "8px 0 24px", lineHeight: 1.5 }}>
            Pick one. You can take a new photo or upload an existing one.
          </p>

          {MODES.map((m, i) => {
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => setMode(m.key)} className="fade-up" style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 16,
                padding: 18, marginBottom: 12, borderRadius: 14,
                background: "#fff", border: "1px solid #ece7de",
                animationDelay: `${i * 60}ms`
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: m.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="serif" style={{ fontSize: 17, fontWeight: 500 }}>{m.title}</div>
                    {m.beta && (
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#7a5a17", background: "#fbeed2", padding: "2px 6px", borderRadius: 4 }}>
                        Beta
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#6d5d47", marginTop: 2, lineHeight: 1.4 }}>{m.sub}</div>
                </div>
              </button>
            );
          })}

          <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: "#faf5e8", border: "1px solid #eee0b8", fontSize: 12, color: "#52453a", lineHeight: 1.5 }}>
            <strong>About install and harness checks:</strong> these use AI as a "second look." They flag things worth investigating but never replace an in-person check by a certified CPST.
          </div>
        </div>
      </div>
    );
  }

  // ---- From here we're in one of the three modes ----
  const modeInfo = MODES.find(m => m.key === mode);
  const isDark = mode !== "label"; // label mode can stay light; install/harness dark for focus

  return (
    <div className="fade-in" style={{
      minHeight: "100vh",
      background: isDark ? "#1a1917" : "#f5f1ea",
      color: isDark ? "#f5f1ea" : "#1a1917",
      paddingBottom: 40
    }}>
      <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={backToModePicker} aria-label="Back" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 4, padding: "10px 14px 10px 8px", marginLeft: -4, fontSize: 15 }}>
          <ChevronLeft size={22} /> {modeInfo.title}
        </button>
        {stage === "capture" && (
          <button onClick={() => setFacingMode(f => f === "environment" ? "user" : "environment")} aria-label="Switch camera" style={{ color: "inherit", padding: 10 }}>
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* Source picker */}
      {stage === "source" && (
        <div style={{ padding: "24px" }}>
          {error && (
            <div style={{ padding: 12, borderRadius: 10, background: "#f5dad6", border: "1px solid #e0b0a9", fontSize: 13, color: "#7a2a22", marginBottom: 20, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button onClick={chooseUpload} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 14,
            padding: 18, marginBottom: 10, borderRadius: 14,
            background: "#fff", border: "1px solid #ece7de", textAlign: "left", color: "#1a1917"
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eee8dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Upload size={20} color="#5c5247" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="serif" style={{ fontSize: 17, fontWeight: 500 }}>Pick a photo</div>
              <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 2 }}>Choose from your photo library</div>
            </div>
          </button>

          <button onClick={chooseCamera} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 14,
            padding: 18, marginBottom: 10, borderRadius: 14,
            background: "#1a1917", color: "#f5f1ea", textAlign: "left"
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#2a2924", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} color="#f5f1ea" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="serif" style={{ fontSize: 17, fontWeight: 500 }}>Take a new photo</div>
              <div style={{ fontSize: 12, color: "#a89e8c", marginTop: 2 }}>Opens the camera</div>
            </div>
          </button>

          {mode === "label" && (
            <button onClick={() => setStage("manual")} style={{
              width: "100%", marginTop: 10, padding: "14px",
              background: "transparent", color: "#6d5d47",
              fontSize: 13, textDecoration: "underline"
            }}>
              Type the label text instead
            </button>
          )}

          {mode === "harness_check" && (
            <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: "#faf5e8", border: "1px solid #eee0b8", fontSize: 12, color: "#52453a", lineHeight: 1.5 }}>
              <strong>For best results:</strong> side view of the child in the seat, with chest clip and harness straps clearly visible. Good lighting helps.
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*"
                 onChange={onFilePicked} style={{ display: "none" }} />
        </div>
      )}

      {/* Camera viewfinder */}
      {stage === "capture" && source === "camera" && (
        <div style={{ padding: "20px 0 0" }}>
          <div style={{ position: "relative", margin: "0 16px", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "3/4" }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {mode === "label" && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ border: "2px solid rgba(245, 241, 234, 0.85)", borderRadius: 12, width: "85%", height: "35%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
              </div>
            )}
            <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, textAlign: "center", fontSize: 12, color: "#f5f1ea", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
              {mode === "label" && "Frame the brand/model label in the box"}
              {mode === "empty_install" && "Show the seat, seatbelt path, and recline clearly"}
              {mode === "harness_check" && "Side view with chest clip and harness visible"}
            </div>
          </div>

          <div style={{ padding: "20px 24px", display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => { stopCamera(); resetToSource(); }} style={{
              padding: "14px", borderRadius: 12,
              background: "#2a2924", border: "1px solid #3a3832", color: "#f5f1ea",
              fontSize: 13
            }}>
              Cancel
            </button>
            <button onClick={captureFromCamera} style={{
              flex: 1, padding: "18px", borderRadius: 999,
              background: "#f5f1ea", color: "#1a1917",
              fontSize: 16, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10
            }}>
              <Aperture size={20} strokeWidth={2.2} /> Capture
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {(stage === "capturing" || stage === "identifying") && (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          {capturedImage?.dataUrl && (
            <img src={capturedImage.dataUrl} alt="" style={{
              maxWidth: "100%", maxHeight: 240, borderRadius: 12, marginBottom: 24,
              border: isDark ? "1px solid #3a3832" : "1px solid #e3dcc9"
            }} />
          )}
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3 }}>
            {mode === "label"
              ? (stage === "capturing" ? "Reading label…" : "Identifying seat…")
              : (stage === "capturing" ? "Processing photo…" : "Analyzing with AI…")}
          </div>
          <div style={{ fontSize: 13, color: isDark ? "#a89e8c" : "#6d5d47", marginTop: 8 }}>
            {mode === "label" && stage === "capturing" && (ocrProgress ? `${ocrProgress}% complete` : "Running on-device OCR")}
            {mode === "label" && stage === "identifying" && "Matching against catalog"}
            {mode !== "label" && stage === "capturing" && "Preparing image"}
            {mode !== "label" && stage === "identifying" && "This may take 10–15 seconds"}
          </div>
        </div>
      )}

      {/* Manual text fallback */}
      {stage === "manual" && mode === "label" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Type it</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 20 }}>
            What does the label say?
          </div>
          <form onSubmit={submitManual}>
            <input value={manualText} onChange={e => setManualText(e.target.value)}
                   placeholder="e.g. Chicco KeyFit 35 04079828" autoFocus
                   style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid #e3dcc9", fontSize: 15, marginBottom: 12, outline: "none" }} />
            <button type="submit" disabled={!manualText.trim()} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: manualText.trim() ? "#1a1917" : "#8a7e6e",
              color: "#f5f1ea", fontSize: 15, fontWeight: 500, opacity: manualText.trim() ? 1 : 0.6
            }}>
              Identify
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={() => setStage("source")} style={{ color: "#6d5d47", fontSize: 13, textDecoration: "underline" }}>
              ← Go back
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div style={{ padding: "40px 24px" }}>
          <div style={{ fontSize: 15, color: isDark ? "#f5b1a9" : "#7a2a22", marginBottom: 20, lineHeight: 1.5 }}>{error}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={resetToSource} style={{
              padding: "12px 24px", borderRadius: 999,
              background: isDark ? "#f5f1ea" : "#1a1917",
              color: isDark ? "#1a1917" : "#f5f1ea",
              fontSize: 14, fontWeight: 500
            }}>
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ---- RESULTS ---- */}

      {stage === "results" && mode === "label" && (
        <LabelResults candidates={candidates} ocrText={ocrText} onPick={onIdentified} onRetry={resetToSource} />
      )}

      {stage === "results" && (mode === "empty_install" || mode === "harness_check") && (
        <VisionResults
          mode={mode}
          result={visionResult}
          imageDataUrl={capturedImage?.dataUrl}
          onRetry={resetToSource}
          onBack={backToModePicker}
        />
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ============================================================
// Label mode results (uses same pattern as before)
// ============================================================
function LabelResults({ candidates, ocrText, onPick, onRetry }) {
  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4 }}>
        <Zap size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Best match
      </div>
      <button onClick={() => onPick(candidates[0].seat)} className="fade-up" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 18, marginTop: 8, marginBottom: 12, borderRadius: 14, background: "#fff", border: "1px solid #ece7de" }}>
        <SeatThumbnail seat={candidates[0].seat} size={56} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7e6e" }}>{candidates[0].seat.brand}</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 500, marginTop: 2 }}>{candidates[0].seat.model}</div>
          <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 4 }}>{Math.round(candidates[0].confidence * 100)}% confident</div>
        </div>
      </button>

      {candidates.length > 1 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 8, marginTop: 24 }}>Other possibilities</div>
          {candidates.slice(1).map((c, i) => (
            <button key={c.seat.id} onClick={() => onPick(c.seat)} className="fade-up" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 14, marginBottom: 8, borderRadius: 12, background: "#fff", border: "1px solid #ece7de", animationDelay: `${(i + 1) * 80}ms` }}>
              <SeatThumbnail seat={c.seat} size={42} />
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>{c.seat.brand} {c.seat.model}</div>
                <div style={{ fontSize: 11, color: "#6d5d47" }}>{Math.round(c.confidence * 100)}% confident</div>
              </div>
            </button>
          ))}
        </>
      )}

      {ocrText && (
        <div style={{ fontSize: 10, color: "#8a7e6e", marginTop: 20, padding: 10, background: "#eee8dc", borderRadius: 8, fontFamily: "ui-monospace, monospace", lineHeight: 1.4 }}>
          Read: "{ocrText.slice(0, 160)}{ocrText.length > 160 ? "…" : ""}"
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button onClick={onRetry} style={{ color: "#6d5d47", fontSize: 13, textDecoration: "underline" }}>
          None of these — try again
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Install / harness results
// ============================================================
function VisionResults({ mode, result, imageDataUrl, onRetry, onBack }) {
  if (!result) return null;
  if (result.error === "parse_failed") {
    return (
      <div style={{ padding: "20px 24px" }}>
        <div style={{ padding: 14, borderRadius: 10, background: "#fbeed2", border: "1px solid #e8d59a", fontSize: 13, color: "#7a5a17", marginBottom: 16 }}>
          The AI didn't return a clean response. Here's what it said:
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: "#fff", border: "1px solid #e3dcc9", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {result.rawResponse}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={onRetry} style={{ color: "#f5f1ea", fontSize: 14, padding: "12px 24px", borderRadius: 999, background: "#2a2924", border: "1px solid #3a3832" }}>Try a different photo</button>
        </div>
      </div>
    );
  }

  // Bucket observations by concern level
  const obs = Array.isArray(result.observations) ? result.observations : [];
  const highs = obs.filter(o => o.concern === "high");
  const mediums = obs.filter(o => o.concern === "medium");
  const lows = obs.filter(o => o.concern === "low");
  const unclears = obs.filter(o => o.concern === "unclear");

  return (
    <div className="fade-in" style={{ padding: "20px 24px" }}>
      {/* Second-look banner always at top */}
      <div style={{
        padding: 14, borderRadius: 10, marginBottom: 20,
        background: "#2a2924", border: "1px solid #3a3832",
        display: "flex", gap: 10, alignItems: "flex-start"
      }}>
        <Info size={16} color="#c4a971" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#e8dfc8", lineHeight: 1.5 }}>
          This is a <strong>second look</strong>, not a certification. A certified CPST should verify in person. Find one at safekids.org.
        </div>
      </div>

      {imageDataUrl && (
        <img src={imageDataUrl} alt="Analyzed"
             style={{ maxWidth: "100%", borderRadius: 12, marginBottom: 20, border: "1px solid #3a3832" }} />
      )}

      {result.whatISee && (
        <div style={{ fontSize: 14, color: "#e8dfc8", marginBottom: 24, lineHeight: 1.5, fontStyle: "italic" }}>
          "{result.whatISee}"
        </div>
      )}

      {/* High-priority concerns */}
      {highs.length > 0 && (
        <Section title="Needs attention" tone="high" icon={<ShieldAlert size={14} />}>
          {highs.map((o, i) => <ObservationRow key={i} obs={o} />)}
        </Section>
      )}

      {/* Medium concerns */}
      {mediums.length > 0 && (
        <Section title="Worth a closer look" tone="medium" icon={<AlertTriangle size={14} />}>
          {mediums.map((o, i) => <ObservationRow key={i} obs={o} />)}
        </Section>
      )}

      {/* Things that look ok */}
      {(result.lookGood?.length > 0 || lows.length > 0) && (
        <Section title="Appears OK" tone="good" icon={<CheckCircle2 size={14} />}>
          {result.lookGood?.map((t, i) => <TextRow key={`g${i}`} text={t} />)}
          {lows.map((o, i) => <ObservationRow key={`l${i}`} obs={o} />)}
        </Section>
      )}

      {/* Can't tell */}
      {(result.cantTell?.length > 0 || unclears.length > 0) && (
        <Section title="Can't tell from this photo" tone="unclear" icon={<HelpCircle size={14} />}>
          {result.cantTell?.map((t, i) => <TextRow key={`c${i}`} text={t} />)}
          {unclears.map((o, i) => <ObservationRow key={`u${i}`} obs={o} />)}
        </Section>
      )}

      {/* Next steps */}
      {result.nextSteps?.length > 0 && (
        <Section title="Next steps" tone="neutral" icon={<Zap size={14} />}>
          {result.nextSteps.map((t, i) => <TextRow key={i} text={t} />)}
        </Section>
      )}

      {/* Worth checking */}
      {result.worthChecking?.length > 0 && (
        <Section title="Double-check these yourself" tone="neutral" icon={<AlertTriangle size={14} />}>
          {result.worthChecking.map((t, i) => <TextRow key={i} text={t} />)}
        </Section>
      )}

      {/* Final disclaimer */}
      {result.disclaimer && (
        <div style={{
          marginTop: 24, padding: 16, borderRadius: 10,
          background: "#2a2924", border: "1px solid #3a3832",
          fontSize: 13, color: "#e8dfc8", lineHeight: 1.6
        }}>
          <strong style={{ color: "#c4a971" }}>Reminder:</strong> {result.disclaimer}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
        <button onClick={onRetry} style={{
          padding: "12px 24px", borderRadius: 999,
          background: "#f5f1ea", color: "#1a1917",
          fontSize: 14, fontWeight: 500
        }}>
          Try another photo
        </button>
        <button onClick={onBack} style={{
          padding: "12px 24px", borderRadius: 999,
          background: "#2a2924", border: "1px solid #3a3832", color: "#f5f1ea",
          fontSize: 14, fontWeight: 500
        }}>
          Done
        </button>
      </div>
    </div>
  );
}

function Section({ title, tone, icon, children }) {
  const toneColors = {
    high:    { bg: "#3a2a26", border: "#5a3a32", fg: "#f5b1a9", accent: "#e57c72" },
    medium:  { bg: "#3a3426", border: "#5a4a32", fg: "#e8d59a", accent: "#c4a971" },
    good:    { bg: "#2a3a2e", border: "#3a5a3e", fg: "#b5d9ba", accent: "#8fa585" },
    unclear: { bg: "#2a2a2a", border: "#3a3a3a", fg: "#c8c8c8", accent: "#a0a0a0" },
    neutral: { bg: "#2a2924", border: "#3a3832", fg: "#e8dfc8", accent: "#c4a971" }
  };
  const t = toneColors[tone];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
        color: t.accent, marginBottom: 8
      }}>
        {icon} {title}
      </div>
      <div style={{
        padding: 14, borderRadius: 10,
        background: t.bg, border: `1px solid ${t.border}`,
        color: t.fg
      }}>
        {children}
      </div>
    </div>
  );
}

function ObservationRow({ obs }) {
  return (
    <div style={{ padding: "4px 0", fontSize: 13, lineHeight: 1.5 }}>
      {obs.feature && <strong style={{ fontWeight: 600 }}>{obs.feature}:</strong>} {obs.finding}
    </div>
  );
}

function TextRow({ text }) {
  return (
    <div style={{ padding: "4px 0", fontSize: 13, lineHeight: 1.5 }}>• {text}</div>
  );
}
