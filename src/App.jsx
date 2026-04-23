import { useState, useEffect } from "react";
import { Home, Bookmark, Settings } from "lucide-react";
import { api, auth } from "./lib/api";
import GlobalStyles from "./components/GlobalStyles";
import { Spinner } from "./components/UI";
import HomeScreen from "./screens/HomeScreen";
import CameraScreen from "./screens/CameraScreen";
import SeatProfile from "./screens/SeatProfile";
import SavedScreen from "./screens/SavedScreen";
import SettingsScreen from "./screens/SettingsScreen";
import FitCheckScreen from "./screens/FitCheckScreen";
import AuthScreen from "./screens/AuthScreen";

const LOCAL_SAVED_KEY = "seatcheck:local:savedSeats";
const LOCAL_CHILDREN_KEY = "seatcheck:local:children";
const LOCAL_SETTINGS_KEY = "seatcheck:local:settings";

const DEFAULT_SETTINGS = {
  recallAlerts: true,
  expirationWarnings: true,
  installTips: false
};

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // UI state
  const [tab, setTab] = useState("home");              // home | saved | settings
  const [overlay, setOverlay] = useState(null);        // camera | profile | fitcheck | null
  const [currentSeat, setCurrentSeat] = useState(null);
  const [fitCheckChild, setFitCheckChild] = useState(null);

  // Data
  const [savedSeats, setSavedSeats] = useState([]);
  const [children, setChildren] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // -------- Boot: try to restore session or local data --------
  useEffect(() => {
    const boot = async () => {
      const token = auth.get();
      if (token) {
        try {
          const { user } = await api.me();
          setUser(user);
          setSettings({
            recallAlerts: user.wantsRecallAlerts,
            expirationWarnings: user.wantsExpirationWarnings,
            installTips: user.wantsInstallTips
          });
          await syncFromServer();
        } catch {
          // Token invalid or server down
          auth.clear();
          loadLocal();
        }
      } else {
        loadLocal();
      }
      setBooting(false);
    };
    boot();
  }, []);

  const loadLocal = () => {
    try {
      const s = JSON.parse(localStorage.getItem(LOCAL_SAVED_KEY) || "[]");
      const c = JSON.parse(localStorage.getItem(LOCAL_CHILDREN_KEY) || "[]");
      const st = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || "null");
      setSavedSeats(s);
      setChildren(c);
      if (st) setSettings(st);
    } catch {}
  };

  const syncFromServer = async () => {
    try {
      const [savedRes, childrenRes] = await Promise.all([
        api.savedSeats(),
        api.children()
      ]);
      // Server returns { savedSeats: [{ carSeat, nickname, dateOfManufacture, ... }] }
      setSavedSeats(savedRes.savedSeats.map(s => ({
        id: s.id,
        seat: s.carSeat,
        nickname: s.nickname,
        dom: s.dateOfManufacture?.slice(0, 7)
      })));
      setChildren(childrenRes.children);
    } catch (err) {
      console.error("Server sync failed:", err);
    }
  };

  // -------- Persistence helpers (switch between server + local) --------
  useEffect(() => {
    if (!user && !booting) {
      try { localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(savedSeats)); } catch {}
    }
  }, [savedSeats, user, booting]);

  useEffect(() => {
    if (!user && !booting) {
      try { localStorage.setItem(LOCAL_CHILDREN_KEY, JSON.stringify(children)); } catch {}
    }
  }, [children, user, booting]);

  useEffect(() => {
    if (!booting) {
      try { localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
    }
  }, [settings, booting]);

  // -------- Handlers --------
  const handlePickSeat = async (seat) => {
    // If we only have a lightweight seat stub (from fit-check or saved list), fetch the full record
    let full = seat;
    if (!seat.installSteps || !seat.modes) {
      try { full = await api.seat(seat.id); } catch { /* keep stub */ }
    }
    setCurrentSeat(full);
    setOverlay("profile");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0);
  };

  const handleSaveSeat = async (seat, { nickname, dom }) => {
    // dom from <input type="month"> is "YYYY-MM"; normalize to first of month for the server
    const dateOfManufacture = dom.length === 7 ? `${dom}-01` : dom;
    if (user) {
      try {
        const { savedSeat } = await api.saveSeat({ carSeatId: seat.id, nickname, dateOfManufacture });
        setSavedSeats(prev => [
          ...prev.filter(s => s.seat.id !== seat.id),
          { id: savedSeat.id, seat: savedSeat.carSeat, nickname, dom }
        ]);
      } catch (err) {
        alert("Save failed: " + err.message);
      }
    } else {
      setSavedSeats(prev => [...prev.filter(s => s.seat.id !== seat.id), { seat, nickname, dom, id: `local-${Date.now()}` }]);
    }
  };

  const handleRemoveSeat = async (seatId) => {
    const entry = savedSeats.find(s => s.seat.id === seatId);
    if (user && entry?.id && !entry.id.startsWith("local-")) {
      try { await api.deleteSavedSeat(entry.id); } catch {}
    }
    setSavedSeats(prev => prev.filter(s => s.seat.id !== seatId));
  };

  const handleAddChild = async (data) => {
    if (user) {
      try {
        const { child } = await api.createChild(data);
        setChildren(prev => [...prev, child]);
      } catch (err) {
        alert("Add child failed: " + err.message);
      }
    } else {
      setChildren(prev => [...prev, { id: `local-${Date.now()}`, ...data }]);
    }
  };

  const handleRemoveChild = async (id) => {
    if (user && !id.startsWith("local-")) {
      try { await api.deleteChild(id); } catch {}
    }
    setChildren(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleSetting = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    if (user) {
      const serverKey = { recallAlerts: "wantsRecallAlerts", expirationWarnings: "wantsExpirationWarnings", installTips: "wantsInstallTips" }[key];
      try { await api.updateMe({ [serverKey]: next[key] }); } catch {}
    }
  };

  const handleSignedIn = async (signedInUser) => {
    setShowAuth(false);
    if (signedInUser) {
      setUser(signedInUser);
      setSettings({
        recallAlerts: signedInUser.wantsRecallAlerts ?? true,
        expirationWarnings: signedInUser.wantsExpirationWarnings ?? true,
        installTips: signedInUser.wantsInstallTips ?? false
      });
      // Merge any local data into the server before replacing state
      await mergeLocalIntoServer();
      await syncFromServer();
    }
  };

  const mergeLocalIntoServer = async () => {
    // Push local-only children
    const localChildren = children.filter(c => c.id.startsWith("local-"));
    for (const c of localChildren) {
      try { await api.createChild({ name: c.name, dob: c.dob, weightLb: c.weightLb, heightIn: c.heightIn }); } catch {}
    }
    // Push local-only saved seats
    const localSeats = savedSeats.filter(s => !s.id || s.id.startsWith("local-"));
    for (const s of localSeats) {
      if (s.dom) {
        try {
          const dateOfManufacture = s.dom.length === 7 ? `${s.dom}-01` : s.dom;
          await api.saveSeat({ carSeatId: s.seat.id, nickname: s.nickname, dateOfManufacture });
        } catch {}
      }
    }
    // Clear local after successful migration
    try { localStorage.removeItem(LOCAL_SAVED_KEY); } catch {}
    try { localStorage.removeItem(LOCAL_CHILDREN_KEY); } catch {}
  };

  const handleSignOut = () => {
    auth.clear();
    setUser(null);
    setSavedSeats([]);
    setChildren([]);
    setSettings(DEFAULT_SETTINGS);
  };

  const switchTab = (t) => { setOverlay(null); setTab(t); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 10); };
  const savedForCurrent = savedSeats.find(s => s.seat.id === currentSeat?.id);

  // -------- Renders --------
  if (booting) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f1ea" }}>
        <GlobalStyles />
        <Spinner label="Waking up…" />
      </div>
    );
  }

  if (showAuth) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", background: "#f5f1ea", position: "relative" }}>
      <GlobalStyles />

      {/* TABS */}
      {!overlay && tab === "home" && (
        <HomeScreen onCamera={() => setOverlay("camera")} onPickSeat={handlePickSeat} savedSeats={savedSeats} />
      )}
      {!overlay && tab === "saved" && (
        <SavedScreen
          savedSeats={savedSeats}
          children={children}
          onPickSeat={handlePickSeat}
          onRemoveSeat={handleRemoveSeat}
          onAddChild={handleAddChild}
          onRemoveChild={handleRemoveChild}
          onFitCheck={(child) => { setFitCheckChild(child); setOverlay("fitcheck"); }}
          isAuthed={!!user}
        />
      )}
      {!overlay && tab === "settings" && (
        <SettingsScreen
          user={user}
          settings={settings}
          onToggle={handleToggleSetting}
          savedCount={savedSeats.length}
          childrenCount={children.length}
          onSignIn={() => setShowAuth(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* OVERLAYS */}
      {overlay === "camera" && (
        <CameraScreen onBack={() => setOverlay(null)} onIdentified={handlePickSeat} />
      )}
      {overlay === "profile" && currentSeat && (
        <SeatProfile
          seat={currentSeat}
          onSave={handleSaveSeat}
          isSaved={!!savedForCurrent}
          savedData={savedForCurrent}
        />
      )}
      {overlay === "fitcheck" && fitCheckChild && (
        <FitCheckScreen
          child={fitCheckChild}
          onBack={() => setOverlay(null)}
          onPickSeat={handlePickSeat}
        />
      )}

      {/* BOTTOM NAV */}
      {overlay !== "camera" && overlay !== "fitcheck" && (
        <BottomNav
          currentTab={overlay === "profile" ? null : tab}
          onTab={switchTab}
          onBack={overlay === "profile" ? () => setOverlay(null) : null}
          savedCount={savedSeats.length}
        />
      )}
    </div>
  );
}

function BottomNav({ currentTab, onTab, onBack, savedCount }) {
  // Profile overlay — show Back as primary
  if (onBack) {
    return (
      <div style={navBarStyle}>
        <button onClick={onBack} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: 14, borderRadius: 12, background: "#1a1917", color: "#f5f1ea",
          fontSize: 15, fontWeight: 500
        }}>
          ← Back
        </button>
        <button onClick={() => onTab("home")} aria-label="Home" style={{
          padding: 14, borderRadius: 12, background: "#fff", border: "1px solid #e3dcc9",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Home size={20} color="#5c5247" />
        </button>
      </div>
    );
  }

  const tabs = [
    { key: "home", icon: Home, label: "Home" },
    { key: "saved", icon: Bookmark, label: "My Seats", badge: savedCount },
    { key: "settings", icon: Settings, label: "Settings" }
  ];

  return (
    <div style={navBarStyle}>
      {tabs.map(t => {
        const Icon = t.icon;
        const active = currentTab === t.key;
        return (
          <button key={t.key} onClick={() => onTab(t.key)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            padding: "10px 4px", borderRadius: 10,
            color: active ? "#1a1917" : "#8a7e6e",
            fontSize: 11, fontWeight: 500, position: "relative"
          }}>
            <div style={{ position: "relative" }}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {t.badge > 0 && (
                <span style={{ position: "absolute", top: -4, right: -8, background: "#7a2a22", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 999, lineHeight: 1.3, minWidth: 16, textAlign: "center" }}>
                  {t.badge}
                </span>
              )}
            </div>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const navBarStyle = {
  position: "fixed", bottom: 0, left: 0, right: 0,
  maxWidth: 480, margin: "0 auto",
  background: "rgba(245, 241, 234, 0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderTop: "1px solid #e3dcc9",
  padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
  display: "flex", alignItems: "stretch", gap: 8,
  zIndex: 50
};
