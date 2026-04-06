/* ── App Shell — MiDoctorYa Lite PWA ────────────────────────────────── */
import { t, getLang, setLang, getCountry, setCountry, hasAppointments } from './i18n.js';
import { renderFitness } from './fitness.js';
import { renderNutrition } from './nutrition.js';
import { renderStress } from './stress.js';
import { renderAppointments } from './appointments.js';
import { renderHabits } from './habits.js';
import { trackUserActivity } from './admin.js';
import { renderReminders } from './reminders.js';
import { checkSubscriptionStatus, initSubscription, renderBlockScreen, processReminders as processSubReminders, cleanupExpiredAccounts, renderSubscriptionInfo, getSubscription, generatePaymentLink, redeemPromoCode, activateSubscription } from './subscription.js';
import { renderWearables, getConnectionStatus, startBreathingCoach } from './wearables.js';

let _currentTab = 'habits';
let _moreSheetOpen = false;

// ── Patient Profile Helpers ──────────────────────────────────────────
export function getPatientProfile() {
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  const profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + user.email) || '{}');
  return { ...user, ...profile };
}

export function savePatientProfile(data) {
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  localStorage.setItem('dya_patient_profile_' + user.email, JSON.stringify(data));
}

// ── Toast ──────────────────────────────────────────────────────────────
export function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
  el.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    el.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
    el.classList.remove('opacity-100', 'translate-y-0');
  }, duration);
}

// ── Navigation Tabs (5 primary: Metas, Fitness, Nutricion, Estres, Mas) ──
const PRIMARY_TABS = [
  { id: 'habits',    label: () => 'Metas' },
  { id: 'fitness',   label: () => t('tab_fitness') },
  { id: 'nutrition', label: () => t('tab_nutrition') },
  { id: 'stress',    label: () => t('tab_stress') },
  { id: 'more',      label: () => 'Mas...' },
];

// Icons — outline (inactive) and filled (active) variants
const ICONS = {
  habits: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    filled:  `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd"/></svg>`,
  },
  fitness: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
    filled:  `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clip-rule="evenodd"/></svg>`,
  },
  nutrition: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>`,
    filled:  `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/></svg>`,
  },
  stress: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
    filled:  `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/></svg>`,
  },
  more: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>`,
    filled:  `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>`,
  },
  // Icons for the "More" sheet items
  appointments: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  },
  reminders: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`,
  },
  settings: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  wearables: {
    outline: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2"/></svg>`,
  },
};

const CHEVRON_RIGHT = `<svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;

// ── Build bottom nav (5 tabs) ─────────────────────────────────────────
function buildNav() {
  const nav = document.querySelector('#bottom-nav > div');
  const isMoreActive = ['appointments', 'reminders', 'settings', 'wearables'].includes(_currentTab);

  nav.innerHTML = PRIMARY_TABS.map(tab => {
    const isActive = tab.id === 'more'
      ? isMoreActive
      : tab.id === _currentTab;
    const iconSet = ICONS[tab.id];
    const icon = isActive ? iconSet.filled : iconSet.outline;

    return `
      <div class="nav-tab-item ${isActive ? 'nav-tab-active' : 'nav-tab-inactive'}" data-tab="${tab.id}">
        <div class="nav-tab-icon">${icon}</div>
        <span class="nav-tab-label">${tab.label()}</span>
        ${isActive ? '<div class="nav-tab-dot"></div>' : ''}
      </div>
    `;
  }).join('');

  nav.querySelectorAll('.nav-tab-item').forEach(item => {
    item.onclick = () => {
      if (item.dataset.tab === 'more') {
        openMoreSheet();
      } else {
        closeMoreSheet();
        navigateTo(item.dataset.tab);
      }
    };
  });
}

// ── More Sheet (slide-up bottom sheet) ────────────────────────────────
function _getSubStatusBadge() {
  var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  var sub = getSubscription(user.email);
  if (!sub) return '';
  var colors = { active: '#10B981', trial: '#3B82F6', grace: '#F59E0B', expired: '#EF4444', blocked: '#EF4444' };
  var labels = { active: 'Activa', trial: 'Prueba', grace: 'Gracia', expired: 'Vencida', blocked: 'Bloqueada' };
  var c = colors[sub.status] || '#9CA3AF';
  var l = labels[sub.status] || '';
  if (!l) return '';
  return ' <span style="font-size:9px;background:' + c + '20;color:' + c + ';padding:1px 6px;border-radius:8px;font-weight:700;">' + l + '</span>';
}

function _getWearableStatusDot() {
  try {
    var status = getConnectionStatus();
    if (status.connected) return ' <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10B981;margin-left:4px;vertical-align:middle;"></span>';
  } catch(_e) { /* ignore */ }
  return '';
}

function getMoreItems() {
  const items = [];
  if (hasAppointments()) {
    items.push({ id: 'appointments', icon: ICONS.appointments.outline, label: t('tab_appointments') || 'Citas Medicas' });
  }
  items.push({ id: 'wearables', icon: ICONS.wearables.outline, label: 'Dispositivos' + _getWearableStatusDot() });
  items.push({ id: 'reminders', icon: ICONS.reminders.outline, label: 'Recordatorios' });
  items.push({ id: 'settings',  icon: ICONS.settings.outline,  label: (t('set_title') || 'Configuracion') + _getSubStatusBadge() });
  return items;
}

function openMoreSheet() {
  if (_moreSheetOpen) { closeMoreSheet(); return; }
  _moreSheetOpen = true;

  // Remove any existing sheet
  const existing = document.getElementById('more-sheet-overlay');
  if (existing) existing.remove();

  const items = getMoreItems();

  const overlay = document.createElement('div');
  overlay.id = 'more-sheet-overlay';
  overlay.innerHTML = `
    <div class="more-sheet-backdrop"></div>
    <div class="more-sheet-container">
      <div class="more-sheet-panel">
        <div class="more-sheet-handle"></div>
        <div class="more-sheet-list">
          ${items.map(item => `
            <button class="more-sheet-row" data-tab="${item.id}">
              <div class="more-sheet-row-icon">${item.icon}</div>
              <span class="more-sheet-row-label">${item.label}</span>
              <div class="more-sheet-row-chevron">${CHEVRON_RIGHT}</div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.querySelector('.more-sheet-backdrop').classList.add('more-sheet-backdrop-visible');
      overlay.querySelector('.more-sheet-panel').classList.add('more-sheet-panel-visible');
    });
  });

  // Close on backdrop tap
  overlay.querySelector('.more-sheet-backdrop').onclick = () => closeMoreSheet();

  // Close on swipe down
  let startY = 0;
  const panel = overlay.querySelector('.more-sheet-panel');
  panel.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 60) closeMoreSheet();
  }, { passive: true });

  // Row clicks
  overlay.querySelectorAll('.more-sheet-row').forEach(row => {
    row.onclick = () => {
      closeMoreSheet();
      navigateTo(row.dataset.tab);
    };
  });
}

function closeMoreSheet() {
  _moreSheetOpen = false;
  const overlay = document.getElementById('more-sheet-overlay');
  if (!overlay) return;

  const backdrop = overlay.querySelector('.more-sheet-backdrop');
  const panel = overlay.querySelector('.more-sheet-panel');
  if (backdrop) backdrop.classList.remove('more-sheet-backdrop-visible');
  if (panel) panel.classList.remove('more-sheet-panel-visible');

  setTimeout(() => { overlay.remove(); }, 300);
}

// ── Navigation ────────────────────────────────────────────────────────
async function navigateTo(tab) {
  _currentTab = tab;
  buildNav();
  const main = document.getElementById('main-content');
  main.scrollTop = 0;
  main.innerHTML = `<div class="flex items-center justify-center py-20"><div class="flex gap-1"><div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay:0ms"></div><div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay:150ms"></div><div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay:300ms"></div></div></div>`;

  switch (tab) {
    case 'habits':       await renderHabits(main); break;
    case 'fitness':      await renderFitness(main); break;
    case 'nutrition':    renderNutrition(main); break;
    case 'stress':       renderStress(main); break;
    case 'appointments': await renderAppointments(main); break;
    case 'reminders':    renderReminders(main); break;
    case 'settings':     renderSettings(main); break;
    case 'wearables':    renderWearables(main); break;
  }
}

// Expose navigation for cross-module use (habits.js, tracker.js, etc.)
window._dyaNav = { navigateTo };

// ── Auth Screen ────────────────────────────────────────────────────────
function renderAuth() {
  const authScreen = document.getElementById('auth-screen');
  authScreen.classList.remove('hidden');
  authScreen.innerHTML = `
    <div class="gradient-landing min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto">
      <!-- Decorative circles -->
      <div class="absolute top-[-20%] right-[-15%] w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-[30%] left-[-5%] w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <!-- Content -->
      <div class="flex-1 flex flex-col justify-start px-6 py-8 relative z-10">
        <!-- Top: Logo + Tagline -->
        <div class="pt-8 text-center animate-fade-in">
          <div class="w-20 h-20 mx-auto mb-5 rounded-2xl gradient-primary shadow-2xl shadow-primary/30 flex items-center justify-center animate-float">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </div>
          <h1 class="text-4xl font-black text-white tracking-tight">MiDoctor<span class="text-gradient">Ya</span></h1>
          <p class="text-white/40 text-sm mt-2 max-w-[240px] mx-auto">Tu plataforma integral de bienestar y salud</p>
        </div>

        <!-- Middle: Features -->
        <div class="my-5 grid grid-cols-4 gap-2 animate-slide-up" style="animation-delay:200ms">
          <div class="glass rounded-xl p-2.5 text-center">
            <div class="text-lg mb-1">✅</div>
            <p class="text-white text-[10px] font-semibold">Habitos</p>
          </div>
          <div class="glass rounded-xl p-2.5 text-center">
            <div class="text-lg mb-1">💪</div>
            <p class="text-white text-[10px] font-semibold">Fitness</p>
          </div>
          <div class="glass rounded-xl p-2.5 text-center">
            <div class="text-lg mb-1">🥗</div>
            <p class="text-white text-[10px] font-semibold">Nutricion</p>
          </div>
          <div class="glass rounded-xl p-2.5 text-center">
            <div class="text-lg mb-1">🧘</div>
            <p class="text-white text-[10px] font-semibold">Bienestar</p>
          </div>
        </div>

        <!-- Bottom: Auth Form -->
        <div id="auth-form" class="animate-slide-up" style="animation-delay:400ms">
          <div id="auth-login-form">
            <input type="email" id="auth-email" class="auth-input mb-3" placeholder="correo@ejemplo.com" autocomplete="email">
            <input type="password" id="auth-pass" class="auth-input mb-4" placeholder="Contrasena" autocomplete="current-password">
            <button id="auth-login-btn" class="w-full py-4 rounded-2xl gradient-primary text-white font-bold text-sm shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform">
              Iniciar Sesion
            </button>
            <div class="flex items-center gap-3 my-4">
              <div class="flex-1 h-px bg-white/10"></div>
              <span class="text-white/30 text-xs">o continua con</span>
              <div class="flex-1 h-px bg-white/10"></div>
            </div>
            <div class="flex gap-3">
              <button class="flex-1 py-3 rounded-xl glass text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button class="flex-1 py-3 rounded-xl glass text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <svg class="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Apple
              </button>
            </div>
            <p class="text-center mt-5">
              <span class="text-white/40 text-xs">No tienes cuenta? </span>
              <button id="show-register" class="text-primary-light text-xs font-bold">Registrate gratis</button>
            </p>
          </div>

          <!-- Register Form (hidden) -->
          <div id="auth-register-form" class="hidden">
            <input type="text" id="reg-name" class="auth-input mb-3" placeholder="Nombre completo" autocomplete="name">
            <input type="email" id="reg-email" class="auth-input mb-3" placeholder="correo@ejemplo.com" autocomplete="email">
            <!-- Fecha de nacimiento -->
            <div class="mb-3">
              <label class="text-white/50 text-xs mb-1 block">Fecha de nacimiento</label>
              <input type="date" id="reg-birthdate" class="auth-input" max="${new Date().toISOString().split('T')[0]}">
            </div>
            <!-- WhatsApp / Teléfono -->
            <div class="mb-3">
              <label class="text-white/50 text-xs mb-1 block">WhatsApp / Teléfono</label>
              <input type="tel" id="reg-phone" class="auth-input" placeholder="+57 300 123 4567">
            </div>
            <!-- Allergies (mandatory) -->
            <div class="mb-3">
              <label class="text-white text-xs font-bold mb-1 block">\u{1F6A8} Alergias (obligatorio)</label>
              <p class="text-white/40 text-[10px] mb-2">Selecciona todas las que apliquen o marca 'Ninguna'</p>
              <div id="reg-allergies-group" class="grid grid-cols-2 gap-2 mb-2">
                ${Object.keys(_getAllergyLabels()).filter(function(k) { return k !== 'ninguna'; }).map(function(k) { return '<label class="flex items-center gap-2 text-white/80 text-xs"><input type="checkbox" class="reg-allergy-cb" value="' + k + '"> ' + _getAllergyLabels()[k] + '</label>'; }).join('')}
              </div>
              <input type="text" id="reg-allergy-meds" class="auth-input mb-2 hidden" placeholder="\u00bfCu\u00e1les medicamentos?">
              <label class="flex items-center gap-2 text-white/80 text-xs mb-2"><input type="checkbox" id="reg-allergy-none" value="ninguna"> Ninguna conocida</label>
              <input type="text" id="reg-allergy-other" class="auth-input" placeholder="Otras alergias (opcional)">
            </div>
            <!-- Medical conditions (optional) -->
            <div class="mb-3">
              <label class="text-white/50 text-xs mb-1 block">Condiciones m\u00e9dicas (opcional)</label>
              <div id="reg-conditions-group" class="grid grid-cols-2 gap-2 mb-2">
                ${Object.keys(_getConfigConditions()).map(function(k) { return '<label class="flex items-center gap-2 text-white/80 text-xs"><input type="checkbox" class="reg-condition-cb" value="' + k + '"> ' + _getConfigConditions()[k] + '</label>'; }).join('')}
              </div>
              <input type="text" id="reg-condition-other" class="auth-input hidden" placeholder="Especifica la condici\u00f3n">
            </div>
            <input type="password" id="reg-pass" class="auth-input mb-3" placeholder="Contrasena (min. 6 caracteres)" autocomplete="new-password">
            <input type="password" id="reg-pass2" class="auth-input mb-4" placeholder="Confirmar contrasena" autocomplete="new-password">
            <button id="auth-register-btn" class="w-full py-4 rounded-2xl gradient-accent text-white font-bold text-sm shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-transform">
              Crear Cuenta
            </button>
            <p class="text-center mt-5">
              <span class="text-white/40 text-xs">Ya tienes cuenta? </span>
              <button id="show-login" class="text-primary-light text-xs font-bold">Inicia sesion</button>
            </p>
          </div>

          <!-- Skip for now -->
          <button id="auth-skip" class="w-full text-center mt-4 text-white/30 text-xs py-2 active:text-white/50 transition">
            Explorar sin cuenta
          </button>
          <div class="pb-8"></div>
        </div>
      </div>
    </div>
  `;

  // Toggle login/register
  authScreen.querySelector('#show-register').onclick = () => {
    authScreen.querySelector('#auth-login-form').classList.add('hidden');
    authScreen.querySelector('#auth-register-form').classList.remove('hidden');
  };
  authScreen.querySelector('#show-login').onclick = () => {
    authScreen.querySelector('#auth-register-form').classList.add('hidden');
    authScreen.querySelector('#auth-login-form').classList.remove('hidden');
  };

  // Login
  authScreen.querySelector('#auth-login-btn').onclick = () => _doLogin(authScreen);
  // Register
  authScreen.querySelector('#auth-register-btn').onclick = () => _doRegister(authScreen);
  // Skip
  authScreen.querySelector('#auth-skip').onclick = () => {
    _enterApp(authScreen);
  };

  // Allergy checkbox logic: "Ninguna" unchecks all others and vice-versa
  const allergyNoneCb = authScreen.querySelector('#reg-allergy-none');
  const allergyCbs = authScreen.querySelectorAll('.reg-allergy-cb');
  const medsInput = authScreen.querySelector('#reg-allergy-meds');
  allergyNoneCb.onchange = () => {
    if (allergyNoneCb.checked) {
      allergyCbs.forEach(cb => { cb.checked = false; });
      medsInput.classList.add('hidden');
    }
  };
  allergyCbs.forEach(cb => {
    cb.onchange = () => {
      if (cb.checked) allergyNoneCb.checked = false;
      // Show/hide medication text input
      const medsCb = authScreen.querySelector('.reg-allergy-cb[value="medicamentos"]');
      if (medsCb && medsCb.checked) { medsInput.classList.remove('hidden'); } else { medsInput.classList.add('hidden'); }
    };
  });
  // Medical condition "Otra" shows text input
  const condOtraCb = authScreen.querySelector('.reg-condition-cb[value="otra"]');
  const condOtherInput = authScreen.querySelector('#reg-condition-other');
  if (condOtraCb) {
    condOtraCb.onchange = () => {
      if (condOtraCb.checked) { condOtherInput.classList.remove('hidden'); } else { condOtherInput.classList.add('hidden'); }
    };
  }
}

function _doLogin(authScreen) {
  const email = authScreen.querySelector('#auth-email').value.trim();
  const pass = authScreen.querySelector('#auth-pass').value;
  if (!email || !pass) { showToast('Completa todos los campos'); return; }
  localStorage.setItem('dya_user', JSON.stringify({ email, name: email.split('@')[0] }));
  localStorage.setItem('dya_logged', '1');
  initSubscription(email);
  _enterApp(authScreen);
}

function _doRegister(authScreen) {
  const name = authScreen.querySelector('#reg-name').value.trim();
  const email = authScreen.querySelector('#reg-email').value.trim();
  const birthdate = authScreen.querySelector('#reg-birthdate').value;
  const phone = authScreen.querySelector('#reg-phone').value.trim();
  const pass = authScreen.querySelector('#reg-pass').value;
  const pass2 = authScreen.querySelector('#reg-pass2').value;
  if (!name || !email || !pass) { showToast('Completa todos los campos'); return; }
  if (!birthdate) { showToast('Indica tu fecha de nacimiento'); return; }
  if (pass !== pass2) { showToast('Las contrasenas no coinciden'); return; }
  if (pass.length < 6) { showToast('La contrasena debe tener al menos 6 caracteres'); return; }

  // Collect allergies
  const allergyCbs = authScreen.querySelectorAll('.reg-allergy-cb:checked');
  const allergyNone = authScreen.querySelector('#reg-allergy-none');
  const selectedAllergies = Array.from(allergyCbs).map(cb => cb.value);
  if (!allergyNone.checked && selectedAllergies.length === 0) {
    showToast('Selecciona al menos una alergia o marca "Ninguna conocida"');
    return;
  }
  const allergies = allergyNone.checked ? ['ninguna'] : selectedAllergies;
  const allergiesMeds = authScreen.querySelector('#reg-allergy-meds').value.trim();
  const allergiesOther = authScreen.querySelector('#reg-allergy-other').value.trim();

  // Collect medical conditions
  const conditionCbs = authScreen.querySelectorAll('.reg-condition-cb:checked');
  const medicalConditions = Array.from(conditionCbs).map(cb => cb.value);
  const medicalConditionsOther = authScreen.querySelector('#reg-condition-other').value.trim();

  const userData = { email, name, birthdate, phone, allergies, allergiesMeds, allergiesOther, medicalConditions, medicalConditionsOther };
  localStorage.setItem('dya_user', JSON.stringify(userData));
  localStorage.setItem('dya_birthdate', birthdate);
  if (phone) localStorage.setItem('dya_phone', phone);
  localStorage.setItem('dya_logged', '1');
  localStorage.setItem('dya_allergy_set', '1');

  // Save patient profile
  const profileData = { allergies, allergiesMeds, allergiesOther, medicalConditions, medicalConditionsOther };
  localStorage.setItem('dya_patient_profile_' + email, JSON.stringify(profileData));

  _addAuditLog('patient_initial_allergy_setup', 'Registro inicial: alergias=[' + allergies.join(',') + '], condiciones=[' + medicalConditions.join(',') + ']');

  initSubscription(email);
  showToast('Cuenta creada exitosamente!');
  _enterApp(authScreen);
}

function _enterApp(authScreen) {
  authScreen.style.opacity = '0';
  authScreen.style.transition = 'opacity 0.4s ease';
  setTimeout(() => {
    authScreen.classList.add('hidden');
    authScreen.style.opacity = '';

    // Subscription check before showing app
    var subResult = checkSubscriptionStatus();
    if (!subResult.allowed) {
      var blockDiv = document.createElement('div');
      blockDiv.id = 'sub-block-container';
      document.body.appendChild(blockDiv);
      renderBlockScreen(blockDiv);
      return;
    }

    document.getElementById('app').classList.remove('hidden');
    trackUserActivity();
    buildNav();
    navigateTo('habits');
    // Prompt existing users who haven't set allergies
    _checkAllergyPrompt();
    // Background subscription tasks
    setTimeout(function() { processSubReminders(); }, 2000);
    setTimeout(function() { cleanupExpiredAccounts(); }, 3000);
    // Start breathing coach (monitors stress and sends reminders)
    setTimeout(function() { startBreathingCoach(); }, 4000);
  }, 400);
}

function _checkAllergyPrompt() {
  if (localStorage.getItem('dya_allergy_set')) return;
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  if (!user.email) return;

  const overlay = document.createElement('div');
  overlay.id = 'allergy-prompt-modal';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/60"></div>
    <div class="relative bg-white rounded-3xl w-[90%] max-w-sm p-6 animate-slide-up">
      <div class="text-center mb-4">
        <div class="text-4xl mb-2">\u{1F6A8}</div>
        <h2 class="font-bold text-lg text-gray-800">Completa tu Perfil de Salud</h2>
        <p class="text-xs text-gray-400 mt-1">Para brindarte recomendaciones seguras, necesitamos saber tus alergias y condiciones m\u00e9dicas.</p>
      </div>
      <button id="allergy-prompt-go" class="w-full py-3 rounded-2xl gradient-primary text-white font-bold text-sm shadow-xl shadow-primary/30 mb-2">Completar ahora</button>
      <button id="allergy-prompt-later" class="w-full py-2 text-gray-400 text-xs">Recordarme despu\u00e9s</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#allergy-prompt-go').onclick = function() {
    overlay.remove();
    navigateTo('settings');
    // Auto-open the editor after a short delay for rendering
    setTimeout(function() {
      var btn = document.querySelector('#edit-health-profile-btn');
      if (btn) btn.click();
    }, 300);
  };
  overlay.querySelector('#allergy-prompt-later').onclick = function() {
    overlay.remove();
  };
}

// ── Audit Log ─────────────────────────────────────────────────────────
function _addAuditLog(action, detail) {
  var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  var logs = JSON.parse(localStorage.getItem('dya_audit_log') || '[]');
  logs.push({
    action: action,
    userEmail: user.email || 'anonymous',
    detail: detail,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('dya_audit_log', JSON.stringify(logs));
}

// ── Health Profile Section for Settings ───────────────────────────────
const DEFAULT_ALLERGY_LABELS = {
  mani: 'Man\u00ed/Cacahuate', frutos_secos: 'Frutos secos', mariscos: 'Mariscos',
  lactosa: 'L\u00e1cteos/Lactosa', gluten: 'Gluten/Trigo', huevo: 'Huevo',
  soya: 'Soya', medicamentos: 'Medicamentos', ninguna: 'Ninguna conocida'
};
const DEFAULT_CONDITION_LABELS = {
  diabetes: 'Diabetes', hipertension: 'Hipertensi\u00f3n', asma: 'Asma',
  cardiopatia: 'Enfermedad card\u00edaca', renal: 'Enfermedad renal', otra: 'Otra'
};

function _getConfigAllergies() {
  try {
    var cfg = JSON.parse(localStorage.getItem('dya_config_allergies'));
    if (cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0) {
      // Admin stores as array of {name, icon, active} — convert to key-value map
      if (Array.isArray(cfg)) {
        var map = {};
        cfg.forEach(function(item) {
          if (item && item.name && item.active !== false) {
            var key = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            map[key] = item.name;
          }
        });
        if (Object.keys(map).length > 0) return map;
      } else {
        return cfg;
      }
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_ALLERGY_LABELS;
}

function _getConfigConditions() {
  try {
    var cfg = JSON.parse(localStorage.getItem('dya_config_conditions'));
    if (cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0) {
      // Admin stores as array of {name, icon, active} — convert to key-value map
      if (Array.isArray(cfg)) {
        var map = {};
        cfg.forEach(function(item) {
          if (item && item.name && item.active !== false) {
            var key = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            map[key] = item.name;
          }
        });
        if (Object.keys(map).length > 0) return map;
      } else {
        return cfg;
      }
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_CONDITION_LABELS;
}

// Computed labels (always read from config or fallback)
function _getAllergyLabels() { return _getConfigAllergies(); }
function _getConditionLabels() { return _getConfigConditions(); }

// Legacy compat references
var ALLERGY_LABELS = DEFAULT_ALLERGY_LABELS;
var CONDITION_LABELS = DEFAULT_CONDITION_LABELS;

function _renderConditionMeta(key, type) {
  var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  var metaStore = JSON.parse(localStorage.getItem('dya_conditions_meta_' + user.email) || '{}');
  var metaKey = type + '_' + key;
  var meta = metaStore[metaKey];
  if (!meta) return '<span class="text-[10px] text-gray-300 ml-1">(paciente)</span>';
  var isDoctorSet = meta.doctorSet || meta.setBy === 'doctor';
  var who = isDoctorSet ? (meta.doctorName || 'Doctor') : 'Paciente';
  var when = meta.date ? ' el ' + meta.date : '';
  return (isDoctorSet ? ' \uD83D\uDD12' : '') +
    '<span class="text-[10px] text-gray-400 ml-1">(' + who + when + ')</span>';
}

function _renderHealthProfileSection(user) {
  const profile = getPatientProfile();
  const allergies = profile.allergies || [];
  const medicalConditions = profile.medicalConditions || [];
  const recs = JSON.parse(localStorage.getItem('dya_patient_recs_' + user.email) || '[]');
  const hasAllergies = allergies.length > 0;
  var aLabels = _getAllergyLabels();
  var cLabels = _getConditionLabels();

  var allergyItems = allergies.map(function(a) {
    return '<span class="inline-flex items-center">' + (aLabels[a] || a) + _renderConditionMeta(a, 'allergy') + '</span>';
  }).join(', ') || 'Sin definir';
  var condItems = medicalConditions.map(function(c) {
    return '<span class="inline-flex items-center">' + (cLabels[c] || c) + _renderConditionMeta(c, 'condition') + '</span>';
  }).join(', ') || 'Ninguna';

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:40ms">
      <h3 class="font-bold text-sm text-gray-800 mb-3">\u{2764}\u{FE0F} Mi Perfil de Salud</h3>
      ${!hasAllergies ? '<div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-3"><p class="text-red-600 text-xs font-bold">\u26A0\uFE0F No has configurado tus alergias. Es importante para tu seguridad.</p></div>' : ''}
      <div class="space-y-3">
        <div>
          <p class="text-xs text-gray-400 mb-1">Alergias</p>
          <p class="text-sm text-gray-700">${allergyItems}${profile.allergiesOther ? ' | Otras: ' + profile.allergiesOther : ''}${profile.allergiesMeds ? ' | Medicamentos: ' + profile.allergiesMeds : ''}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-1">Condiciones m\u00e9dicas</p>
          <p class="text-sm text-gray-700">${condItems}${profile.medicalConditionsOther ? ' | ' + profile.medicalConditionsOther : ''}</p>
        </div>
        ${recs.length > 0 ? '<div><p class="text-xs text-gray-400 mb-1">Recomendaciones del doctor</p><ul class="text-sm text-gray-700 list-disc pl-4">' + recs.map(function(r) { return '<li>' + r + '</li>'; }).join('') + '</ul></div>' : ''}
      </div>
      <button id="edit-health-profile-btn" class="mt-4 w-full py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">Editar Perfil de Salud</button>
    </div>
  `;
}

// ── Settings Page ──────────────────────────────────────────────────────
function renderSettings(container) {
  const LANGS = [
    { code: 'es', flag: '🇪🇸', name: 'Espanol' },
    { code: 'en', flag: '🇺🇸', name: 'English' },
    { code: 'pt', flag: '🇧🇷', name: 'Portugues' },
    { code: 'fr', flag: '🇫🇷', name: 'Francais' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  ];
  const COUNTRIES = [
    { code: 'CO', flag: '🇨🇴', name: 'Colombia', full: true },
    { code: 'US', flag: '🇺🇸', name: 'United States' },
    { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
    { code: 'ES', flag: '🇪🇸', name: 'Espana' },
    { code: 'BR', flag: '🇧🇷', name: 'Brasil' },
    { code: 'OTHER', flag: '🌍', name: 'Otro' },
  ];

  const curLang = getLang();
  const curCountry = getCountry();
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  const initial = (user.name || 'U')[0].toUpperCase();

  container.innerHTML = `
    <div class="gradient-navy text-white px-5 pt-12 pb-10 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <p class="text-xs text-white/40 mb-1">MiDoctorYa</p>
      <h1 class="text-2xl font-bold">${t('set_title')}</h1>
    </div>

    <div class="px-4 -mt-5 space-y-4 pb-6">
      <!-- Profile -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/30">${initial}</div>
          <div class="flex-1">
            <h2 class="font-bold text-lg text-gray-800">${user.name || 'Usuario'}</h2>
            <p class="text-sm text-gray-400">${user.email || ''}</p>
            <span class="inline-block mt-1 text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">Premium</span>
          </div>
        </div>
      </div>

      <!-- Subscription -->
      ${renderSubscriptionInfo()}

      <!-- Health Profile -->
      ${_renderHealthProfileSection(user)}

      <!-- Language -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:80ms">
        <h3 class="font-bold text-sm text-gray-800 mb-3">${t('set_lang')}</h3>
        <div class="flex flex-wrap gap-2" id="lang-pills">
          ${LANGS.map(l => `
            <button data-lang="${l.code}" class="lang-pill px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1
              ${l.code === curLang ? 'gradient-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 text-gray-600 border border-gray-100'}">
              <span class="text-lg">${l.flag}</span><span>${l.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Country -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:160ms">
        <h3 class="font-bold text-sm text-gray-800 mb-1">${t('set_country')}</h3>
        <p class="text-xs text-gray-400 mb-3">${t('set_country_sub')}</p>
        <div class="space-y-2" id="country-list">
          ${COUNTRIES.map(c => `
            <button data-country="${c.code}" class="country-btn w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
              ${c.code === curCountry ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 border-2 border-transparent'}">
              <span class="text-xl">${c.flag}</span>
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-800">${c.name}</p>
                <p class="text-[10px] text-gray-400">${c.full ? t('set_co_full') : t('set_intl')}</p>
              </div>
              ${c.code === curCountry ? '<svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : ''}
              ${c.full ? '<span class="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">FULL</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Logout -->
      <button id="settings-logout" class="w-full py-3 rounded-xl bg-red-50 text-red-500 text-sm font-semibold border border-red-100 animate-slide-up" style="animation-delay:240ms">
        Cerrar Sesion
      </button>

      <p class="text-center text-[10px] text-gray-300 pt-2">MiDoctorYa Lite v1.0 -- PWA</p>
    </div>
  `;

  container.querySelectorAll('.lang-pill').forEach(btn => {
    btn.onclick = () => { setLang(btn.dataset.lang); showToast(t('set_saved')); renderSettings(container); buildNav(); };
  });
  container.querySelectorAll('.country-btn').forEach(btn => {
    btn.onclick = () => { setCountry(btn.dataset.country); showToast(t('set_saved')); renderSettings(container); buildNav(); };
  });
  container.querySelector('#settings-logout').onclick = () => {
    localStorage.removeItem('dya_logged');
    localStorage.removeItem('dya_user');
    location.reload();
  };

  // Edit Health Profile button
  const editBtn = container.querySelector('#edit-health-profile-btn');
  if (editBtn) {
    editBtn.onclick = () => _showHealthProfileEditor(container);
  }

  // Subscription renew button
  const subRenewBtn = container.querySelector('#sub-info-renew-btn');
  if (subRenewBtn) {
    subRenewBtn.onclick = async () => {
      subRenewBtn.textContent = 'Generando enlace...';
      subRenewBtn.disabled = true;
      try {
        var usr = JSON.parse(localStorage.getItem('dya_user') || '{}');
        var result = await generatePaymentLink(usr.email);
        if (result.link) {
          window.open(result.link, '_blank');
          subRenewBtn.textContent = 'Enlace abierto';
        } else {
          subRenewBtn.textContent = 'Error al generar enlace';
        }
      } catch(e) {
        subRenewBtn.textContent = 'Error: ' + e.message;
      }
      setTimeout(function() {
        subRenewBtn.textContent = 'Renovar Suscripcion';
        subRenewBtn.disabled = false;
      }, 3000);
    };
  }
}

function _isDoctorSet(key, type) {
  var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  var metaStore = JSON.parse(localStorage.getItem('dya_conditions_meta_' + user.email) || '{}');
  var metaKey = type + '_' + key;
  var meta = metaStore[metaKey];
  if (!meta) return null;
  if (meta.doctorSet || meta.setBy === 'doctor') return meta;
  return null;
}

function _showDoctorUncheckWarning(itemKey, itemLabel, type, meta, onConfirm) {
  var doctorName = meta.doctorName || 'tu m\u00e9dico';
  var dateStr = meta.date || 'fecha desconocida';
  var popup = document.createElement('div');
  popup.id = 'doctor-uncheck-warning';
  popup.innerHTML = '<div class="fixed inset-0 z-50 flex items-center justify-center">' +
    '<div class="absolute inset-0 bg-black/60"></div>' +
    '<div class="relative bg-white rounded-3xl w-[90%] max-w-sm p-6">' +
      '<div class="text-center mb-4">' +
        '<div class="text-4xl mb-2">\u2695\uFE0F</div>' +
        '<h2 class="font-bold text-lg text-red-600">\u00A1Atenci\u00F3n!</h2>' +
        '<p class="text-sm text-gray-600 mt-2">' +
          'Esta condici\u00F3n fue registrada por tu m\u00E9dico ' +
          '<strong>' + doctorName + '</strong> el ' + dateStr + '.' +
        '</p>' +
        '<p class="text-xs text-gray-400 mt-2">' +
          'Desmarcarla podr\u00EDa afectar tus recomendaciones de salud. ' +
          'Se recomienda consultar con tu m\u00E9dico antes de hacer cambios.' +
        '</p>' +
      '</div>' +
      '<button id="doc-warn-confirm" class="w-full py-3 rounded-2xl bg-red-500 text-white font-bold text-sm mb-2">' +
        'Entiendo, desmarcar de todas formas' +
      '</button>' +
      '<button id="doc-warn-cancel" class="w-full py-2 text-gray-400 text-xs">' +
        'Cancelar, mantener como est\u00E1' +
      '</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(popup);

  popup.querySelector('#doc-warn-confirm').onclick = function() {
    var auditType = type === 'allergy' ? 'patient_unmark_allergy' : 'patient_unmark_condition';
    var auditDetail = 'Desmarcó ' + itemLabel + ' (originalmente marcado por ' + (meta.doctorName ? 'Dr. ' + meta.doctorName : 'Doctor') + ')';
    _addAuditLog(auditType, auditDetail);
    popup.remove();
    if (onConfirm) onConfirm();
  };
  popup.querySelector('#doc-warn-cancel').onclick = function() {
    popup.remove();
  };
}

function _showHealthProfileEditor(settingsContainer) {
  const profile = getPatientProfile();
  const allergies = profile.allergies || [];
  const medConds = profile.medicalConditions || [];

  var aLabels = _getAllergyLabels();
  var cLabels = _getConditionLabels();
  var allergyKeys = Object.keys(aLabels).filter(function(k) { return k !== 'ninguna'; });
  var condKeys = Object.keys(cLabels);
  const isNone = allergies.includes('ninguna');

  const overlay = document.createElement('div');
  overlay.id = 'health-profile-modal';
  overlay.className = 'fixed inset-0 z-50 flex items-end justify-center';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/50" id="hp-modal-backdrop"></div>
    <div class="relative bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 pb-10 animate-slide-up">
      <h2 class="font-bold text-lg text-gray-800 mb-1">\u{2764}\u{FE0F} Editar Perfil de Salud</h2>
      <p class="text-xs text-gray-400 mb-4">Actualiza tus alergias y condiciones</p>

      <label class="text-sm font-bold text-gray-700 block mb-2">\u{1F6A8} Alergias</label>
      <div id="hp-allergies-group" class="grid grid-cols-2 gap-2 mb-2">
        ${allergyKeys.map(function(k) {
          var docMeta = _isDoctorSet(k, 'allergy');
          var lockIcon = docMeta ? ' \uD83D\uDD12' : '';
          return '<label class="flex items-center gap-2 text-gray-700 text-xs"><input type="checkbox" class="hp-allergy-cb" value="' + k + '"' + (allergies.includes(k) ? ' checked' : '') + (docMeta ? ' data-doctor-set="1"' : '') + '> ' + aLabels[k] + lockIcon + '</label>';
        }).join('')}
      </div>
      <label class="flex items-center gap-2 text-gray-700 text-xs mb-2"><input type="checkbox" id="hp-allergy-none" value="ninguna"${isNone ? ' checked' : ''}> Ninguna conocida</label>
      <input type="text" id="hp-allergy-meds" class="w-full border rounded-xl p-2 text-sm mb-2${allergies.includes('medicamentos') ? '' : ' hidden'}" placeholder="\u00bfCu\u00e1les medicamentos?" value="${profile.allergiesMeds || ''}">
      <input type="text" id="hp-allergy-other" class="w-full border rounded-xl p-2 text-sm mb-4" placeholder="Otras alergias (opcional)" value="${profile.allergiesOther || ''}">

      <label class="text-sm font-bold text-gray-700 block mb-2">Condiciones m\u00e9dicas</label>
      <div id="hp-conditions-group" class="grid grid-cols-2 gap-2 mb-2">
        ${condKeys.map(function(k) {
          var docMeta = _isDoctorSet(k, 'condition');
          var lockIcon = docMeta ? ' \uD83D\uDD12' : '';
          return '<label class="flex items-center gap-2 text-gray-700 text-xs"><input type="checkbox" class="hp-condition-cb" value="' + k + '"' + (medConds.includes(k) ? ' checked' : '') + (docMeta ? ' data-doctor-set="1"' : '') + '> ' + cLabels[k] + lockIcon + '</label>';
        }).join('')}
      </div>
      <input type="text" id="hp-condition-other" class="w-full border rounded-xl p-2 text-sm mb-4${medConds.includes('otra') ? '' : ' hidden'}" placeholder="Especifica la condici\u00f3n" value="${profile.medicalConditionsOther || ''}">

      <div class="flex gap-3">
        <button id="hp-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Cancelar</button>
        <button id="hp-save" class="flex-1 py-3 rounded-xl gradient-primary text-white text-sm font-bold shadow-lg shadow-primary/30">Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Doctor-set uncheck protection for allergies
  function _attachDoctorGuard(selector, type, labelsObj) {
    overlay.querySelectorAll(selector).forEach(function(cb) {
      cb.onchange = function(e) {
        if (!cb.checked && cb.dataset.doctorSet === '1') {
          // Revert the uncheck, show warning
          cb.checked = true;
          var meta = _isDoctorSet(cb.value, type);
          if (meta) {
            _showDoctorUncheckWarning(cb.value, labelsObj[cb.value] || cb.value, type, meta, function() {
              cb.checked = false;
              // Trigger normal onchange side-effects
              _runCheckboxSideEffects();
            });
          }
          return;
        }
        _runCheckboxSideEffects();
      };
    });
  }

  function _runCheckboxSideEffects() {
    var noneCbEl = overlay.querySelector('#hp-allergy-none');
    var medsCb = overlay.querySelector('.hp-allergy-cb[value="medicamentos"]');
    var medsInEl = overlay.querySelector('#hp-allergy-meds');
    var otraCbEl = overlay.querySelector('.hp-condition-cb[value="otra"]');
    var otherInEl = overlay.querySelector('#hp-condition-other');
    // If any allergy is checked, uncheck "none"
    var anyAllergyChecked = overlay.querySelectorAll('.hp-allergy-cb:checked').length > 0;
    if (anyAllergyChecked && noneCbEl) noneCbEl.checked = false;
    // Show/hide meds input
    if (medsCb && medsCb.checked) { medsInEl.classList.remove('hidden'); } else { medsInEl.classList.add('hidden'); }
    // Show/hide "otra" input
    if (otraCbEl && otraCbEl.checked) { otherInEl.classList.remove('hidden'); } else if (otherInEl) { otherInEl.classList.add('hidden'); }
  }

  _attachDoctorGuard('.hp-allergy-cb', 'allergy', aLabels);
  _attachDoctorGuard('.hp-condition-cb', 'condition', cLabels);

  // "Ninguna" checkbox logic
  const noneCb = overlay.querySelector('#hp-allergy-none');
  const aCbs = overlay.querySelectorAll('.hp-allergy-cb');
  const medsIn = overlay.querySelector('#hp-allergy-meds');
  noneCb.onchange = function() { if (noneCb.checked) { aCbs.forEach(function(c) { c.checked = false; }); medsIn.classList.add('hidden'); } };

  overlay.querySelector('#hp-modal-backdrop').onclick = function() { overlay.remove(); };
  overlay.querySelector('#hp-cancel').onclick = function() { overlay.remove(); };
  overlay.querySelector('#hp-save').onclick = function() {
    var selAllergies = Array.from(overlay.querySelectorAll('.hp-allergy-cb:checked')).map(function(c) { return c.value; });
    var noneChecked = overlay.querySelector('#hp-allergy-none').checked;
    if (!noneChecked && selAllergies.length === 0) { showToast('Selecciona al menos una alergia o "Ninguna"'); return; }
    var finalAllergies = noneChecked ? ['ninguna'] : selAllergies;
    var selConds = Array.from(overlay.querySelectorAll('.hp-condition-cb:checked')).map(function(c) { return c.value; });

    var profileData = {
      allergies: finalAllergies,
      allergiesMeds: overlay.querySelector('#hp-allergy-meds').value.trim(),
      allergiesOther: overlay.querySelector('#hp-allergy-other').value.trim(),
      medicalConditions: selConds,
      medicalConditionsOther: overlay.querySelector('#hp-condition-other').value.trim()
    };
    savePatientProfile(profileData);

    // Also update user object
    var usr = JSON.parse(localStorage.getItem('dya_user') || '{}');
    Object.assign(usr, profileData);
    localStorage.setItem('dya_user', JSON.stringify(usr));
    localStorage.setItem('dya_allergy_set', '1');

    _addAuditLog('patient_edit_health_profile', 'Editó perfil de salud: alergias=[' + finalAllergies.join(',') + '], condiciones=[' + selConds.join(',') + ']');

    overlay.remove();
    showToast('Perfil de salud actualizado');
    renderSettings(settingsContainer);
  };
}

// ── Payment Callback Handling ──────────────────────────────────────────
function _handlePaymentCallback() {
  var urlParams = new URLSearchParams(window.location.search);
  var paymentStatus = urlParams.get('payment');
  if (!paymentStatus) return false;

  var plan = urlParams.get('plan') || 'mensual';
  var paymentType = urlParams.get('type') || 'subscription';
  var collectionId = urlParams.get('collection_id') || '';
  var preferenceId = urlParams.get('preference_id') || '';
  var paymentId = urlParams.get('payment_id') || collectionId;
  var externalRef = urlParams.get('external_reference') || '';

  // Clean URL parameters
  window.history.replaceState({}, '', window.location.pathname);

  var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  if (!user.email) return false;

  if (paymentStatus === 'success') {
    if (paymentType === 'onetime') {
      // One-time payment success - just notify
      showToast('Pago realizado exitosamente!');
      return false;
    }

    // Subscription payment success
    // If we have a payment ID from MP, record it; otherwise still activate with fallback
    var paymentData = {
      mpPaymentId: paymentId || 'MP_CALLBACK_' + Date.now(),
      amount: 0,
      currency: '',
      method: paymentId ? 'mercadopago' : 'mercadopago_unverified'
    };

    activateSubscription(user.email, plan, paymentData);

    if (!paymentId) {
      // No MP verification available - show fallback message
      showToast('Pago registrado. Si tienes problemas, contacta soporte.');
    } else {
      showToast('Pago confirmado! Suscripcion activada.');
    }
    return true;
  } else if (paymentStatus === 'failure') {
    showToast('El pago no se completo. Intenta de nuevo.');
    return false;
  } else if (paymentStatus === 'pending') {
    showToast('Pago pendiente. Te notificaremos cuando se confirme.');
    return false;
  }

  return false;
}

// ── Promo Code URL Parameter Handling ─────────────────────────────────
function _handlePromoCodeURL() {
  var urlParams = new URLSearchParams(window.location.search);
  var promoCode = urlParams.get('code') || urlParams.get('promo');
  if (!promoCode) return;

  var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  if (!user.email) return;

  var result = redeemPromoCode(user.email, promoCode);
  if (result.valid) {
    showToast('Codigo aplicado: ' + result.message);
  }
  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

// ── Boot ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash');

  setTimeout(() => {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
      splash.style.display = 'none';

      // Handle payment callback from Mercado Pago
      var paymentHandled = _handlePaymentCallback();

      const isLogged = localStorage.getItem('dya_logged');
      if (isLogged) {
        // Handle promo code from URL
        _handlePromoCodeURL();

        // Subscription check on boot
        var subResult = checkSubscriptionStatus();
        if (!subResult.allowed && !paymentHandled) {
          var blockDiv = document.createElement('div');
          blockDiv.id = 'sub-block-container';
          document.body.appendChild(blockDiv);
          renderBlockScreen(blockDiv);
          return;
        }

        document.getElementById('app').classList.remove('hidden');
        buildNav();
        navigateTo('habits');
        _checkAllergyPrompt();
        // Background subscription tasks (non-blocking)
        setTimeout(function() { processSubReminders(); }, 2000);
        setTimeout(function() { cleanupExpiredAccounts(); }, 3000);
      } else {
        renderAuth();
      }
    }, 500);
  }, 1500);
});
