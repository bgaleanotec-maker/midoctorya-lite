/* ── Stress Module — MiDoctorYa Lite ────────────────────────────────── */
import { t } from './i18n.js';
import { logMood, logBreathing } from './api.js';
import { showToast } from './app.js';

const MOODS = [
  { key: 'great', emoji: '😄', val: 5, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'good',  emoji: '🙂', val: 4, color: 'bg-green-100 text-green-600' },
  { key: 'ok',    emoji: '😐', val: 3, color: 'bg-amber-100 text-amber-600' },
  { key: 'bad',   emoji: '😔', val: 2, color: 'bg-orange-100 text-orange-600' },
  { key: 'awful', emoji: '😢', val: 1, color: 'bg-red-100 text-red-600' },
];

const TRIGGERS = ['work', 'family', 'health', 'money', 'social'];
const TRIGGER_ICONS = { work: '💼', family: '👨‍👩‍👧', health: '🏥', money: '💰', social: '👥' };

let _selectedMood = null;
let _breathingActive = false;
let _breathingTimer = null;
let _breathingSeconds = 0;
let _breathingPhase = 'idle';

export function renderStress(container) {
  _selectedMood = null;
  _stopBreathing();

  container.innerHTML = `
    <!-- Header -->
    <div class="gradient-calm text-white px-5 pt-12 pb-10 relative overflow-hidden">
      <div class="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full"></div>
      <div class="absolute top-8 right-8 w-20 h-20 bg-white/5 rounded-full"></div>
      <p class="text-xs text-white/40 mb-1">MiDoctorYa</p>
      <h1 class="text-2xl font-bold mb-1">${t('str_title')}</h1>
      <p class="text-sm text-white/60">Balance cuerpo y mente</p>
    </div>

    <div class="px-4 -mt-5 space-y-4 pb-6">

      <!-- Mood Tracker -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up">
        <h2 class="font-bold text-sm text-gray-800 mb-3">${t('str_how')}</h2>
        <div class="flex justify-between gap-2" id="mood-grid">
          ${MOODS.map(m => `
            <button data-mood="${m.val}" class="mood-btn flex flex-col items-center gap-1 p-2 rounded-2xl ${m.color} transition-all flex-1">
              <span class="text-2xl">${m.emoji}</span>
              <span class="text-[10px] font-semibold">${t('str_mood_' + m.key)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Guided Breathing -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:100ms">
        <h2 class="font-bold text-sm text-gray-800 mb-1">${t('str_breathe')}</h2>
        <p class="text-xs text-gray-400 mb-4">${t('str_breathe_sub')}</p>

        <div class="flex flex-col items-center">
          <div id="breathe-circle" class="breathing-circle mb-4">
            <div class="text-center">
              <p id="breathe-phase" class="text-lg font-bold text-primary">4-7-8</p>
              <p id="breathe-timer" class="text-xs text-gray-400">0:00</p>
            </div>
          </div>
          <button id="breathe-btn" class="px-8 py-2.5 rounded-full gradient-primary text-white text-sm font-semibold shadow-lg shadow-primary/30">
            ${t('str_start_breathing')}
          </button>
        </div>
      </div>

      <!-- Stress Triggers -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:200ms">
        <h2 class="font-bold text-sm text-gray-800 mb-3">${t('str_triggers')}</h2>
        <div class="flex flex-wrap gap-2" id="trigger-grid">
          ${TRIGGERS.map(tr => `
            <button data-trigger="${tr}" class="trigger-pill px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold transition-all">
              ${TRIGGER_ICONS[tr]} ${t('str_trigger_' + tr)}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Journal -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:300ms">
        <h2 class="font-bold text-sm text-gray-800 mb-3">${t('str_journal')}</h2>
        <textarea id="journal-input" rows="3" placeholder="${t('str_journal_ph')}"
          class="w-full bg-gray-50 rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20 transition"></textarea>
        <button id="journal-save" class="mt-2 w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-lg shadow-primary/30">
          ${t('str_save')}
        </button>
      </div>

      <!-- Tips -->
      <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100 animate-slide-up" style="animation-delay:400ms">
        <h2 class="font-bold text-sm text-gray-800 mb-3">💡 ${t('str_tips')}</h2>
        <div class="space-y-2">
          ${[1,2,3].map(i => `
            <div class="flex gap-2 items-start">
              <span class="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">${i}</span>
              <p class="text-xs text-gray-600 leading-relaxed">${t('str_tip' + i)}</p>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Mood selection
  container.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = async () => {
      container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _selectedMood = parseInt(btn.dataset.mood);
      await logMood(_selectedMood);
      showToast('😊 Mood saved!');
    };
  });

  // Trigger pills
  container.querySelectorAll('.trigger-pill').forEach(btn => {
    btn.onclick = () => {
      btn.classList.toggle('pill-active');
      btn.classList.toggle('bg-gray-100');
      btn.classList.toggle('text-gray-600');
    };
  });

  // Breathing
  const breatheBtn = container.querySelector('#breathe-btn');
  breatheBtn.onclick = () => {
    if (_breathingActive) {
      _stopBreathing();
      _updateBreathingUI(container);
      logBreathing(_breathingSeconds);
      showToast(`🧘 ${_breathingSeconds}s breathing session saved!`);
    } else {
      _startBreathing(container);
    }
  };

  // Journal save
  container.querySelector('#journal-save').onclick = async () => {
    const text = container.querySelector('#journal-input').value.trim();
    if (text) {
      await logMood(_selectedMood || 3, text);
      container.querySelector('#journal-input').value = '';
      showToast('📝 Journal saved!');
    }
  };
}

function _startBreathing(container) {
  _breathingActive = true;
  _breathingSeconds = 0;
  _breathingPhase = 'inhale';

  const circle = container.querySelector('#breathe-circle');
  const phaseEl = container.querySelector('#breathe-phase');
  const timerEl = container.querySelector('#breathe-timer');
  const btn = container.querySelector('#breathe-btn');
  btn.textContent = t('str_stop_breathing');

  let phaseTime = 0;
  const phases = [
    { name: 'inhale', duration: 4, label: () => t('str_inhale') },
    { name: 'hold',   duration: 7, label: () => t('str_hold') },
    { name: 'exhale', duration: 8, label: () => t('str_exhale') },
  ];
  let phaseIdx = 0;

  _breathingTimer = setInterval(() => {
    _breathingSeconds++;
    phaseTime++;

    const p = phases[phaseIdx];
    if (phaseTime > p.duration) {
      phaseTime = 1;
      phaseIdx = (phaseIdx + 1) % phases.length;
    }

    const cp = phases[phaseIdx];
    _breathingPhase = cp.name;

    if (circle) {
      circle.className = `breathing-circle mb-4 ${cp.name}`;
    }
    if (phaseEl) {
      phaseEl.textContent = `${cp.label()} (${cp.duration - phaseTime + 1})`;
    }
    if (timerEl) {
      const m = Math.floor(_breathingSeconds / 60);
      const s = _breathingSeconds % 60;
      timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function _stopBreathing() {
  _breathingActive = false;
  if (_breathingTimer) { clearInterval(_breathingTimer); _breathingTimer = null; }
}

function _updateBreathingUI(container) {
  const circle = container.querySelector('#breathe-circle');
  const phaseEl = container.querySelector('#breathe-phase');
  const btn = container.querySelector('#breathe-btn');
  if (circle) circle.className = 'breathing-circle mb-4';
  if (phaseEl) phaseEl.textContent = '4-7-8';
  if (btn) btn.textContent = t('str_start_breathing');
}
