/* ── Recordatorios & WhatsApp — MiDoctorYa Lite ─────────────────────── */
import { showToast } from './app.js';

const ULTRAMSG_INSTANCE = 'instance154562';
const ULTRAMSG_TOKEN = 'gxcg5k06jjz7fmi0';
const MAX_REMINDERS = 5;

/* ── Base de datos de 30 mensajes motivacionales diarios ────────────── */
const DAILY_MESSAGES = [
  { day: 1, text: 'Todo lo puedo en Cristo que me fortalece.', author: 'Filipenses 4:13', theme: 'cristianismo' },
  { day: 2, text: 'Porque yo soy el Señor tu Dios, que sostiene tu mano derecha y te dice: No temas, yo te ayudaré.', author: 'Isaías 41:13', theme: 'cristianismo' },
  { day: 3, text: 'La fe es tomar el primer paso incluso cuando no ves la escalera completa.', author: 'Martin Luther King Jr.', theme: 'cristianismo' },
  { day: 4, text: 'Señor, hazme un instrumento de tu paz.', author: 'San Francisco de Asís', theme: 'catolicismo' },
  { day: 5, text: 'No tengáis miedo. Abrid de par en par las puertas a Cristo.', author: 'San Juan Pablo II', theme: 'catolicismo' },
  { day: 6, text: 'Haz pequeñas cosas con gran amor.', author: 'Santa Teresa de Calcuta', theme: 'catolicismo' },
  { day: 7, text: 'La ternura es el camino que han recorrido los hombres y mujeres más valientes y fuertes.', author: 'Papa Francisco', theme: 'catolicismo' },
  { day: 8, text: 'Confía en el Señor con todo tu corazón, y no te apoyes en tu propia prudencia.', author: 'Proverbios 3:5', theme: 'cristianismo' },
  { day: 9, text: 'El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje de continuar.', author: 'Winston Churchill', theme: 'motivacional' },
  { day: 10, text: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.', author: 'Juan 3:16', theme: 'cristianismo' },
  { day: 11, text: 'La oración no nos prepara para una obra mayor, la oración es la obra mayor.', author: 'Oswald Chambers', theme: 'cristianismo' },
  { day: 12, text: 'No se amolden al mundo actual, sino sean transformados mediante la renovación de su mente.', author: 'Romanos 12:2', theme: 'cristianismo' },
  { day: 13, text: 'Cada santo tiene un pasado y cada pecador tiene un futuro.', author: 'Oscar Wilde', theme: 'catolicismo' },
  { day: 14, text: 'La misericordia de Dios no tiene límites si nos dirigimos a Él con corazón arrepentido.', author: 'Papa Francisco', theme: 'catolicismo' },
  { day: 15, text: 'El único modo de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs', theme: 'motivacional' },
  { day: 16, text: 'Jehová es mi pastor, nada me faltará.', author: 'Salmo 23:1', theme: 'cristianismo' },
  { day: 17, text: 'No permitas que lo que no puedes hacer interfiera con lo que sí puedes hacer.', author: 'John Wooden', theme: 'universal' },
  { day: 18, text: 'Pon tu vida en las manos de Dios y verás cómo todo cobra sentido.', author: 'San Agustín', theme: 'catolicismo' },
  { day: 19, text: 'La verdadera medida de un hombre no se ve en momentos de comodidad, sino en tiempos de desafío.', author: 'Martin Luther King Jr.', theme: 'universal' },
  { day: 20, text: 'Pedid y se os dará; buscad y hallaréis; llamad y se os abrirá.', author: 'Mateo 7:7', theme: 'cristianismo' },
  { day: 21, text: 'La salud no es solo ausencia de enfermedad, es un estado de bienestar físico, mental y social.', author: 'OMS', theme: 'universal' },
  { day: 22, text: 'Rezar no es pedir. Es un anhelo del alma.', author: 'Mahatma Gandhi', theme: 'catolicismo' },
  { day: 23, text: 'Cuida tu cuerpo. Es el único lugar que tienes para vivir.', author: 'Jim Rohn', theme: 'universal' },
  { day: 24, text: 'Venid a mí todos los que estáis cansados y agobiados, y yo os haré descansar.', author: 'Mateo 11:28', theme: 'cristianismo' },
  { day: 25, text: 'La vida nos presenta desafíos para que descubramos quiénes somos realmente.', author: 'Anónimo', theme: 'universal' },
  { day: 26, text: 'Que nada te turbe, que nada te espante. Quien a Dios tiene nada le falta.', author: 'Santa Teresa de Jesús', theme: 'catolicismo' },
  { day: 27, text: 'No cuentes los días, haz que los días cuenten.', author: 'Muhammad Ali', theme: 'motivacional' },
  { day: 28, text: 'Esforzaos y cobrad ánimo; no temáis, porque Jehová tu Dios estará contigo.', author: 'Josué 1:9', theme: 'cristianismo' },
  { day: 29, text: 'El futuro pertenece a quienes creen en la belleza de sus sueños.', author: 'Eleanor Roosevelt', theme: 'universal' },
  { day: 30, text: 'Dios no te hubiera puesto ese sueño en el corazón si no te hubiera dado ya todo lo necesario para cumplirlo.', author: 'Anónimo', theme: 'catolicismo' },
];

/* ── Preferencias de mensajes ───────────────────────────────────────── */
const DEFAULT_MSG_PREFS = { themes: ['cristianismo', 'catolicismo', 'universal', 'motivacional'], enabled: true };

function _getMessagePrefs() {
  try {
    const raw = localStorage.getItem('dya_msg_prefs');
    if (!raw) return { ...DEFAULT_MSG_PREFS, themes: [...DEFAULT_MSG_PREFS.themes] };
    const parsed = JSON.parse(raw);
    return {
      themes: Array.isArray(parsed.themes) ? parsed.themes : [...DEFAULT_MSG_PREFS.themes],
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
    };
  } catch (e) {
    return { ...DEFAULT_MSG_PREFS, themes: [...DEFAULT_MSG_PREFS.themes] };
  }
}

function _saveMessagePrefs(prefs) {
  localStorage.setItem('dya_msg_prefs', JSON.stringify(prefs));
}

/* ── Mensaje del día ────────────────────────────────────────────────── */
function _getTodayMessage() {
  const prefs = _getMessagePrefs();
  const dayOfMonth = new Date().getDate(); // 1-31
  const cycleDay = ((dayOfMonth - 1) % 30) + 1; // 1-30

  // Filter by user's selected themes
  let filtered = DAILY_MESSAGES.filter(m => prefs.themes.includes(m.theme));

  // Fallback to universal if no messages match
  if (filtered.length === 0) {
    filtered = DAILY_MESSAGES.filter(m => m.theme === 'universal');
  }
  // Ultimate fallback: return first message
  if (filtered.length === 0) {
    filtered = DAILY_MESSAGES;
  }

  // Try to find the exact day in the filtered set
  const exact = filtered.find(m => m.day === cycleDay);
  if (exact) return exact;

  // Otherwise pick from filtered based on cycle position
  return filtered[cycleDay % filtered.length];
}

/* ── Recordatorios personalizados ─────────────────────────────────── */
function _getReminders() {
  return JSON.parse(localStorage.getItem('dya_reminders') || '[]');
}
function _saveReminders(r) { localStorage.setItem('dya_reminders', JSON.stringify(r)); }

const DEFAULT_REMINDERS = [
  { icon: '💊', title: 'Tomar medicamentos', time: '08:00', active: false },
  { icon: '📅', title: 'Agendar cita médica', time: '10:00', active: false },
  { icon: '💧', title: 'Tomar agua', time: '09:00', active: false },
  { icon: '🏋️', title: 'Hora de ejercicio', time: '18:00', active: false },
  { icon: '😴', title: 'Prepararse para dormir', time: '22:00', active: false },
];

/* ── Helper: theme badge ────────────────────────────────────────────── */
function _themeBadge(theme) {
  const map = {
    cristianismo: { icon: '✝️', label: 'Cristianismo', color: 'bg-blue-100 text-blue-700' },
    catolicismo: { icon: '⛪', label: 'Catolicismo', color: 'bg-purple-100 text-purple-700' },
    universal: { icon: '🌟', label: 'Universal', color: 'bg-amber-100 text-amber-700' },
    motivacional: { icon: '💪', label: 'Motivacional', color: 'bg-green-100 text-green-700' },
  };
  const t = map[theme] || map.universal;
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.color}">${t.icon} ${t.label}</span>`;
}

export function renderReminders(container) {
  let reminders = _getReminders();
  if (reminders.length === 0) {
    reminders = DEFAULT_REMINDERS.map((r, i) => ({ ...r, id: 'rem_' + i }));
    _saveReminders(reminders);
  }

  const phone = localStorage.getItem('dya_phone') || '';
  const prefs = _getMessagePrefs();
  const todayMsg = _getTodayMessage();

  container.innerHTML = `
    <div class="relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%);">
      <div class="px-5 pt-11 pb-8">
        <p class="text-xs text-white/40 mb-1">MiDoctorYa</p>
        <h1 class="text-xl font-black text-white">Mis Recordatorios</h1>
        <p class="text-sm text-white/50 mt-1">Máximo ${MAX_REMINDERS} recordatorios activos</p>
      </div>
    </div>

    <!-- WhatsApp Connection -->
    <div class="px-4 -mt-4 mb-4">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-xl shadow-sm">💬</div>
          <div class="flex-1">
            <p class="text-sm font-bold text-gray-800">WhatsApp Conectado</p>
            <p class="text-[10px] text-gray-400">Recibe motivación y recordatorios</p>
          </div>
        </div>
        <div class="flex gap-2">
          <input type="tel" id="wa-phone" class="flex-1 bg-gray-50 rounded-xl py-2.5 px-3 text-sm outline-none border border-gray-200 focus:border-green-300 focus:ring-2 focus:ring-green-100 transition" placeholder="+57 300 123 4567" value="${phone}">
          <button id="wa-save" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold shadow-sm active:scale-95 transition">Guardar</button>
        </div>
        ${phone ? '<button id="wa-test" class="mt-2 w-full py-2 rounded-lg bg-green-50 text-green-600 text-xs font-bold border border-green-100 active:scale-[0.98] transition">📱 Enviar mensaje de prueba</button>' : ''}
      </div>
    </div>

    <!-- Tema de Motivación Preferences -->
    <div class="px-4 mb-4">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-xl shadow-sm">🙏</div>
          <div class="flex-1">
            <p class="text-sm font-bold text-gray-800">Temas de Motivación</p>
            <p class="text-[10px] text-gray-400">Selecciona los temas que te inspiran</p>
          </div>
        </div>
        <div class="space-y-2 mb-3">
          <label class="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <input type="checkbox" class="pref-theme accent-blue-500 w-4 h-4" data-theme="cristianismo" ${prefs.themes.includes('cristianismo') ? 'checked' : ''}>
            <span class="text-sm">✝️ Cristianismo</span>
          </label>
          <label class="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <input type="checkbox" class="pref-theme accent-purple-500 w-4 h-4" data-theme="catolicismo" ${prefs.themes.includes('catolicismo') ? 'checked' : ''}>
            <span class="text-sm">⛪ Catolicismo</span>
          </label>
          <label class="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <input type="checkbox" class="pref-theme accent-amber-500 w-4 h-4" data-theme="universal" ${prefs.themes.includes('universal') ? 'checked' : ''}>
            <span class="text-sm">🌟 Universal</span>
          </label>
          <label class="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <input type="checkbox" class="pref-theme accent-green-500 w-4 h-4" data-theme="motivacional" ${prefs.themes.includes('motivacional') ? 'checked' : ''}>
            <span class="text-sm">💪 Motivacional</span>
          </label>
        </div>
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <span class="text-sm font-semibold text-gray-700">Recibir mensajes diarios</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="pref-enabled" class="sr-only peer" ${prefs.enabled ? 'checked' : ''}>
            <div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- Today's Message Preview -->
    <div class="px-4 mb-4">
      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-bold text-indigo-800">💡 Mensaje del Día</h4>
          ${_themeBadge(todayMsg.theme)}
        </div>
        <p class="text-sm text-indigo-900 font-medium italic mb-1">"${todayMsg.text}"</p>
        <p class="text-[11px] text-indigo-500 mb-3">— ${todayMsg.author}</p>
        <button id="send-motivation" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-sm active:scale-95 transition flex items-center justify-center gap-2" ${!phone ? 'disabled style="opacity:0.5"' : ''}>
          <span>Enviar por WhatsApp</span>
        </button>
      </div>
    </div>

    <!-- Reminders List -->
    <div class="px-4 mb-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">Recordatorios</h3>
        <span class="text-xs text-gray-400">${reminders.filter(r => r.active).length}/${MAX_REMINDERS} activos</span>
      </div>
    </div>
    <div class="px-4 space-y-2 mb-4" id="rem-list">
      ${reminders.map((r, i) => `
        <div class="bg-white rounded-xl shadow-sm border ${r.active ? 'border-indigo-200' : 'border-gray-100'} p-3.5 transition-all">
          <div class="flex items-center gap-3">
            <span class="text-xl">${r.icon}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold ${r.active ? 'text-gray-800' : 'text-gray-400'}">${r.title}</p>
              <p class="text-[10px] text-gray-400">Hora: ${r.time}</p>
            </div>
            <div class="flex items-center gap-2">
              <input type="time" class="rem-time text-[10px] bg-gray-50 rounded px-1 py-0.5 border border-gray-200 w-[70px]" data-i="${i}" value="${r.time}">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="rem-toggle sr-only peer" data-i="${i}" ${r.active ? 'checked' : ''}>
                <div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Add Custom Reminder -->
    <div class="px-4 mb-8">
      <button id="add-reminder" class="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition hover:border-indigo-300 hover:text-indigo-400" ${reminders.length >= MAX_REMINDERS ? 'disabled style="opacity:0.5"' : ''}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Crear recordatorio personalizado
      </button>
    </div>
  `;

  // Event handlers
  container.querySelector('#wa-save')?.addEventListener('click', () => {
    const phone = container.querySelector('#wa-phone').value.trim();
    if (phone) {
      localStorage.setItem('dya_phone', phone);
      const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
      user.phone = phone;
      localStorage.setItem('dya_user', JSON.stringify(user));
      showToast('📱 Teléfono guardado');
      renderReminders(container);
    }
  });

  container.querySelector('#wa-test')?.addEventListener('click', () => {
    _sendWhatsApp(phone, '¡Hola! 👋 Este es un mensaje de prueba de MiDoctorYa. Tu conexión con WhatsApp está funcionando correctamente. 🎉');
  });

  container.querySelector('#send-motivation')?.addEventListener('click', () => {
    const msg = _getTodayMessage();
    _sendWhatsApp(phone, `🏥 *MiDoctorYa* - Tu dosis diaria de motivación:\n\n"${msg.text}"\n— ${msg.author}\n\n_Sigue así, vas increíble_ 🚀`);
  });

  // Preference theme checkboxes
  container.querySelectorAll('.pref-theme').forEach(cb => {
    cb.onchange = () => {
      const prefs = _getMessagePrefs();
      const theme = cb.dataset.theme;
      if (cb.checked) {
        if (!prefs.themes.includes(theme)) prefs.themes.push(theme);
      } else {
        prefs.themes = prefs.themes.filter(t => t !== theme);
      }
      _saveMessagePrefs(prefs);
      // Re-render to update today's message preview
      renderReminders(container);
    };
  });

  // Master enabled toggle
  container.querySelector('#pref-enabled')?.addEventListener('change', (e) => {
    const prefs = _getMessagePrefs();
    prefs.enabled = e.target.checked;
    _saveMessagePrefs(prefs);
    showToast(prefs.enabled ? '✅ Mensajes diarios activados' : '⏸️ Mensajes diarios pausados');
  });

  // Toggle reminders
  container.querySelectorAll('.rem-toggle').forEach(cb => {
    cb.onchange = () => {
      const reminders = _getReminders();
      const i = parseInt(cb.dataset.i);
      const activeCount = reminders.filter(r => r.active).length;
      if (!reminders[i].active && activeCount >= MAX_REMINDERS) {
        cb.checked = false;
        showToast('Máximo ' + MAX_REMINDERS + ' recordatorios activos');
        return;
      }
      reminders[i].active = cb.checked;
      _saveReminders(reminders);
      showToast(cb.checked ? '✅ Recordatorio activado' : '⏸️ Recordatorio pausado');
    };
  });

  // Change time
  container.querySelectorAll('.rem-time').forEach(inp => {
    inp.onchange = () => {
      const reminders = _getReminders();
      reminders[parseInt(inp.dataset.i)].time = inp.value;
      _saveReminders(reminders);
      showToast('🕐 Hora actualizada');
    };
  });

  // Add custom
  container.querySelector('#add-reminder')?.addEventListener('click', () => {
    const reminders = _getReminders();
    if (reminders.length >= MAX_REMINDERS) { showToast('Máximo ' + MAX_REMINDERS + ' recordatorios'); return; }
    _showAddReminder(container);
  });

  // Schedule check
  _checkReminders();
}

function _showAddReminder(container) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-fade-in';
  overlay.innerHTML = `
    <div class="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 animate-slide-up">
      <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
      <h3 class="text-lg font-bold text-gray-800 mb-4">Nuevo Recordatorio</h3>
      <input type="text" id="rem-title" class="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 mb-3" placeholder="Ej: Tomar pastillas, Cita médica...">
      <div class="flex gap-3 mb-4">
        <div class="flex-1">
          <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Hora</label>
          <input type="time" id="rem-time-new" class="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm outline-none border border-gray-200" value="09:00">
        </div>
        <div class="flex-1">
          <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Icono</label>
          <div class="flex flex-wrap gap-1">
            ${['💊','📅','🏥','🧘','📝','⏰','🎯','❤️'].map(e =>
              `<button class="rem-icon-opt w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 text-lg flex items-center justify-center" data-icon="${e}">${e}</button>`
            ).join('')}
          </div>
          <input type="hidden" id="rem-icon-val" value="⏰">
        </div>
      </div>
      <div class="flex gap-3">
        <button id="rem-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">Cancelar</button>
        <button id="rem-save-new" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-lg">Crear</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelectorAll('.rem-icon-opt').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      overlay.querySelectorAll('.rem-icon-opt').forEach(b => b.classList.remove('border-indigo-500', 'bg-indigo-50'));
      btn.classList.add('border-indigo-500', 'bg-indigo-50');
      overlay.querySelector('#rem-icon-val').value = btn.dataset.icon;
    };
  });
  overlay.querySelector('#rem-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#rem-save-new').onclick = () => {
    const title = overlay.querySelector('#rem-title').value.trim();
    const time = overlay.querySelector('#rem-time-new').value;
    const icon = overlay.querySelector('#rem-icon-val').value;
    if (!title) { showToast('Escribe un título'); return; }
    const reminders = _getReminders();
    reminders.push({ id: 'rem_' + Date.now(), icon, title, time, active: true });
    _saveReminders(reminders);
    overlay.remove();
    renderReminders(container);
    showToast(`${icon} Recordatorio creado`);
  };
}

/* ── WhatsApp via UltraMSG ───────────────────────────────────────── */
async function _sendWhatsApp(phone, message) {
  if (!phone) { showToast('Configura tu número primero'); return; }
  // Clean phone number
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

  try {
    const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: ULTRAMSG_TOKEN,
        to: cleanPhone,
        body: message,
      })
    });
    const data = await resp.json();
    if (data.sent === 'true' || data.sent === true || data.id) {
      showToast('✅ Mensaje enviado por WhatsApp');
    } else {
      showToast('⚠️ No se pudo enviar. Verifica el número.');
      console.log('UltraMSG response:', data);
    }
  } catch(e) {
    showToast('❌ Error al enviar mensaje');
    console.error('WhatsApp error:', e);
  }
}

/* ── Check reminders (runs every minute) ─────────────────────────── */
let _reminderCheckStarted = false;
function _checkReminders() {
  if (_reminderCheckStarted) return;
  _reminderCheckStarted = true;
  setInterval(() => {
    const reminders = _getReminders().filter(r => r.active);
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const phone = localStorage.getItem('dya_phone');

    reminders.forEach(r => {
      if (r.time === currentTime) {
        const notifKey = `dya_rem_${r.id}_${now.toISOString().split('T')[0]}`;
        if (localStorage.getItem(notifKey)) return; // already sent today
        localStorage.setItem(notifKey, '1');

        // Browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try { new Notification('MiDoctorYa', { body: `${r.icon} ${r.title}`, icon: 'icons/icon-192.png' }); } catch(e) {}
        }

        // WhatsApp notification
        if (phone) {
          _sendWhatsApp(phone, `${r.icon} *Recordatorio MiDoctorYa*\n\n${r.title}\n\n_${currentTime}_`);
        }
      }
    });
  }, 60000);
}
