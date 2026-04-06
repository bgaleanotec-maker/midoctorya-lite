/* ── API Client — MiDoctorYa Lite ───────────────────────────────────── */
/* Use relative URLs so it works in both dev and production */
const API_BASE = '/api';

const _cache = new Map();
function cacheGet(key, ttl = 1800000) {
  const e = _cache.get(key);
  if (e && Date.now() - e.ts < ttl) return e.data;
  return null;
}
function cacheSet(key, data) { _cache.set(key, { ts: Date.now(), data }); }

/* ── safeFetch — offline fallback con localStorage ─────────────────── */
async function safeFetch(endpoint, options = {}) {
  const cacheKey = `dya_cache_${endpoint}`;
  try {
    const r = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await r.json();
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); } catch (_) { /* quota */ }
    return data;
  } catch (_err) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.data;
      }
    } catch (_) { /* parse error */ }
    return { success: false, error: 'Sin conexion. No hay datos en cache.' };
  }
}

async function apiGet(url, params = {}) {
  const u = new URL(url, window.location.origin);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  try {
    const r = await fetch(u);
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

async function apiPost(endpoint, body = {}) {
  try {
    const r = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch {
    return { success: false, error: 'Connection error' };
  }
}

// ── Fitness — uses our own server proxy to ExerciseDB ──────────────────
async function getBodyParts() {
  const c = cacheGet('bodyparts', 86400000);
  if (c) return c;
  const d = await apiGet('/api/exercises/bodypartlist');
  if (Array.isArray(d) && d.length) cacheSet('bodyparts', d);
  return Array.isArray(d) ? d : [];
}

async function searchExercises(q, limit = 15) {
  const k = `search:${q}:${limit}`;
  const c = cacheGet(k);
  if (c) return c;
  const d = await apiGet('/api/exercises/search', { q, limit });
  if (Array.isArray(d) && d.length) cacheSet(k, d);
  return Array.isArray(d) ? d : [];
}

async function getExercisesByBodyPart(bp, limit = 15) {
  const k = `bp:${bp}:${limit}`;
  const c = cacheGet(k);
  if (c) return c;
  const d = await apiGet(`/api/exercises/bodypart/${encodeURIComponent(bp)}`, { limit });
  if (Array.isArray(d) && d.length) cacheSet(k, d);
  return Array.isArray(d) ? d : [];
}

async function getExerciseDetail(id) {
  return null; // detail fetched from exercise list data
}

async function getRecommendations(gender = 'male', limit = 12) {
  // No separate recommendations endpoint — return empty to trigger bodypart fallback
  return {};
}

async function getSimilarByTarget(target, limit = 6) {
  // Use search with target name
  const d = await apiGet('/api/exercises/search', { q: target, limit });
  return Array.isArray(d) ? d : [];
}

// ── Stress ─────────────────────────────────────────────────────────────
async function logMood(mood, notes = '') {
  return apiPost('/stress/mood', { mood, notes });
}
async function logBreathing(duration, technique = '4-7-8') {
  return apiPost('/stress/breathing', { duration_seconds: duration, technique });
}
async function getStressDashboard() {
  return apiGet('/stress/dashboard');
}

// ── Appointments ───────────────────────────────────────────────────────
async function getDoctors() {
  const r = await apiGet('/appointments/doctors');
  return r.success ? r.data : [];
}
async function getDoctorSlots(doctorId, date) {
  const r = await apiGet(`/appointments/doctors/${doctorId}/slots`, { date });
  return r.success ? r.data : [];
}
async function bookAppointment(doctorId, date, time, reason = '') {
  return apiPost('/appointments/book', { doctor_id: doctorId, date, time, reason });
}
async function getMyAppointments() {
  const r = await apiGet('/appointments/my');
  return r.success ? r.data : [];
}
async function cancelAppointment(id) {
  try {
    const r = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    });
    return await r.json();
  } catch {
    return { success: false };
  }
}

// ── Nutrition (Gemini) ─────────────────────────────────────────────────
async function analyzeFood(description) {
  return apiPost('/nutrition/analyze', { description });
}

export {
  API_BASE as API_BASE_URL,
  safeFetch,
  getBodyParts, searchExercises, getExercisesByBodyPart, getExerciseDetail,
  getRecommendations, getSimilarByTarget,
  logMood, logBreathing, getStressDashboard,
  getDoctors, getDoctorSlots, bookAppointment, getMyAppointments, cancelAppointment,
  analyzeFood,
};
