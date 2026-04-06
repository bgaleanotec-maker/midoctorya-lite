/* ── API Client — MiDoctorYa Lite ───────────────────────────────────── */
const API_BASE = 'http://localhost:5000/api/v1';

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
    // Guardar en localStorage para uso offline
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); } catch (_) { /* quota */ }
    return data;
  } catch (_err) {
    // Error de red — intentar recuperar del cache de localStorage
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

async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const r = await fetch(url);
    return await r.json();
  } catch {
    return { success: false, error: 'Connection error' };
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

// ── Fitness ────────────────────────────────────────────────────────────
async function getBodyParts() {
  const c = cacheGet('bodyparts', 86400000);
  if (c) return c;
  const r = await apiGet('/fitness/external/bodyparts');
  const d = r.success ? r.data : [];
  if (d.length) cacheSet('bodyparts', d);
  return d;
}

async function searchExercises(q, limit = 10) {
  const k = `search:${q}:${limit}`;
  const c = cacheGet(k);
  if (c) return c;
  const r = await apiGet('/fitness/external/search', { q, limit });
  const d = r.success ? r.data : [];
  if (d.length) cacheSet(k, d);
  return d;
}

async function getExercisesByBodyPart(bp, limit = 10) {
  const k = `bp:${bp}:${limit}`;
  const c = cacheGet(k);
  if (c) return c;
  const r = await apiGet(`/fitness/external/bodypart/${bp}`, { limit });
  const d = r.success ? r.data : [];
  if (d.length) cacheSet(k, d);
  return d;
}

async function getExerciseDetail(id) {
  const r = await apiGet(`/fitness/external/exercise/${id}`);
  return r.success ? r.data : null;
}

async function getRecommendations(gender = 'male', limit = 12) {
  const k = `rec:${gender}:${limit}`;
  const c = cacheGet(k);
  if (c) return c;
  const r = await apiGet('/fitness/external/recommend', { gender, limit });
  const d = r.success ? r.data : {};
  if (Object.keys(d).length) cacheSet(k, d);
  return d;
}

async function getSimilarByTarget(target, limit = 6) {
  const r = await apiGet(`/fitness/external/target/${target}`, { limit });
  return r.success ? r.data : [];
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
