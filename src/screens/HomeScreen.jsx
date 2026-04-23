import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Camera, X } from "lucide-react";
import { api, expirationStatus } from "../lib/api";
import { Badge, SeatCard, SeatThumbnail, Spinner, ErrorBox } from "../components/UI";

export default function HomeScreen({ onCamera, onPickSeat, savedSeats }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  // --- Load catalog once ---
  const loadCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const { seats } = await api.catalog({ limit: 200 });
      setCatalog(seats);
    } catch (err) {
      setCatalogError(err.message || "Could not reach the server");
    } finally {
      setCatalogLoading(false);
    }
  };
  useEffect(() => { loadCatalog(); }, []);

  // --- Debounced search ---
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { seats } = await api.searchCatalog(query.trim());
        setSearchResults(seats);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const filteredCatalog = useMemo(() => {
    if (filterType === "all") return catalog;
    const lc = filterType.toLowerCase();
    return catalog.filter(s => s.type.toLowerCase().includes(lc));
  }, [catalog, filterType]);

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: "28px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4 }}>
          SeatCheck · {catalog.length || "…"} seats
        </div>
        <h1 className="serif" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1.02, margin: "8px 0 8px", letterSpacing: -1.2 }}>
          Know the seat,<br />
          <em style={{ fontStyle: "italic", color: "#6d5d47" }}>every time.</em>
        </h1>
        <p style={{ fontSize: 15, color: "#5c5247", margin: "12px 0 24px", maxWidth: 420, lineHeight: 1.5 }}>
          Type the brand, model, or the number on the label. Or snap a photo of any part of the seat.
        </p>
      </div>

      <div style={{ padding: "0 24px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "#fff", border: "1px solid #e3dcc9",
          borderRadius: 14, padding: "14px 18px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
        }}>
          <Search size={18} color="#8a7e6e" strokeWidth={2} />
          <input value={query} onChange={e => setQuery(e.target.value)}
                 placeholder="Try 'Graco Extend2Fit' or '1963179'"
                 style={{ flex: 1, border: "none", outline: "none", fontSize: 16, background: "transparent", color: "#1a1917" }} />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear">
              <X size={16} color="#8a7e6e" />
            </button>
          )}
        </div>

        <button onClick={onCamera} style={{
          marginTop: 10, width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "14px 18px", borderRadius: 14,
          background: "#1a1917", color: "#f5f1ea",
          fontSize: 15, fontWeight: 500, letterSpacing: 0.2
        }}>
          <Camera size={18} strokeWidth={2} /> Identify by photo
        </button>
      </div>

      {/* Search results */}
      {query && (
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 12 }}>
            {searching ? "Searching…" : searchResults.length === 0 ? "No matches" : `${searchResults.length} match${searchResults.length === 1 ? "" : "es"}`}
          </div>
          {searchResults.map((seat, i) => (
            <SeatCard key={seat.id} seat={seat} onClick={() => onPickSeat(seat)} delay={i * 40} />
          ))}
        </div>
      )}

      {/* Saved seats peek (local or server) */}
      {!query && savedSeats.length > 0 && (
        <div style={{ padding: "32px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e" }}>My Seats</div>
            {savedSeats.length > 2 && <div style={{ fontSize: 11, color: "#8a7e6e" }}>+{savedSeats.length - 2} more</div>}
          </div>
          {savedSeats.slice(0, 2).map(({ seat, dom, nickname }) => {
            const exp = expirationStatus(dom, seat.expirationYears);
            return (
              <button key={seat.id} onClick={() => onPickSeat(seat)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 14, marginBottom: 8, borderRadius: 12, background: "#fff", border: "1px solid #ece7de" }}>
                <SeatThumbnail seat={seat} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2 }}>{nickname || seat.model}</div>
                  <div style={{ fontSize: 12, color: "#6d5d47", marginTop: 4 }}>{exp ? exp.label : `${seat.brand} ${seat.model}`}</div>
                </div>
                {exp && <Badge tone={exp.status === "expired" ? "bad" : exp.status === "warning" ? "warn" : "good"}>{exp.status === "expired" ? "Expired" : exp.status === "warning" ? "Expiring" : "OK"}</Badge>}
              </button>
            );
          })}
        </div>
      )}

      {/* Catalog browser */}
      {!query && (
        <div style={{ padding: "32px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#8a7e6e" }}>Browse catalog</div>
            <div style={{ fontSize: 12, color: "#8a7e6e", fontVariantNumeric: "tabular-nums" }}>{filteredCatalog.length} seats</div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[{ k: "all", l: "All" }, { k: "infant", l: "Infant" }, { k: "convertible", l: "Convertible" }, { k: "all-in-one", l: "All-in-One" }, { k: "booster", l: "Booster" }].map(f => (
              <button key={f.k} onClick={() => setFilterType(f.k)} style={{
                padding: "6px 12px", borderRadius: 999,
                fontSize: 12, fontWeight: 500,
                background: filterType === f.k ? "#1a1917" : "#fff",
                color: filterType === f.k ? "#f5f1ea" : "#5c5247",
                border: `1px solid ${filterType === f.k ? "#1a1917" : "#e3dcc9"}`
              }}>{f.l}</button>
            ))}
          </div>

          {catalogLoading && <Spinner label="Loading catalog…" />}
          {catalogError && <ErrorBox message={catalogError} onRetry={loadCatalog} />}
          {!catalogLoading && !catalogError && filteredCatalog.map((seat, i) => (
            <SeatCard key={seat.id} seat={seat} onClick={() => onPickSeat(seat)} delay={Math.min(i * 20, 200)} />
          ))}
        </div>
      )}
    </div>
  );
}
