// Centralized API client.
// -------------------------------------------------------
// Base URL comes from Vite env var VITE_API_URL, with a
// fallback to the live Railway backend so the app works
// out-of-the-box even without a local .env.
// -------------------------------------------------------

const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "https://seatcheck-api-production.up.railway.app";

const TOKEN_KEY = "seatcheck:token";

// -------- Token handling --------
export const auth = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  }
};

// -------- Core fetch wrapper --------
async function req(path, { method = "GET", body, authenticated = true, headers = {} } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (authenticated) {
    const t = auth.get();
    if (t) h.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  // 204 No Content
  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ============================================================
// API surface
// ============================================================

export const api = {
  baseUrl: BASE,

  // --- Auth ---
  signup: (email, password, name) =>
    req("/api/auth/signup", { method: "POST", body: { email, password, name }, authenticated: false }),

  login: (email, password) =>
    req("/api/auth/login", { method: "POST", body: { email, password }, authenticated: false }),

  me: () => req("/api/auth/me"),

  updateMe: (patch) => req("/api/auth/me", { method: "PATCH", body: patch }),

  // --- Catalog ---
  catalog: ({ type, brand, q, limit, offset } = {}) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (brand) params.set("brand", brand);
    if (q) params.set("q", q);
    if (limit != null) params.set("limit", limit);
    if (offset != null) params.set("offset", offset);
    const qs = params.toString();
    return req(`/api/catalog${qs ? "?" + qs : ""}`, { authenticated: false });
  },

  searchCatalog: (q) =>
    req(`/api/catalog/search?q=${encodeURIComponent(q)}`, { authenticated: false }),

  seat: (id) => req(`/api/catalog/${id}`, { authenticated: false }),

  // --- Children ---
  children: () => req("/api/children"),
  createChild: (data) => req("/api/children", { method: "POST", body: data }),
  updateChild: (id, data) => req(`/api/children/${id}`, { method: "PATCH", body: data }),
  deleteChild: (id) => req(`/api/children/${id}`, { method: "DELETE" }),

  // --- Saved seats ---
  savedSeats: () => req("/api/saved-seats"),
  saveSeat: (data) => req("/api/saved-seats", { method: "POST", body: data }),
  deleteSavedSeat: (id) => req(`/api/saved-seats/${id}`, { method: "DELETE" }),

  // --- Recalls ---
  recalls: (limit = 30) => req(`/api/recalls?limit=${limit}`, { authenticated: false }),
  recallsForSeat: (seatId) => req(`/api/recalls/for-seat/${seatId}`, { authenticated: false }),

  // --- Fit-check ---
  fitCheck: ({ weightLb, heightIn, ageMonths }) =>
    req("/api/fit-check", { method: "POST", body: { weightLb, heightIn, ageMonths }, authenticated: false }),

  fitCheckChild: (childId) => req(`/api/fit-check/child/${childId}`),

  // --- Identify ---
  identify: ({ ocrText, imageBase64 } = {}) =>
    req("/api/identify", { method: "POST", body: { ocrText, imageBase64 }, authenticated: false }),

  // --- Install check (Claude Vision) ---
  checkInstall: ({ mode, imageBase64, mediaType, seatId, childWeightLb, childHeightIn, childAgeMonths }) =>
    req("/api/check-install", {
      method: "POST",
      authenticated: false,
      body: { mode, imageBase64, mediaType, seatId, childWeightLb, childHeightIn, childAgeMonths }
    })
};

// Helper — expiration status computed client-side for seats without server enrichment
export function expirationStatus(dom, expirationYears) {
  if (!dom) return null;
  const manufactured = new Date(dom);
  const expires = new Date(manufactured);
  expires.setFullYear(expires.getFullYear() + expirationYears);
  const now = new Date();
  const monthsLeft = (expires - now) / (1000 * 60 * 60 * 24 * 30.44);
  const expiredStr = expires.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (monthsLeft < 0) return { status: "expired", label: `Expired ${expiredStr}` };
  if (monthsLeft < 12) return { status: "warning", label: `Expires ${expiredStr}` };
  return { status: "ok", label: `Expires ${expiredStr}` };
}
