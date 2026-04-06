/* ── Home Dashboard — MiDoctorYa Lite ────────────────────────────────── */
/* Neuro-UX: Emotional hook first (greeting + progress), then direction
   (today's plan), then quick actions. 3-second rule applies.           */
import { showToast, getPatientProfile } from './app.js';
import { getConnectionStatus } from './wearables.js';

/* ── Progress Ring SVG Generator ─────────────────────────────────────── */
function _ring(pct, color, size = 80, strokeW = 7) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="transform -rotate-90">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="currentColor" stroke-width="${strokeW}" class="text-gray-100"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeW}"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
      class="transition-all duration-1000 ease-out"/>
  </svg>`;
}

/* ── Get Today's Stats from localStorage ─────────────────────────────── */
function _getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const key = 'dya_daily_' + today;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  return {
    workouts: stored.workouts || 0,
    calories: stored.calories || 0,
    water: stored.water || 0,
    steps: stored.steps || 0,
    streak: parseInt(localStorage.getItem('dya_streak') || '0'),
    mood: stored.mood || null,
  };
}

/* ── Get Streak ──────────────────────────────────────────────────────── */
function _getStreak() {
  const streak = parseInt(localStorage.getItem('dya_streak') || '0');
  return streak;
}

/* ── Quick Actions ───────────────────────────────────────────────────── */
function _quickActions() {
  return [
    { id: 'fitness',      icon: '💪', label: 'Entrenar',   color: 'from-indigo-500 to-blue-600' },
    { id: 'nutrition',    icon: '🥗', label: 'Nutricion',  color: 'from-emerald-500 to-green-600' },
    { id: 'appointments', icon: '📅', label: 'Citas',      color: 'from-amber-500 to-orange-600' },
    { id: 'habits',       icon: '🎯', label: 'Metas',      color: 'from-violet-500 to-purple-600' },
  ];
}

/* ── Render Home Dashboard ───────────────────────────────────────────── */
export async function renderHome(container) {
  const user = getPatientProfile();
  const name = (user.name || 'Atleta').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const stats = _getTodayStats();
  const streak = _getStreak();

  // Progress percentages (goals: 1 workout, 2000 cal, 8 glasses water)
  const workoutPct = Math.min(100, (stats.workouts / 1) * 100);
  const calPct = Math.min(100, (stats.calories / 2000) * 100);
  const waterPct = Math.min(100, (stats.water / 8) * 100);

  // Device connection status
  let deviceHtml = '';
  try {
    const conn = getConnectionStatus();
    if (conn.connected) {
      deviceHtml = `<div class="flex items-center gap-1.5 text-xs text-emerald-400"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>${conn.deviceName || 'Dispositivo'}</div>`;
    }
  } catch(_) {}

  // Upcoming appointments
  const appts = JSON.parse(localStorage.getItem('dya_appointments') || '[]');
  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = appts.filter(a => a.date >= todayStr && a.status !== 'cancelled').slice(0, 2);

  const actions = _quickActions();

  container.innerHTML = `
    <!-- Hero Section -->
    <div class="relative overflow-hidden" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 40%,#312e81 100%)">
      <div class="absolute top-[-60px] right-[-40px] w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-30px] left-[-20px] w-40 h-40 bg-violet-500/10 rounded-full blur-2xl"></div>

      <div class="px-5 pt-10 pb-2 relative z-10">
        <!-- Top bar -->
        <div class="flex items-center justify-between mb-5">
          <div>
            <p class="text-xs text-white/40 tracking-wider">${greeting}</p>
            <h1 class="text-2xl font-extrabold text-white tracking-tight">${name} <span class="text-xl">👋</span></h1>
            ${deviceHtml}
          </div>
          <button id="home-profile-btn" class="w-11 h-11 rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            ${name[0].toUpperCase()}
          </button>
        </div>

        <!-- Streak Banner -->
        ${streak > 0 ? `
        <div class="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5 mb-4">
          <span class="text-2xl">🔥</span>
          <div>
            <p class="text-sm font-bold text-amber-300">${streak} dias de racha</p>
            <p class="text-[10px] text-amber-200/60">Sigue asi, tu cuerpo te lo agradece</p>
          </div>
        </div>` : `
        <div class="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 mb-4">
          <span class="text-2xl">🚀</span>
          <div>
            <p class="text-sm font-bold text-white/80">Comienza tu racha hoy</p>
            <p class="text-[10px] text-white/40">Completa tu primer entrenamiento</p>
          </div>
        </div>`}

        <!-- Progress Rings -->
        <div class="flex justify-center gap-6 py-4">
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center">
              ${_ring(workoutPct, '#6366F1', 72, 6)}
              <span class="absolute text-lg font-black text-white">${stats.workouts}</span>
            </div>
            <p class="text-[10px] text-white/50 mt-1.5 font-semibold">Ejercicio</p>
          </div>
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center">
              ${_ring(calPct, '#10B981', 72, 6)}
              <span class="absolute text-sm font-black text-white">${stats.calories}</span>
            </div>
            <p class="text-[10px] text-white/50 mt-1.5 font-semibold">Calorias</p>
          </div>
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center">
              ${_ring(waterPct, '#06B6D4', 72, 6)}
              <span class="absolute text-lg font-black text-white">${stats.water}</span>
            </div>
            <p class="text-[10px] text-white/50 mt-1.5 font-semibold">Agua</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <div class="px-4 -mt-4 relative z-20">
      <div class="grid grid-cols-4 gap-2.5">
        ${actions.map(a => `
          <button data-nav="${a.id}" class="home-quick-btn bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-center active:scale-95 transition-all">
            <div class="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl shadow-sm mb-1.5">${a.icon}</div>
            <p class="text-[11px] font-bold text-gray-700">${a.label}</p>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Today's Plan Card -->
    <div class="px-4 mt-5">
      <div class="flex items-center justify-between mb-2.5">
        <h2 class="text-base font-extrabold text-gray-800">Tu plan de hoy</h2>
        <span class="text-[10px] text-gray-400 font-medium">${new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      </div>

      <button data-nav="fitness" class="home-quick-btn w-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl p-4 text-left shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-transform">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">⚡</div>
          <div class="flex-1">
            <p class="text-sm font-bold text-white">Entrenamiento del dia</p>
            <p class="text-xs text-white/70 mt-0.5">Pecho y triceps - 45 min</p>
          </div>
          <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </div>
      </button>
    </div>

    <!-- Metric Cards Row -->
    <div class="px-4 mt-5">
      <h2 class="text-base font-extrabold text-gray-800 mb-2.5">Resumen</h2>
      <div class="grid grid-cols-2 gap-2.5">
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-sm">❤️</div>
            <span class="text-xs text-gray-400 font-semibold">Frecuencia</span>
          </div>
          <p class="text-2xl font-black text-gray-800" id="home-hr">--</p>
          <p class="text-[10px] text-gray-400">bpm</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">👣</div>
            <span class="text-xs text-gray-400 font-semibold">Pasos</span>
          </div>
          <p class="text-2xl font-black text-gray-800">${stats.steps.toLocaleString()}</p>
          <p class="text-[10px] text-gray-400">de 10,000</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm">😊</div>
            <span class="text-xs text-gray-400 font-semibold">Bienestar</span>
          </div>
          <p class="text-2xl font-black text-gray-800">${stats.mood ? stats.mood : '--'}</p>
          <p class="text-[10px] text-gray-400"><button data-nav="stress" class="home-quick-btn text-indigo-500 font-bold">Registrar</button></p>
        </div>
        <button data-nav="wearables" class="home-quick-btn bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left active:scale-95 transition-all">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">⌚</div>
            <span class="text-xs text-gray-400 font-semibold">Dispositivo</span>
          </div>
          <p class="text-sm font-bold text-gray-800">${deviceHtml ? 'Conectado' : 'Conectar'}</p>
          <p class="text-[10px] text-gray-400">${deviceHtml ? 'Activo' : 'Banda o reloj'}</p>
        </button>
      </div>
    </div>

    <!-- Upcoming Appointments -->
    ${upcoming.length > 0 ? `
    <div class="px-4 mt-5">
      <div class="flex items-center justify-between mb-2.5">
        <h2 class="text-base font-extrabold text-gray-800">Proximas citas</h2>
        <button data-nav="appointments" class="home-quick-btn text-xs text-indigo-500 font-bold">Ver todas</button>
      </div>
      ${upcoming.map(a => `
        <div class="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 mb-2 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg">📅</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-800 truncate">${a.doctorName || a.specialty || 'Cita'}</p>
            <p class="text-xs text-gray-400">${a.date} - ${a.time || ''}</p>
          </div>
        </div>
      `).join('')}
    </div>` : `
    <div class="px-4 mt-5">
      <div class="flex items-center justify-between mb-2.5">
        <h2 class="text-base font-extrabold text-gray-800">Citas</h2>
      </div>
      <button data-nav="appointments" class="home-quick-btn w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left flex items-center gap-3 active:scale-[0.98] transition-transform">
        <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg">📅</div>
        <div class="flex-1">
          <p class="text-sm font-bold text-gray-700">Agendar una cita</p>
          <p class="text-xs text-gray-400">Fitness, bienestar y mas</p>
        </div>
        <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>`}

    <!-- More Section Links -->
    <div class="px-4 mt-5 mb-6">
      <div class="grid grid-cols-3 gap-2.5">
        <button data-nav="stress" class="home-quick-btn bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center active:scale-95 transition-all">
          <div class="text-xl mb-1">🧘</div>
          <p class="text-[10px] font-bold text-gray-600">Bienestar</p>
        </button>
        <button data-nav="reminders" class="home-quick-btn bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center active:scale-95 transition-all">
          <div class="text-xl mb-1">🔔</div>
          <p class="text-[10px] font-bold text-gray-600">Recordatorios</p>
        </button>
        <button data-nav="settings" class="home-quick-btn bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center active:scale-95 transition-all">
          <div class="text-xl mb-1">⚙️</div>
          <p class="text-[10px] font-bold text-gray-600">Ajustes</p>
        </button>
      </div>
    </div>

    <!-- Footer spacing -->
    <div class="h-4"></div>
  `;

  // Water quick-add
  const waterRing = container.querySelector('.text-\\[\\#06B6D4\\]');

  // Navigation handlers for all quick buttons
  container.querySelectorAll('.home-quick-btn[data-nav]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const tab = btn.dataset.nav;
      if (tab && window._dyaNav) window._dyaNav.navigateTo(tab);
    };
  });

  // Profile button -> settings
  const profileBtn = container.querySelector('#home-profile-btn');
  if (profileBtn) {
    profileBtn.onclick = () => { if (window._dyaNav) window._dyaNav.navigateTo('settings'); };
  }

  // Update heart rate from wearable if available
  _updateLiveHR(container);
}

function _updateLiveHR(container) {
  try {
    const conn = getConnectionStatus();
    const hrEl = container.querySelector('#home-hr');
    if (hrEl && conn.connected && conn.heartRate) {
      hrEl.textContent = conn.heartRate;
    }
  } catch(_) {}
  // Refresh every 5 seconds
  setTimeout(() => {
    if (container.isConnected) _updateLiveHR(container);
  }, 5000);
}
