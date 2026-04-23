import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Plane, Shield, Calendar, ExternalLink, BookmarkPlus, FileText, Youtube, ShieldAlert, Share2 } from "lucide-react";
import { expirationStatus } from "../lib/api";
import { Badge, SeatThumbnail, ExternalLinkCard, nhtsaRecallUrl, manualSearchUrl, videoSearchUrl } from "../components/UI";

const modeLabels = {
  rearFacing: "Rear-facing",
  forwardFacing: "Forward-facing",
  booster: "Booster",
  highbackBooster: "High-back booster",
  backlessBooster: "Backless booster"
};

export default function SeatProfile({ seat, onSave, isSaved, savedData }) {
  const [tab, setTab] = useState("install");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [nickname, setNickname] = useState(savedData?.nickname || "");
  const [dom, setDom] = useState(savedData?.dom || "");

  const expState = expirationStatus(dom || savedData?.dom, seat.expirationYears);

  const handleShare = async () => {
    const shareData = {
      title: `${seat.brand} ${seat.model}`,
      text: `${seat.brand} ${seat.model} — ${seat.type}`,
      url: seat.productUrl
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`); alert("Link copied"); }
    } catch {}
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <SeatThumbnail seat={seat} size={80} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e" }}>{seat.brand} · {seat.type}</div>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.05, margin: "6px 0 10px", letterSpacing: -0.6 }}>{seat.model}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Badge tone={(!seat.recalls || seat.recalls.length === 0) ? "good" : "bad"}>
                {(!seat.recalls || seat.recalls.length === 0)
                  ? <><CheckCircle2 size={12} strokeWidth={2.5} /> No recalls</>
                  : <><AlertTriangle size={12} strokeWidth={2.5} /> {seat.recalls.length} recall{seat.recalls.length > 1 ? "s" : ""}</>}
              </Badge>
              {seat.faaApproved && <Badge tone="neutral"><Plane size={12} strokeWidth={2.5} /> FAA</Badge>}
              <Badge tone="neutral">{seat.expirationYears}-yr life</Badge>
            </div>
          </div>
        </div>

        {isSaved && expState && (
          <div style={{
            marginTop: 16, padding: "12px 14px", borderRadius: 10,
            background: expState.status === "expired" ? "#f5dad6" : expState.status === "warning" ? "#fbeed2" : "#e6f0e4",
            border: `1px solid ${expState.status === "expired" ? "#e0b0a9" : expState.status === "warning" ? "#e8d59a" : "#c5dfc0"}`,
            display: "flex", alignItems: "center", gap: 10
          }}>
            {expState.status === "expired" ? <AlertTriangle size={16} color="#7a2a22" /> :
             expState.status === "warning" ? <Clock size={16} color="#7a5a17" /> :
             <CheckCircle2 size={16} color="#2d5a32" />}
            <div style={{ fontSize: 13, color: "#1a1917" }}>
              <strong>{savedData.nickname || "Your seat"}</strong> · {expState.label}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          {!isSaved && (
            <button onClick={() => setShowSaveForm(!showSaveForm)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid #e3dcc9", fontSize: 13, color: "#1a1917" }}>
              <BookmarkPlus size={15} /> Save to My Seats
            </button>
          )}
          <button onClick={handleShare} aria-label="Share" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid #e3dcc9", fontSize: 13, color: "#1a1917", flex: isSaved ? 1 : 0 }}>
            <Share2 size={15} /> Share
          </button>
        </div>

        {showSaveForm && !isSaved && (
          <div className="fade-up" style={{ marginTop: 12, padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #e3dcc9" }}>
            <div style={{ fontSize: 12, color: "#6d5d47", marginBottom: 6 }}>Nickname (optional)</div>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Emma's seat"
                   style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e3dcc9", fontSize: 14, marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: "#6d5d47", marginBottom: 6 }}>Date of manufacture</div>
            <input type="month" value={dom} onChange={e => setDom(e.target.value)}
                   style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e3dcc9", fontSize: 14, marginBottom: 12 }} />
            <button onClick={() => { onSave(seat, { nickname, dom }); setShowSaveForm(false); }} disabled={!dom}
                    style={{ width: "100%", padding: 12, borderRadius: 10, background: dom ? "#1a1917" : "#8a7e6e", color: "#f5f1ea", fontSize: 14, fontWeight: 500, opacity: dom ? 1 : 0.6 }}>
              Save seat
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", padding: "24px 20px 0", borderBottom: "1px solid #ece7de", marginTop: 20, gap: 4 }}>
        {["install", "safety", "specs"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 14px",
            fontSize: 13, fontWeight: 500, letterSpacing: 0.2, textTransform: "capitalize",
            color: tab === t ? "#1a1917" : "#8a7e6e",
            borderBottom: tab === t ? "2px solid #1a1917" : "2px solid transparent",
            marginBottom: -1
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {tab === "install" && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              {(seat.installSteps || []).map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                  <div className="serif tabular" style={{ fontSize: 22, fontWeight: 500, color: "#c4a971", width: 28, flexShrink: 0, lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 14, color: "#5c5247", lineHeight: 1.5 }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Official resources</div>
            <ExternalLinkCard href={seat.productUrl} icon={<ExternalLink size={16} color="#6d5d47" />} title={`${seat.brand} product page`} sub={seat.site} />
            <ExternalLinkCard href={manualSearchUrl(seat.brand, seat.model, seat.site)} icon={<FileText size={16} color="#6d5d47" />} title="Find manufacturer manual" sub="Scoped search on manufacturer's site" />
            <ExternalLinkCard href={videoSearchUrl(seat.brand, seat.model)} icon={<Youtube size={16} color="#6d5d47" />} title="Installation videos" sub="Official and CPST-verified videos" />

            {seat.commonMistakes?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Common mistakes for this seat</div>
                {seat.commonMistakes.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "#faf5e8", borderRadius: 8, marginBottom: 6, border: "1px solid #eee0b8" }}>
                    <AlertTriangle size={14} color="#7a5a17" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 13, color: "#52453a", lineHeight: 1.5 }}>{m}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "safety" && (
          <div className="fade-in">
            <SafetyRow
              icon={<CheckCircle2 size={18} color={(seat.recalls?.length || 0) === 0 ? "#2d5a32" : "#7a2a22"} />}
              label="Recall status"
              value={(seat.recalls?.length || 0) === 0 ? "No open recalls" : `${seat.recalls.length} recall${seat.recalls.length > 1 ? "s" : ""} on file`}
              sub="Source: NHTSA"
            />
            <SafetyRow icon={<Calendar size={18} color="#52453a" />} label="Expiration" value={`${seat.expirationYears} years from date of manufacture`} sub={dom || savedData?.dom ? (expState?.label || "—") : "Enter DOM to calculate exact expiration"} />
            <SafetyRow icon={<Plane size={18} color={seat.faaApproved ? "#2d5a32" : "#8a7e6e"} />} label="FAA approval" value={seat.faaApproved ? "Approved for aircraft" : "Not FAA-approved"} sub={seat.faaApproved ? "Check manual for carrier-only details" : "Don't bring on flights"} />
            <SafetyRow icon={<Shield size={18} color="#2d5a32" />} label="Crash standards" value="Meets FMVSS 213" sub="Side-impact tested per 2025 updated standard" />

            {seat.recalls?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Recall details</div>
                {seat.recalls.map(r => (
                  <div key={r.id} style={{ padding: 14, borderRadius: 10, background: "#f5dad6", border: "1px solid #e0b0a9", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#7a2a22", marginBottom: 4 }}>{r.productName}</div>
                    <div style={{ fontSize: 11, color: "#8a5a52", marginBottom: 8 }}>NHTSA {r.nhtsaId} · {new Date(r.datePublished).toLocaleDateString()}</div>
                    <div style={{ fontSize: 13, color: "#52453a", lineHeight: 1.5 }}>{r.summary}</div>
                    {r.remedy && <div style={{ fontSize: 12, color: "#5c5247", marginTop: 8, lineHeight: 1.5 }}><strong>Remedy:</strong> {r.remedy}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 10 }}>Verify for yourself</div>
              <ExternalLinkCard href={nhtsaRecallUrl(seat.brand, seat.model)} icon={<ShieldAlert size={16} color="#6d5d47" />} title="Check NHTSA for recalls" sub="Official U.S. safety authority" />
              <ExternalLinkCard href={seat.productUrl} icon={<ExternalLink size={16} color="#6d5d47" />} title="Manufacturer's current safety info" sub={seat.site} />
            </div>

            <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: "#f5f1ea", border: "1px solid #e3dcc9", fontSize: 12, color: "#6d5d47", lineHeight: 1.5 }}>
              Safety info is sourced from the manufacturer and NHTSA for reference. Always follow the instructions printed on your specific seat and in your vehicle's manual.
            </div>
          </div>
        )}

        {tab === "specs" && (
          <div className="fade-in">
            {Object.entries(seat.modes || {}).map(([mode, data]) => (
              <div key={mode} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 8 }}>{modeLabels[mode] || mode}</div>
                <div style={{ background: "#fff", border: "1px solid #ece7de", borderRadius: 10, overflow: "hidden" }}>
                  <SpecRow label="Weight" value={data.weight} />
                  <SpecRow label="Height" value={data.height} />
                  {data.age && <SpecRow label="Age" value={data.age} last />}
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 8 }}>Physical</div>
              <div style={{ background: "#fff", border: "1px solid #ece7de", borderRadius: 10, overflow: "hidden" }}>
                <SpecRow label="Dimensions" value={seat.dimensions} />
                <SpecRow label="Seat weight" value={seat.seatWeight} />
                <SpecRow label="LATCH max" value={seat.latchWeightMax} />
                <SpecRow label="Model nos." value={(seat.modelNumbers || []).join(", ")} />
                <SpecRow label="MSRP" value={seat.msrp} />
                <SpecRow label="Introduced" value={String(seat.year || "")} last />
              </div>
            </div>

            {seat.notes && (
              <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: "#faf5e8", border: "1px solid #eee0b8", fontSize: 13, color: "#52453a", lineHeight: 1.5, fontStyle: "italic" }}>{seat.notes}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SafetyRow({ icon, label, value, sub }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid #ece7de" }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7e6e" }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1917", marginTop: 2 }}>{value}</div>
        <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function SpecRow({ label, value, last }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", padding: "12px 14px", borderBottom: last ? "none" : "1px solid #ece7de", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 12, color: "#8a7e6e", width: 110, flexShrink: 0, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 14, color: "#1a1917", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
