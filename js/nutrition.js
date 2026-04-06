/* ── Nutrition Module — MiDoctorYa Lite (WhatsApp-style chat + Voice) ── */
import { t } from './i18n.js';
import { analyzeFood } from './api.js';

let _messages = [];
let _chatInitialized = false;
let _isRecording = false;
let _recognition = null;

export function renderNutrition(container) {
  if (!_chatInitialized) {
    _messages = [{ role: 'bot', text: t('nut_welcome'), time: _now() }];
    _chatInitialized = true;
  }

  container.innerHTML = `
    <!-- Header -->
    <div class="gradient-primary text-white px-5 pt-12 pb-6 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <p class="text-xs text-white/40 mb-1">MiDoctorYa</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">🥗</div>
        <div>
          <h1 class="text-xl font-bold">${t('nut_title')}</h1>
          <p class="text-xs text-white/60">Análisis nutricional inteligente</p>
        </div>
      </div>
    </div>

    <!-- Chat area -->
    <div id="chat-area" class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50" style="min-height: calc(100vh - 220px);">
      ${_messages.map(m => _bubble(m)).join('')}
    </div>

    <!-- Input area -->
    <div class="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-3 py-2 z-40">
      <div class="flex gap-2 max-w-lg mx-auto items-end">
        <!-- Camera/Photo button -->
        <button id="nut-camera" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 active:scale-95 transition hover:bg-gray-200" title="Tomar foto o subir imagen">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>
        </button>
        <input type="file" id="nut-file" accept="image/*" capture="environment" class="hidden">
        <!-- Voice note button -->
        <button id="nut-voice" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 active:scale-95 transition hover:bg-gray-200" title="Nota de voz">
          <svg id="mic-icon" class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"/></svg>
        </button>
        <div class="flex-1 relative">
          <textarea id="nut-input" rows="1" placeholder="${t('nut_placeholder')}"
            class="w-full bg-gray-100 rounded-2xl py-3 px-4 pr-10 text-sm outline-none resize-none max-h-24 focus:bg-gray-50 focus:ring-2 focus:ring-primary/30 transition"
            style="field-sizing: content;"></textarea>
        </div>
        <button id="nut-send" class="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
        </button>
      </div>
    </div>
  `;

  const chatArea = container.querySelector('#chat-area');
  const input = container.querySelector('#nut-input');
  const sendBtn = container.querySelector('#nut-send');

  // Auto-scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;

  // Send message
  const send = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    _messages.push({ role: 'user', text, time: _now() });
    chatArea.innerHTML += _bubble(_messages[_messages.length - 1]);

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    chatArea.innerHTML += _typingBubble(typingId);
    chatArea.scrollTop = chatArea.scrollHeight;

    // Call API first, fallback to smart local analysis
    const resp = await analyzeFood(text);
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();

    const botText = resp.success && resp.data
      ? (resp.data.analysis || resp.data.message || JSON.stringify(resp.data))
      : _smartAnalyze(text);

    _messages.push({ role: 'bot', text: botText, time: _now() });
    chatArea.innerHTML += _bubble(_messages[_messages.length - 1]);
    chatArea.scrollTop = chatArea.scrollHeight;
  };

  sendBtn.onclick = send;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  // Voice note with Web Speech API
  const voiceBtn = container.querySelector('#nut-voice');
  const micIcon = container.querySelector('#mic-icon');

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    voiceBtn.onclick = () => {
      if (_isRecording) {
        _stopVoice();
        return;
      }
      _startVoice(input, voiceBtn, micIcon, chatArea);
    };
  } else {
    voiceBtn.onclick = () => {
      _messages.push({ role: 'bot', text: '⚠️ Tu navegador no soporta notas de voz. Prueba con Chrome o Edge.', time: _now() });
      chatArea.innerHTML += _bubble(_messages[_messages.length - 1]);
      chatArea.scrollTop = chatArea.scrollHeight;
    };
  }

  // Camera / Photo upload
  const cameraBtn = container.querySelector('#nut-camera');
  const fileInput = container.querySelector('#nut-file');
  cameraBtn.onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imgData = e.target.result;
      const imgMsg = { role: 'user', text: `📷 Foto enviada para análisis`, time: _now(), image: imgData };
      _messages.push(imgMsg);
      chatArea.innerHTML += `
        <div class="flex justify-end animate-fade-in">
          <div class="chat-bubble-user px-3 py-2 max-w-[80%] shadow-sm">
            <img src="${imgData}" class="rounded-lg max-h-48 mb-1" alt="Comida">
            <p class="text-xs text-white/80">${_escHtml(imgMsg.text)}</p>
            <p class="text-[10px] text-white/60 text-right mt-1">${imgMsg.time}</p>
          </div>
        </div>`;
      chatArea.scrollTop = chatArea.scrollHeight;

      const typingId = 'typing-' + Date.now();
      chatArea.innerHTML += _typingBubble(typingId);
      chatArea.scrollTop = chatArea.scrollHeight;

      let botText;
      try {
        const formData = new FormData();
        formData.append('image', file);
        const resp = await fetch('http://localhost:5000/api/v1/nutrition/analyze-photo', {
          method: 'POST', body: formData
        });
        const data = await resp.json();
        botText = data.success && data.data ? (data.data.analysis || data.data.message || JSON.stringify(data.data)) : null;
      } catch(_e) {}

      if (!botText) {
        botText = `**📸 Análisis de foto**\n\n• Imagen recibida correctamente\n• Calorías estimadas: ~400 kcal\n• Para mejor precisión, describe los ingredientes en el chat\n\n💡 Escribe los ingredientes principales para un análisis más detallado.`;
      }

      const typing = document.getElementById(typingId);
      if (typing) typing.remove();

      _messages.push({ role: 'bot', text: botText, time: _now() });
      chatArea.innerHTML += _bubble(_messages[_messages.length - 1]);
      chatArea.scrollTop = chatArea.scrollHeight;
    };
    reader.readAsDataURL(file);
  };
}

/* ── Voice Recognition ───────────────────────────────────────────── */
function _startVoice(input, voiceBtn, micIcon, chatArea) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  _recognition = new SpeechRecognition();
  _recognition.lang = 'es-CO';
  _recognition.continuous = false;
  _recognition.interimResults = true;

  _isRecording = true;
  voiceBtn.classList.remove('bg-gray-100');
  voiceBtn.classList.add('bg-red-500');
  micIcon.classList.remove('text-gray-500');
  micIcon.classList.add('text-white');

  // Show recording indicator
  _messages.push({ role: 'bot', text: '🎙️ Escuchando... Habla ahora.', time: _now() });
  chatArea.innerHTML += _bubble(_messages[_messages.length - 1]);
  chatArea.scrollTop = chatArea.scrollHeight;

  let finalTranscript = '';

  _recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    if (interim) input.value = finalTranscript + interim;
  };

  _recognition.onend = () => {
    _isRecording = false;
    voiceBtn.classList.add('bg-gray-100');
    voiceBtn.classList.remove('bg-red-500');
    micIcon.classList.add('text-gray-500');
    micIcon.classList.remove('text-white');

    // Remove "listening" message
    if (_messages.length && _messages[_messages.length - 1].text.includes('Escuchando')) {
      _messages.pop();
    }

    if (finalTranscript.trim()) {
      input.value = finalTranscript.trim();
      // Auto-send
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    } else {
      // Re-render to remove listening indicator
      const chatArea2 = document.getElementById('chat-area');
      if (chatArea2) chatArea2.innerHTML = _messages.map(m => _bubble(m)).join('');
    }
  };

  _recognition.onerror = (event) => {
    _isRecording = false;
    voiceBtn.classList.add('bg-gray-100');
    voiceBtn.classList.remove('bg-red-500');
    micIcon.classList.add('text-gray-500');
    micIcon.classList.remove('text-white');

    if (_messages.length && _messages[_messages.length - 1].text.includes('Escuchando')) {
      _messages.pop();
    }
    let errMsg = '⚠️ No se pudo capturar el audio.';
    if (event.error === 'not-allowed') errMsg = '⚠️ Permiso de micrófono denegado. Habilítalo en la configuración del navegador.';
    if (event.error === 'no-speech') errMsg = '⚠️ No se detectó voz. Intenta de nuevo.';
    _messages.push({ role: 'bot', text: errMsg, time: _now() });
    const chatArea2 = document.getElementById('chat-area');
    if (chatArea2) {
      chatArea2.innerHTML = _messages.map(m => _bubble(m)).join('');
      chatArea2.scrollTop = chatArea2.scrollHeight;
    }
  };

  _recognition.start();
}

function _stopVoice() {
  if (_recognition) {
    _recognition.stop();
  }
  _isRecording = false;
}

/* ── Chat Bubbles ────────────────────────────────────────────────── */
function _typingBubble(id) {
  return `<div id="${id}" class="flex gap-2 items-end animate-fade-in">
    <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs">🥗</div>
    <div class="chat-bubble-bot px-4 py-3 shadow-sm">
      <div class="flex gap-1"><span class="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0ms"></span><span class="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style="animation-delay:150ms"></span><span class="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style="animation-delay:300ms"></span></div>
    </div>
  </div>`;
}

function _bubble(msg) {
  if (msg.role === 'user') {
    return `
      <div class="flex justify-end animate-fade-in">
        <div class="chat-bubble-user px-4 py-3 max-w-[80%] shadow-sm">
          <p class="text-sm leading-relaxed whitespace-pre-wrap">${_escHtml(msg.text)}</p>
          <p class="text-[10px] text-white/60 text-right mt-1">${msg.time}</p>
        </div>
      </div>`;
  }
  return `
    <div class="flex gap-2 items-end animate-fade-in">
      <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0">🥗</div>
      <div class="chat-bubble-bot px-4 py-3 max-w-[80%] shadow-sm">
        <p class="text-sm leading-relaxed whitespace-pre-wrap">${_formatBot(msg.text)}</p>
        <p class="text-[10px] text-gray-400 mt-1">${msg.time}</p>
      </div>
    </div>`;
}

function _formatBot(text) {
  return _escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•] (.+)$/gm, '<span class="flex gap-1"><span class="text-primary">•</span><span>$1</span></span>');
}

function _escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════════════════════════
   ALLERGEN MAP & SAFETY CHECK
   ══════════════════════════════════════════════════════════════════ */

const ALLERGEN_MAP = {
  mani: ['mani', 'cacahuate', 'cacahuete', 'peanut'],
  'frutos_secos': ['almendra', 'nuez', 'nueces', 'almendras', 'mani', 'avellana', 'pistacho', 'cashew'],
  mariscos: ['camaron', 'langosta', 'cangrejo', 'mariscos', 'camarones', 'pulpo', 'calamar'],
  lactosa: ['leche', 'queso', 'yogur', 'yogurt', 'crema', 'mantequilla', 'helado', 'lacteo'],
  gluten: ['pan', 'pasta', 'trigo', 'galleta', 'galletas', 'pizza', 'tortilla', 'arepa', 'avena'],
  huevo: ['huevo', 'huevos', 'tortilla', 'mayonesa'],
  soya: ['soya', 'tofu', 'edamame', 'soja'],
};

const ALLERGEN_LABELS = {
  mani: 'Maní',
  frutos_secos: 'Frutos secos',
  mariscos: 'Mariscos',
  lactosa: 'Lácteos / Lactosa',
  gluten: 'Gluten',
  huevo: 'Huevo',
  soya: 'Soya',
};

function _getUserAllergyData() {
  try {
    const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
    const email = user.email || '';
    const profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + email) || '{}');
    const allergies = Array.isArray(profile.allergies) ? profile.allergies : [];
    const allergiesOther = profile.allergiesOther || '';
    const recs = JSON.parse(localStorage.getItem('dya_patient_recs_' + email) || '[]');
    return { allergies, allergiesOther, recs, email };
  } catch (_e) {
    return { allergies: [], allergiesOther: '', recs: [], email: '' };
  }
}

/* ── Condition-based food rules ─────────────────────────────────────── */
const DEFAULT_FOOD_RULES = {
  'Diabetes': {
    recommended: ['Avena', 'Quinoa', 'Legumbres', 'Verduras verdes', 'Canela', 'Frutos secos (moderado)'],
    notRecommended: ['Azúcar refinada', 'Gaseosas', 'Pan blanco', 'Arroz blanco en exceso', 'Jugos procesados', 'Dulces']
  },
  'Hipertensión': {
    recommended: ['Plátano', 'Espinaca', 'Yogur bajo en grasa', 'Salmón', 'Ajo', 'Avena'],
    notRecommended: ['Sal en exceso', 'Embutidos', 'Enlatados', 'Snacks salados', 'Alcohol', 'Quesos curados']
  },
  'Enfermedad renal': {
    recommended: ['Clara de huevo', 'Manzana', 'Repollo', 'Coliflor', 'Arándanos'],
    notRecommended: ['Sal', 'Potasio alto (plátano, papa, tomate)', 'Fósforo (lácteos, cola)', 'Proteína en exceso', 'Frutos secos']
  },
  'Asma': {
    recommended: ['Frutas ricas en vitamina C', 'Pescado (omega-3)', 'Jengibre', 'Cúrcuma'],
    notRecommended: ['Sulfitos (vino, frutos secos procesados)', 'Conservantes', 'Alimentos muy fríos']
  },
  'Enfermedad cardíaca': {
    recommended: ['Aceite de oliva', 'Pescado azul', 'Nueces', 'Avena', 'Frutas rojas'],
    notRecommended: ['Grasas trans', 'Frituras', 'Embutidos', 'Exceso de sal', 'Alcohol']
  }
};

function _getConditionFoodRules() {
  const result = { recommended: [], notRecommended: [] };
  const conditionMatches = []; // track which conditions matched
  try {
    const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
    const email = user.email || '';
    if (!email) return { ...result, conditions: [] };

    const profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + email) || '{}');
    const conditions = Array.isArray(profile.medicalConditions) ? profile.medicalConditions : [];
    if (!conditions.length) return { ...result, conditions: [] };

    // Try admin-configured rules first, fall back to defaults
    let foodRules;
    try {
      foodRules = JSON.parse(localStorage.getItem('dya_config_food_rules'));
    } catch (_e) { /* ignore */ }
    if (!foodRules || typeof foodRules !== 'object') {
      foodRules = DEFAULT_FOOD_RULES;
    }

    const recSet = new Set();
    const notRecSet = new Set();

    for (const condition of conditions) {
      const rules = foodRules[condition];
      if (!rules) continue;
      conditionMatches.push(condition);
      if (Array.isArray(rules.recommended)) {
        rules.recommended.forEach(f => { if (!recSet.has(f)) { recSet.add(f); result.recommended.push({ food: f, condition }); } });
      }
      if (Array.isArray(rules.notRecommended)) {
        rules.notRecommended.forEach(f => { if (!notRecSet.has(f)) { notRecSet.add(f); result.notRecommended.push({ food: f, condition }); } });
      }
    }
    result.conditions = conditionMatches;
  } catch (_e) {
    result.conditions = [];
  }
  return result;
}

function _checkConditionFoods(foodMatches, notRecommendedList) {
  if (!notRecommendedList || !notRecommendedList.length) return [];
  const warnings = [];
  for (const food of foodMatches) {
    const foodName = (food.name || food.key || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const foodKey = (food.key || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const entry of notRecommendedList) {
      const notRecNorm = entry.food.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Check if the not-recommended keyword appears in the food name/key
      const notRecWords = notRecNorm.split(/[\s,()]+/).filter(w => w.length > 2);
      for (const word of notRecWords) {
        if (foodName.includes(word) || foodKey.includes(word)) {
          warnings.push({ food: food.name || food.key, rule: entry.food, condition: entry.condition });
          break;
        }
      }
    }
  }
  return warnings;
}

function _buildConditionWarning(conditionWarnings) {
  if (!conditionWarnings || !conditionWarnings.length) return '';
  const grouped = {};
  for (const w of conditionWarnings) {
    if (!grouped[w.condition]) grouped[w.condition] = [];
    grouped[w.condition].push(w);
  }
  let text = '';
  for (const [condition, items] of Object.entries(grouped)) {
    const lines = items.map(w => '• ' + w.food + ' — ' + w.rule);
    text += '\u26a0\ufe0f **ALERTA POR CONDICI\u00d3N M\u00c9DICA**\n' +
      'Tienes ' + condition + ' \u2014 estos alimentos no son recomendados:\n' +
      lines.join('\n') + '\n\n';
  }
  return text + '---\n\n';
}

function _buildConditionRecommendations(conditionRules) {
  if (!conditionRules.conditions || !conditionRules.conditions.length) return '';
  if (!conditionRules.recommended || !conditionRules.recommended.length) return '';
  const grouped = {};
  for (const r of conditionRules.recommended) {
    if (!grouped[r.condition]) grouped[r.condition] = [];
    grouped[r.condition].push(r.food);
  }
  let text = '\n\n';
  for (const [condition, foods] of Object.entries(grouped)) {
    text += '\u2705 **Alimentos recomendados para tu condici\u00f3n (' + condition + '):**\n';
    text += '\u2022 ' + foods.join(', ') + '\n';
  }
  return text;
}

function _checkAllergies(foodMatches, userAllergies) {
  if (!userAllergies || userAllergies.length === 0) return [];
  const warnings = [];
  const normalizedAllergies = userAllergies
    .filter(a => a && a !== 'ninguna')
    .map(a => a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, ''));

  if (normalizedAllergies.length === 0) return [];

  for (const food of foodMatches) {
    const foodKey = (food.key || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const foodName = (food.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const userAllergen of normalizedAllergies) {
      const mapEntry = ALLERGEN_MAP[userAllergen];
      if (!mapEntry) continue;
      for (const keyword of mapEntry) {
        const normKw = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (foodKey.includes(normKw) || foodName.includes(normKw)) {
          warnings.push({ food: food.name || food.key, allergen: ALLERGEN_LABELS[userAllergen] || userAllergen });
          break;
        }
      }
    }
  }
  return warnings;
}

function _checkDoctorDietRestrictions(recs) {
  if (!Array.isArray(recs) || recs.length === 0) return [];
  return recs.filter(r => r && r.type === 'Restricción alimenticia');
}

function _buildAllergyWarning(allergyWarnings) {
  if (!allergyWarnings || allergyWarnings.length === 0) return '';
  const lines = allergyWarnings.map(w => '• ' + w.food + ' → contiene ' + w.allergen);
  return '⚠️🚨 **ALERTA DE ALERGIA**\n\nLos siguientes alimentos contienen alérgenos que has reportado:\n' +
    lines.join('\n') +
    '\n\n**NO consumas estos alimentos sin consultar a tu médico.**\n\n---\n\n';
}

function _buildDoctorWarning(restrictions) {
  if (!restrictions || restrictions.length === 0) return '';
  const lines = restrictions.map(r => '⚕️ **Nota de tu médico:**\nTu doctor ha indicado: "' + (r.description || r.desc || r.text || '') + '"');
  return lines.join('\n\n') + '\n\n---\n\n';
}

/* ══════════════════════════════════════════════════════════════════
   SMART NUTRITION ANALYSIS — Comprehensive offline food database
   ══════════════════════════════════════════════════════════════════ */

const FOOD_DB = {
  // ── Granos y cereales ──
  arroz:          { name: 'Arroz blanco (1 taza, 160g)',         cal: 206, carb: 45, prot: 4.3, grasa: 0.4, fibra: 0.6 },
  'arroz integral': { name: 'Arroz integral (1 taza, 160g)',     cal: 216, carb: 45, prot: 5, grasa: 1.8, fibra: 3.5 },
  pasta:          { name: 'Pasta cocida (200g)',                  cal: 262, carb: 50, prot: 9, grasa: 1.5, fibra: 2.5 },
  pan:            { name: 'Pan blanco (2 rebanadas, 60g)',        cal: 160, carb: 30, prot: 5, grasa: 1.5, fibra: 1.2 },
  'pan integral': { name: 'Pan integral (2 rebanadas, 60g)',     cal: 140, carb: 24, prot: 7, grasa: 2, fibra: 4 },
  arepa:          { name: 'Arepa de maíz (1 unidad, 120g)',      cal: 200, carb: 38, prot: 4, grasa: 3, fibra: 2 },
  avena:          { name: 'Avena cocida (1 taza, 240g)',          cal: 154, carb: 27, prot: 6, grasa: 2.6, fibra: 4 },
  tortilla:       { name: 'Tortilla de maíz (2 unidades)',       cal: 140, carb: 28, prot: 3.5, grasa: 1.5, fibra: 3 },
  quinoa:         { name: 'Quinoa cocida (1 taza, 185g)',         cal: 222, carb: 39, prot: 8, grasa: 3.5, fibra: 5 },
  yuca:           { name: 'Yuca cocida (150g)',                   cal: 240, carb: 57, prot: 2, grasa: 0.4, fibra: 2.8 },
  papa:           { name: 'Papa cocida (1 mediana, 150g)',        cal: 130, carb: 30, prot: 3, grasa: 0.2, fibra: 2.5 },
  platano:        { name: 'Plátano maduro (1 unidad, 150g)',     cal: 180, carb: 47, prot: 1.3, grasa: 0.4, fibra: 2.3 },
  'platano verde': { name: 'Plátano verde cocido (150g)',        cal: 160, carb: 40, prot: 1, grasa: 0.3, fibra: 2 },
  patacon:        { name: 'Patacón (2 unidades)',                 cal: 280, carb: 42, prot: 2, grasa: 12, fibra: 2 },
  empanada:       { name: 'Empanada (1 unidad)',                  cal: 300, carb: 28, prot: 10, grasa: 16, fibra: 1.5 },
  tamal:          { name: 'Tamal colombiano (1 unidad)',          cal: 450, carb: 50, prot: 18, grasa: 20, fibra: 3 },

  // ── Proteínas ──
  pollo:          { name: 'Pechuga de pollo (150g)',              cal: 165, carb: 0, prot: 31, grasa: 3.6, fibra: 0 },
  carne:          { name: 'Carne de res magra (150g)',            cal: 250, carb: 0, prot: 26, grasa: 15, fibra: 0 },
  cerdo:          { name: 'Carne de cerdo (150g)',                cal: 240, carb: 0, prot: 27, grasa: 14, fibra: 0 },
  pescado:        { name: 'Filete de pescado (150g)',             cal: 140, carb: 0, prot: 28, grasa: 2.5, fibra: 0 },
  salmon:         { name: 'Salmón (150g)',                        cal: 280, carb: 0, prot: 30, grasa: 17, fibra: 0 },
  atun:           { name: 'Atún en agua (1 lata, 120g)',          cal: 130, carb: 0, prot: 29, grasa: 1, fibra: 0 },
  huevo:          { name: 'Huevo entero (1 unidad, 50g)',         cal: 78, carb: 0.6, prot: 6, grasa: 5.3, fibra: 0 },
  chicharron:     { name: 'Chicharrón (100g)',                    cal: 540, carb: 0, prot: 36, grasa: 43, fibra: 0 },
  chorizo:        { name: 'Chorizo (1 unidad, 80g)',              cal: 270, carb: 2, prot: 14, grasa: 23, fibra: 0 },
  morcilla:       { name: 'Morcilla (1 unidad, 80g)',             cal: 310, carb: 5, prot: 12, grasa: 28, fibra: 0.5 },
  tofu:           { name: 'Tofu firme (150g)',                    cal: 120, carb: 3, prot: 15, grasa: 6, fibra: 1 },
  lentejas:       { name: 'Lentejas cocidas (1 taza, 200g)',     cal: 230, carb: 40, prot: 18, grasa: 0.8, fibra: 15.6 },
  frijoles:       { name: 'Frijoles cocidos (1 taza, 180g)',     cal: 225, carb: 40, prot: 15, grasa: 1, fibra: 12 },
  garbanzos:      { name: 'Garbanzos cocidos (1 taza, 165g)',    cal: 269, carb: 45, prot: 14.5, grasa: 4.2, fibra: 12.5 },

  // ── Lácteos ──
  leche:          { name: 'Leche entera (1 vaso, 250ml)',         cal: 150, carb: 12, prot: 8, grasa: 8, fibra: 0 },
  yogur:          { name: 'Yogur natural (200g)',                  cal: 120, carb: 14, prot: 8, grasa: 4, fibra: 0 },
  queso:          { name: 'Queso fresco (50g)',                    cal: 130, carb: 1, prot: 9, grasa: 10, fibra: 0 },

  // ── Frutas ──
  fruta:          { name: 'Porción de fruta variada (150g)',      cal: 75, carb: 19, prot: 1, grasa: 0.3, fibra: 2.5 },
  manzana:        { name: 'Manzana (1 mediana, 180g)',            cal: 95, carb: 25, prot: 0.5, grasa: 0.3, fibra: 4.4 },
  banano:         { name: 'Banano (1 mediano, 120g)',             cal: 105, carb: 27, prot: 1.3, grasa: 0.4, fibra: 3.1 },
  mango:          { name: 'Mango (1 taza, 165g)',                 cal: 100, carb: 25, prot: 1.4, grasa: 0.6, fibra: 2.6 },
  papaya:         { name: 'Papaya (1 taza, 145g)',                cal: 62, carb: 16, prot: 0.7, grasa: 0.4, fibra: 2.5 },
  guayaba:        { name: 'Guayaba (2 medianas, 110g)',           cal: 75, carb: 16, prot: 2.8, grasa: 1, fibra: 6 },
  aguacate:       { name: 'Aguacate (½ unidad, 100g)',            cal: 160, carb: 8.5, prot: 2, grasa: 14.7, fibra: 6.7 },
  naranja:        { name: 'Naranja (1 mediana, 150g)',            cal: 70, carb: 17, prot: 1.3, grasa: 0.2, fibra: 3.1 },
  limon:          { name: 'Limón (jugo de 1)',                     cal: 10, carb: 3, prot: 0.2, grasa: 0, fibra: 0.1 },
  piña:           { name: 'Piña (1 taza, 165g)',                   cal: 82, carb: 22, prot: 0.9, grasa: 0.2, fibra: 2.3 },
  sandia:         { name: 'Sandía (1 taza, 150g)',                 cal: 46, carb: 11.5, prot: 0.9, grasa: 0.2, fibra: 0.6 },
  fresa:          { name: 'Fresas (1 taza, 150g)',                 cal: 49, carb: 12, prot: 1, grasa: 0.5, fibra: 3 },
  lulo:           { name: 'Lulo (2 unidades, 100g)',               cal: 35, carb: 8, prot: 0.7, grasa: 0.2, fibra: 1.1 },
  maracuya:       { name: 'Maracuyá (pulpa, 100g)',                cal: 68, carb: 16, prot: 2.2, grasa: 0.4, fibra: 10.4 },
  granadilla:     { name: 'Granadilla (2 unidades)',               cal: 50, carb: 12, prot: 1, grasa: 0.3, fibra: 1 },

  // ── Verduras y ensaladas ──
  ensalada:       { name: 'Ensalada mixta (200g)',                 cal: 120, carb: 12, prot: 3, grasa: 6, fibra: 4 },
  tomate:         { name: 'Tomate (1 mediano, 150g)',              cal: 27, carb: 6, prot: 1.3, grasa: 0.3, fibra: 1.8 },
  cebolla:        { name: 'Cebolla (1 mediana, 110g)',             cal: 44, carb: 10, prot: 1.2, grasa: 0.1, fibra: 1.7 },
  zanahoria:      { name: 'Zanahoria (1 mediana, 75g)',            cal: 30, carb: 7, prot: 0.7, grasa: 0.2, fibra: 2.1 },
  brocoli:        { name: 'Brócoli cocido (1 taza, 155g)',         cal: 55, carb: 11, prot: 3.7, grasa: 0.6, fibra: 5.1 },
  espinaca:       { name: 'Espinaca (1 taza, 30g)',                cal: 7, carb: 1.1, prot: 0.9, grasa: 0.1, fibra: 0.7 },

  // ── Bebidas ──
  cafe:           { name: 'Café negro (1 taza)',                   cal: 5, carb: 0, prot: 0.3, grasa: 0, fibra: 0 },
  'cafe con leche': { name: 'Café con leche (1 taza)',             cal: 70, carb: 6, prot: 4, grasa: 3.5, fibra: 0 },
  jugo:           { name: 'Jugo de fruta natural (250ml)',         cal: 120, carb: 28, prot: 1, grasa: 0.3, fibra: 0.5 },
  gaseosa:        { name: 'Gaseosa (350ml)',                       cal: 140, carb: 39, prot: 0, grasa: 0, fibra: 0 },
  cerveza:        { name: 'Cerveza (330ml)',                       cal: 150, carb: 13, prot: 1.6, grasa: 0, fibra: 0 },
  agua:           { name: 'Agua (250ml)',                           cal: 0, carb: 0, prot: 0, grasa: 0, fibra: 0 },
  'agua de panela': { name: 'Agua de panela (250ml)',              cal: 110, carb: 27, prot: 0.3, grasa: 0, fibra: 0 },
  aguapanela:     { name: 'Aguapanela (250ml)',                    cal: 110, carb: 27, prot: 0.3, grasa: 0, fibra: 0 },
  chocolate:      { name: 'Chocolate caliente (250ml)',            cal: 190, carb: 26, prot: 8, grasa: 6, fibra: 1 },

  // ── Snacks y otros ──
  almendras:      { name: 'Almendras (30g, ~23 unidades)',         cal: 164, carb: 6, prot: 6, grasa: 14, fibra: 3.5 },
  mani:           { name: 'Maní (30g)',                             cal: 170, carb: 5, prot: 7, grasa: 14, fibra: 2.5 },
  'chocolate oscuro': { name: 'Chocolate oscuro 70% (30g)',        cal: 170, carb: 13, prot: 2, grasa: 12, fibra: 3 },
  galletas:       { name: 'Galletas (4 unidades)',                  cal: 200, carb: 28, prot: 2.5, grasa: 9, fibra: 0.5 },
  helado:         { name: 'Helado (1 bola, 70g)',                   cal: 140, carb: 16, prot: 2.5, grasa: 7, fibra: 0.5 },

  // ── Comidas típicas colombianas ──
  ajiaco:         { name: 'Ajiaco santafereño (1 plato, 400ml)',   cal: 380, carb: 45, prot: 25, grasa: 12, fibra: 5 },
  sancocho:       { name: 'Sancocho (1 plato, 400ml)',             cal: 420, carb: 48, prot: 28, grasa: 14, fibra: 4 },
  'bandeja paisa': { name: 'Bandeja paisa (1 plato completo)',     cal: 1200, carb: 95, prot: 55, grasa: 65, fibra: 12 },
  bandeja:        { name: 'Bandeja paisa (1 plato completo)',      cal: 1200, carb: 95, prot: 55, grasa: 65, fibra: 12 },
  cazuela:        { name: 'Cazuela de frijoles (1 plato)',         cal: 350, carb: 52, prot: 20, grasa: 8, fibra: 14 },
  changua:        { name: 'Changua (1 tazón)',                     cal: 220, carb: 14, prot: 12, grasa: 13, fibra: 0.5 },
  tamales:        { name: 'Tamales tolimenses (1 unidad)',         cal: 480, carb: 55, prot: 20, grasa: 22, fibra: 3 },
  lechona:        { name: 'Lechona tolimense (200g)',              cal: 550, carb: 35, prot: 30, grasa: 32, fibra: 2 },
  'caldo de costilla': { name: 'Caldo de costilla (1 tazón)',     cal: 280, carb: 18, prot: 20, grasa: 14, fibra: 2 },
  buñuelo:        { name: 'Buñuelo (2 unidades)',                   cal: 280, carb: 30, prot: 6, grasa: 15, fibra: 0.5 },
  pandebono:      { name: 'Pandebono (2 unidades)',                 cal: 260, carb: 34, prot: 8, grasa: 10, fibra: 0.5 },
  almojabana:     { name: 'Almojábana (2 unidades)',                cal: 240, carb: 30, prot: 7, grasa: 10, fibra: 0.5 },

  // ── Comidas típicas mexicanas ──
  taco:           { name: 'Tacos (3 unidades)',                     cal: 450, carb: 42, prot: 24, grasa: 22, fibra: 4 },
  burrito:        { name: 'Burrito (1 unidad)',                     cal: 500, carb: 55, prot: 22, grasa: 20, fibra: 5 },
  enchilada:      { name: 'Enchiladas (3 unidades)',                cal: 480, carb: 40, prot: 24, grasa: 24, fibra: 4 },
  quesadilla:     { name: 'Quesadilla (1 unidad)',                  cal: 350, carb: 30, prot: 16, grasa: 18, fibra: 2 },
  pozole:         { name: 'Pozole (1 plato, 350ml)',                cal: 340, carb: 35, prot: 22, grasa: 12, fibra: 4 },
  chilaquiles:    { name: 'Chilaquiles (1 plato)',                   cal: 420, carb: 38, prot: 18, grasa: 22, fibra: 3 },
  'elote':        { name: 'Elote/mazorca (1 unidad)',                cal: 130, carb: 27, prot: 5, grasa: 2, fibra: 3 },
  guacamole:      { name: 'Guacamole (100g)',                        cal: 160, carb: 8, prot: 2, grasa: 14, fibra: 6 },

  // ── Comidas internacionales comunes ──
  pizza:          { name: 'Pizza (2 porciones)',                     cal: 560, carb: 60, prot: 24, grasa: 24, fibra: 3 },
  hamburguesa:    { name: 'Hamburguesa con pan (1 unidad)',          cal: 550, carb: 40, prot: 28, grasa: 30, fibra: 2 },
  'perro caliente': { name: 'Perro caliente (1 unidad)',            cal: 320, carb: 24, prot: 12, grasa: 20, fibra: 1 },
  hotdog:         { name: 'Hot dog (1 unidad)',                      cal: 320, carb: 24, prot: 12, grasa: 20, fibra: 1 },
  sushi:          { name: 'Sushi (8 piezas)',                        cal: 350, carb: 52, prot: 14, grasa: 8, fibra: 2 },
  sandwich:       { name: 'Sándwich mixto (1 unidad)',               cal: 380, carb: 35, prot: 18, grasa: 18, fibra: 2 },
  sopa:           { name: 'Sopa de verduras (1 tazón, 300ml)',      cal: 120, carb: 18, prot: 5, grasa: 3, fibra: 4 },
  crema:          { name: 'Crema de verduras (1 tazón)',             cal: 180, carb: 20, prot: 5, grasa: 8, fibra: 3 },
};

/* ── Health condition responses ──────────────────────────────────── */
const HEALTH_TOPICS = {
  diabetes: {
    keywords: ['diabetes', 'diabetico', 'diabética', 'azucar en sangre', 'glucosa alta', 'insulina', 'glucemia'],
    response: `**🩺 Alimentación y Diabetes**

La alimentación es clave para controlar la diabetes. Aquí van recomendaciones basadas en evidencia:

**Principios generales (ADA — American Diabetes Association):**
• Prefiere carbohidratos complejos: avena, quinoa, arroz integral, legumbres
• Evita azúcares simples: gaseosas, dulces, pan blanco, jugos procesados
• Incluye fibra en cada comida — estabiliza el azúcar (25-30g/día)
• Proteína en cada comida — pollo, pescado, huevos, legumbres
• Grasas saludables: aguacate, aceite de oliva, nueces
• Porciones controladas — tu mano es tu mejor guía

**Alimentos aliados:**
• Canela (puede ayudar a bajar glucosa)
• Vegetales verdes (casi 0 impacto glucémico)
• Legumbres (bajo índice glucémico + fibra)
• Frutos secos (30g/día como snack)

**Evitar o limitar:**
• Bebidas azucaradas y jugos procesados
• Pan blanco, arroz blanco en exceso
• Frituras y alimentos ultraprocesados
• Alcohol en exceso

⚠️ **IMPORTANTE**: Estas son recomendaciones generales. Consulta siempre con tu médico o nutricionista para un plan personalizado según tu tipo de diabetes y medicación.

💡 *Fuentes: ADA, OMS, Harvard T.H. Chan School of Public Health*`
  },

  hipertension: {
    keywords: ['hipertension', 'presion alta', 'tension alta', 'presión arterial'],
    response: `**🩺 Alimentación e Hipertensión**

La dieta DASH (Dietary Approaches to Stop Hypertension) es el estándar de oro:

**Aumentar:**
• Frutas y verduras (8-10 porciones/día)
• Potasio: plátano, papa, tomate, naranja
• Lácteos bajos en grasa
• Granos integrales y legumbres
• Pescado (omega-3 antiinflamatorio)

**Reducir:**
• Sodio: máx 1500mg/día (menos de 1 cucharadita de sal)
• Embutidos, enlatados y snacks salados
• Gaseosas y alcohol
• Grasas saturadas

**Tips prácticos:**
• Cocina con especias en vez de sal
• Lee etiquetas: busca "bajo en sodio"
• Un vaso de agua con limón en ayunas
• Camina 30 min/día — complementa la dieta

⚠️ **IMPORTANTE**: La alimentación complementa pero NO reemplaza el tratamiento médico.

💡 *Fuentes: NIH/DASH, AHA, OMS*`
  },

  colesterol: {
    keywords: ['colesterol', 'colesterol alto', 'trigliceridos', 'triglicéridos'],
    response: `**🩺 Alimentación y Colesterol**

**Para bajar colesterol LDL ("malo"):**
• Avena diaria (beta-glucanos atrapan colesterol)
• Legumbres 3-4 veces por semana
• Nueces y almendras (30g/día)
• Aceite de oliva extra virgen
• Pescados grasos: salmón, sardinas (omega-3)
• Frutas ricas en pectina: manzana, cítricos

**Para subir HDL ("bueno"):**
• Ejercicio regular (30 min/día)
• Aguacate y aceite de oliva
• Pescado azul 2x/semana

**Evitar:**
• Frituras y comida rápida
• Carnes procesadas (embutidos, salchichas)
• Mantequilla y margarinas con grasas trans
• Bollería industrial

⚠️ **IMPORTANTE**: Si tomas medicación para el colesterol, sigue las indicaciones de tu médico.

💡 *Fuentes: AHA, Mayo Clinic, Harvard Health*`
  },

  gastritis: {
    keywords: ['gastritis', 'acidez', 'reflujo', 'estomago', 'estómago', 'ulcera', 'úlcera'],
    response: `**🩺 Alimentación y Gastritis**

**Alimentos recomendados:**
• Papa cocida (efecto protector gástrico)
• Avena (fibra soluble que protege)
• Plátano maduro (alcalinizante)
• Manzana (pectina protectora)
• Pollo y pescado a la plancha
• Verduras cocidas (zanahoria, calabacín)
• Jengibre (antiinflamatorio natural)

**Evitar:**
• Café en exceso, alcohol, gaseosas
• Alimentos muy ácidos (tomate, cítricos en exceso)
• Picante intenso, ají, pimienta
• Frituras y alimentos muy grasosos
• Comer muy rápido o saltarse comidas

**Hábitos que ayudan:**
• Comer 5 veces al día en porciones pequeñas
• No acostarse justo después de comer
• Masticar bien y comer despacio
• Cenar ligero 2-3h antes de dormir

⚠️ **IMPORTANTE**: Si los síntomas persisten, consulta un gastroenterólogo.

💡 *Fuentes: ACG, Mayo Clinic, NIDDK*`
  },

  peso: {
    keywords: ['bajar de peso', 'adelgazar', 'perder peso', 'dieta', 'engordar', 'subir de peso', 'gordura', 'obesidad', 'sobrepeso'],
    response: `**🩺 Peso Saludable — Sin Dietas Extremas**

Las dietas restrictivas fallan 95% de las veces (APA). La clave es hacer cambios sostenibles:

**Principios basados en ciencia:**
• No elimines grupos alimenticios — sustituye
• Come más fibra y proteína (sacian más)
• Reduce ultraprocesados gradualmente
• Muévete: 150 min/semana de actividad moderada
• Duerme bien (7-8h) — la falta de sueño engorda

**Sustituciones inteligentes:**
• Arroz blanco → integral o quinoa
• Pan blanco → integral
• Gaseosa → agua con fruta
• Fritura → horno o plancha
• Dulces → frutas con yogur

**Lo que SÍ funciona según la ciencia:**
• Comer despacio (20 min mínimo por comida)
• Plato equilibrado: ½ verduras, ¼ proteína, ¼ carbohidrato
• Hidratación (a veces confundimos sed con hambre)
• Frutos secos como snack (30g)
• Cocinar en casa más seguido

⚠️ **IMPORTANTE**: Las dietas extremas solo son apropiadas bajo prescripción médica. Consulta un nutricionista para un plan personalizado.

💡 *Fuentes: OMS, APA, Harvard Healthy Eating Plate, JAMA*`
  },

  embarazo: {
    keywords: ['embarazo', 'embarazada', 'prenatal', 'gestacion', 'gestación'],
    response: `**🩺 Alimentación en el Embarazo**

**Nutrientes esenciales:**
• Ácido fólico: espinaca, legumbres, brócoli (400-800mcg/día)
• Hierro: carne roja magra, lentejas, espinaca (27mg/día)
• Calcio: lácteos, brócoli, sardinas (1000mg/día)
• Omega-3: pescado (bajo en mercurio), nueces
• Proteína: aumentar ~25g/día extra

**Alimentos aliados:**
• Huevo (colina para desarrollo cerebral)
• Aguacate (folato + grasas buenas)
• Yogur (calcio + probióticos)
• Avena (fibra para evitar estreñimiento)

**Evitar:**
• Pescado alto en mercurio (pez espada, tiburón)
• Carnes y huevos crudos
• Lácteos no pasteurizados
• Alcohol (cero tolerancia)
• Exceso de cafeína (máx 200mg/día)

⚠️ **IMPORTANTE**: Sigue las indicaciones de tu obstetra. Los suplementos prenatales son complemento, no reemplazo de buena alimentación.

💡 *Fuentes: ACOG, OMS, NIH*`
  },
};

/* ── Smart analysis engine ───────────────────────────────────────── */
function _smartAnalyze(text) {
  const lower = _normalize(text);

  // Load user allergy data and doctor recommendations at the TOP
  const { allergies, allergiesOther, recs } = _getUserAllergyData();
  const allAllergies = [...allergies];
  if (allergiesOther && allergiesOther.trim()) {
    allergiesOther.split(',').forEach(a => { if (a.trim()) allAllergies.push(a.trim()); });
  }
  const dietRestrictions = _checkDoctorDietRestrictions(recs);
  const conditionRules = _getConditionFoodRules();

  // 1. Check health topics first
  for (const [, topic] of Object.entries(HEALTH_TOPICS)) {
    if (topic.keywords.some(kw => lower.includes(kw))) {
      return topic.response;
    }
  }

  // 2. Check for greetings
  if (_isGreeting(lower)) {
    const hasAllergies = allAllergies.filter(a => a && a !== 'ninguna').length > 0;
    const allergyNotice = hasAllergies
      ? '\n\n🛡️ Tus alergias están protegidas — te alertaré si detectamos alérgenos.'
      : '';
    return `**¡Hola! 👋 Soy tu asistente de nutrición**\n\nPuedo ayudarte con:\n• **Analizar comidas** — escribe qué comiste (ej: "arroz con pollo y ensalada")\n• **Platos típicos** — conozco comida colombiana, mexicana y más\n• **Consultas de salud** — diabetes, colesterol, hipertensión, gastritis\n• **Consejos de peso** — sin dietas extremas, basados en ciencia\n\n🎙️ También puedes usar **notas de voz** tocando el micrófono.\n📷 O enviar una **foto de tu plato** con la cámara.${allergyNotice}\n\n¿Qué comiste hoy?`;
  }

  // 3. Match foods in the text
  const matches = _findFoods(lower);

  // Build allergy + doctor + condition prefixes for food-based responses
  const _prependSafetyWarnings = (foodList, baseResponse) => {
    let prefix = '';
    const allergyWarnings = _checkAllergies(foodList, allAllergies);
    if (allergyWarnings.length > 0) {
      prefix += _buildAllergyWarning(allergyWarnings);
    }
    // Condition-based food warnings (yellow, after red allergy warnings)
    const conditionWarnings = _checkConditionFoods(foodList, conditionRules.notRecommended);
    if (conditionWarnings.length > 0) {
      prefix += _buildConditionWarning(conditionWarnings);
    }
    if (dietRestrictions.length > 0) {
      prefix += _buildDoctorWarning(dietRestrictions);
    }
    // Append condition-specific recommendations at the end
    const suffix = _buildConditionRecommendations(conditionRules);
    return prefix + baseResponse + suffix;
  };

  if (matches.length > 1) {
    return _prependSafetyWarnings(matches, _buildComboAnalysis(matches, text));
  }

  if (matches.length === 1) {
    return _prependSafetyWarnings(matches, _buildSingleAnalysis(matches[0]));
  }

  // 4. Check for common questions
  const questionResp = _checkCommonQuestions(lower);
  if (questionResp) return questionResp;

  // 5. Smart fallback — try partial matches
  const partialMatches = _fuzzyMatch(lower);
  if (partialMatches.length > 0) {
    return _prependSafetyWarnings(partialMatches, _buildComboAnalysis(partialMatches, text));
  }

  // 6. Generic helpful response
  return `**Análisis nutricional**\n\nDescripción: ${text}\n\n• Calorías estimadas: ~350 kcal\n• Tipo: Comida mixta\n\nPara un análisis más preciso, intenta:\n• Nombrar ingredientes específicos (ej: "arroz, pollo, frijoles")\n• Mencionar porciones (ej: "1 taza de arroz")\n• Usar platos típicos (ej: "bandeja paisa", "ajiaco")\n\n🎙️ También puedes usar nota de voz o 📷 enviar una foto.\n\n**Alimentos que reconozco:** arroz, pollo, carne, pescado, huevo, pasta, arepa, plátano, frijoles, lentejas, yuca, papa, frutas, verduras, bandeja paisa, ajiaco, sancocho, tacos, sushi, pizza, y muchos más.`;
}

function _normalize(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _isGreeting(lower) {
  const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'hello', 'que tal', 'como estas'];
  return greetings.some(g => lower === g || lower.startsWith(g + ' '));
}

function _findFoods(lower) {
  const matches = [];
  const found = new Set();

  // Sort keys by length descending to match longer phrases first
  const sortedKeys = Object.keys(FOOD_DB).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const normKey = _normalize(key);
    if (lower.includes(normKey) && !found.has(key)) {
      // Avoid double matching (e.g., "arroz integral" and "arroz")
      let isDuplicate = false;
      for (const existingKey of found) {
        if (existingKey.includes(key) || key.includes(existingKey)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        matches.push({ key, ...FOOD_DB[key] });
        found.add(key);
      }
    }
  }
  return matches;
}

function _fuzzyMatch(lower) {
  const matches = [];
  const words = lower.split(' ').filter(w => w.length > 3);

  for (const word of words) {
    for (const [key, data] of Object.entries(FOOD_DB)) {
      const normKey = _normalize(key);
      if (normKey.includes(word) || word.includes(normKey)) {
        if (!matches.find(m => m.key === key)) {
          matches.push({ key, ...data });
        }
      }
    }
  }
  return matches.slice(0, 5);
}

function _buildSingleAnalysis(food) {
  const rating = _nutritionRating(food);
  const tip = _getTipForFood(food);

  return `**${food.name}**\n\n📊 **Información nutricional:**\n• Calorías: ${food.cal} kcal\n• Carbohidratos: ${food.carb}g\n• Proteína: ${food.prot}g\n• Grasa: ${food.grasa}g\n• Fibra: ${food.fibra}g\n\n${rating}\n\n💡 ${tip}`;
}

function _buildComboAnalysis(matches, originalText) {
  const totalCal = matches.reduce((s, m) => s + m.cal, 0);
  const totalCarb = matches.reduce((s, m) => s + m.carb, 0);
  const totalProt = matches.reduce((s, m) => s + m.prot, 0);
  const totalGrasa = matches.reduce((s, m) => s + m.grasa, 0);
  const totalFibra = matches.reduce((s, m) => s + m.fibra, 0);

  const items = matches.map(m => `• ${m.name}: ${m.cal} kcal`).join('\n');
  const rating = _mealRating(totalCal, totalProt, totalCarb, totalGrasa, totalFibra);
  const balanceTip = _balanceTip(totalCal, totalProt, totalCarb, totalGrasa, totalFibra);

  return `**🍽️ Análisis de tu comida**\n\nAlimentos detectados:\n${items}\n\n📊 **Totales estimados:**\n• Calorías: ${totalCal} kcal\n• Carbohidratos: ${totalCarb}g\n• Proteína: ${totalProt}g\n• Grasa: ${totalGrasa}g\n• Fibra: ${totalFibra}g\n\n${rating}\n\n${balanceTip}`;
}

function _nutritionRating(food) {
  if (food.fibra >= 5) return '✅ **Alto en fibra** — excelente para digestión y saciedad';
  if (food.prot >= 20) return '✅ **Alta proteína** — ideal para recuperación muscular';
  if (food.cal < 100) return '✅ **Bajo en calorías** — perfecto como snack saludable';
  if (food.grasa > 25) return '⚠️ **Alto en grasa** — modera la porción';
  if (food.carb > 50 && food.fibra < 2) return '⚠️ **Alto en carbohidratos refinados** — prefiere versión integral';
  return '✅ **Aporte moderado** — buena opción dentro de una dieta balanceada';
}

function _mealRating(cal, prot, carb, grasa, fibra) {
  const parts = [];
  if (cal > 800) parts.push('⚠️ Comida alta en calorías — considera porciones más pequeñas');
  else if (cal > 500) parts.push('ℹ️ Comida moderada en calorías');
  else parts.push('✅ Comida ligera');

  if (prot < 10) parts.push('⚠️ Baja en proteína — agrega pollo, huevo o legumbres');
  else if (prot >= 20) parts.push('✅ Buena cantidad de proteína');

  if (fibra < 3) parts.push('💡 Agrega verduras o frutas para más fibra');
  else if (fibra >= 8) parts.push('✅ Excelente aporte de fibra');

  return parts.join('\n');
}

function _balanceTip(cal, prot, carb, grasa, fibra) {
  if (cal > 1000) return '💡 **Consejo:** Este plato es una comida completa muy calórica. Si tu meta es control de peso, compártelo o come la mitad y guarda el resto.';
  if (prot < 8 && carb > 40) return '💡 **Consejo:** Tu comida es alta en carbohidratos pero baja en proteína. Agrega un huevo, pollo o legumbres para mayor saciedad y estabilizar el azúcar.';
  if (grasa > 30 && fibra < 3) return '💡 **Consejo:** Alta en grasa y baja en fibra. Acompaña con una ensalada fresca para equilibrar.';
  if (fibra > 10 && prot > 15) return '💡 **Consejo:** ¡Excelente combinación! Alta fibra + proteína = comida saciante y nutritiva. Sigue así.';
  return '💡 **Consejo:** Recuerda que un plato ideal tiene ½ verduras, ¼ proteína, ¼ carbohidrato (Harvard Healthy Eating Plate).';
}

function _getTipForFood(food) {
  const key = food.key;
  const tips = {
    arroz: 'Prueba con arroz integral para más fibra y nutrientes.',
    pollo: 'Excelente fuente de proteína magra. Ideal post-entrenamiento.',
    carne: 'Rica en hierro y B12. Prefiere cortes magros y no más de 3 veces/semana (OMS).',
    pescado: 'Fuente de omega-3. Intenta consumir pescado al menos 2 veces por semana (AHA).',
    huevo: 'Proteína completa con todos los aminoácidos esenciales. Hasta 1 diario es seguro (Harvard).',
    ensalada: 'Agrega proteína (pollo, atún, huevo) para una comida más completa.',
    arepa: 'Si la haces de maíz pelado o con mezcla integral, aporta más fibra.',
    frijoles: 'Superalimento latino: proteína vegetal + fibra + hierro. Come más legumbres.',
    lentejas: 'Las lentejas son una de las mejores fuentes de proteína vegetal y hierro.',
    aguacate: 'Grasa monoinsaturada que protege tu corazón. Medio aguacate al día es perfecto.',
    'bandeja paisa': 'Plato muy completo pero calórico. Disfrútalo con moderación, ideal compartir o como comida principal del día.',
    bandeja: 'Plato muy completo pero calórico. Disfrútalo con moderación, ideal compartir o como comida principal del día.',
    ajiaco: 'Plato nutritivo y reconfortante. La papa criolla aporta vitaminas y el pollo proteína de calidad.',
    sancocho: 'Caldo nutritivo con proteínas y carbohidratos. Prefiere más verduras y menos almidón.',
    pizza: 'Si eliges masa delgada con verduras, reduces calorías significativamente.',
    hamburguesa: 'Prefiere carne magra, agrega lechuga y tomate, y evita salsas industriales.',
    avena: 'Uno de los mejores desayunos: fibra soluble que reduce colesterol y estabiliza azúcar.',
    cafe: 'El café negro tiene antioxidantes. Hasta 3-4 tazas/día es seguro (EFSA). Evita exceso de azúcar.',
  };
  return tips[key] || 'Para mejor precisión, incluye cantidades y método de preparación.';
}

function _checkCommonQuestions(lower) {
  if (lower.includes('cuantas calorias') || lower.includes('calorias debo')) {
    return `**🔢 ¿Cuántas calorías necesitas?**\n\nDepende de tu edad, sexo, peso y actividad:\n\n• Mujer sedentaria: ~1,800-2,000 kcal/día\n• Mujer activa: ~2,200-2,400 kcal/día\n• Hombre sedentario: ~2,200-2,400 kcal/día\n• Hombre activo: ~2,600-3,000 kcal/día\n\n**Fórmula rápida:**\n• Peso (kg) × 30 = calorías de mantenimiento aprox.\n\n💡 No obsesionarte con calorías es más importante que contarlas. Enfócate en la calidad de los alimentos.\n\n*Fuente: OMS, USDA*`;
  }
  if (lower.includes('proteina') && (lower.includes('cuanta') || lower.includes('necesito'))) {
    return `**💪 Proteína diaria recomendada**\n\n• Adulto sedentario: 0.8g por kg de peso\n• Activo/deportista: 1.2-1.6g por kg\n• Ganancia muscular: 1.6-2.2g por kg\n\n**Ejemplo:** Si pesas 70kg y eres activo:\n70 × 1.4 = ~98g de proteína al día\n\n**Fuentes de proteína de calidad:**\n• 100g pechuga = 31g proteína\n• 1 huevo = 6g\n• 1 taza lentejas = 18g\n• 200g yogur griego = 14g\n• 100g atún = 24g\n\n💡 Distribuye la proteína en las 3 comidas principales.\n\n*Fuente: ACSM, ISSN*`;
  }
  if (lower.includes('desayuno') && (lower.includes('que') || lower.includes('recomien') || lower.includes('saludable') || lower.includes('opciones'))) {
    return `**🌅 Ideas de desayunos saludables**\n\n**Opción 1 — Energía sostenida:**\n• Avena con banano y canela\n• 1 huevo cocido\n• Café o té\n~350 kcal | P:18g C:45g G:10g\n\n**Opción 2 — Proteico:**\n• 2 huevos revueltos\n• Pan integral con aguacate\n• Fruta\n~400 kcal | P:22g C:35g G:18g\n\n**Opción 3 — Colombiano saludable:**\n• Arepa con queso\n• Changua o caldo\n• Fruta\n~380 kcal | P:16g C:42g G:14g\n\n**Opción 4 — Rápido:**\n• Yogur con granola y frutas\n• Puñado de nueces\n~300 kcal | P:14g C:38g G:12g\n\n💡 Desayuna en los primeros 90 min al despertar. Incluye siempre proteína + fibra.\n\n*Fuente: Harvard Health*`;
  }
  if (lower.includes('almuerzo') && (lower.includes('que') || lower.includes('recomien') || lower.includes('saludable'))) {
    return `**🌞 Ideas de almuerzos saludables**\n\n**Plato ideal (Harvard):** ½ verduras + ¼ proteína + ¼ carbohidrato\n\n**Opción 1:**\n• Pollo a la plancha + arroz integral + ensalada\n~480 kcal | P:35g C:50g G:12g\n\n**Opción 2:**\n• Pescado al horno + papa + verduras al vapor\n~420 kcal | P:32g C:38g G:10g\n\n**Opción 3:**\n• Lentejas + arroz + ensalada + plátano\n~520 kcal | P:24g C:72g G:8g\n\n**Opción 4 — Express:**\n• Sándwich integral de atún + tomate + aguacate\n~450 kcal | P:28g C:35g G:20g\n\n💡 Acompaña siempre con agua. Evita gaseosas con las comidas.\n\n*Fuente: Harvard Healthy Eating Plate*`;
  }
  return null;
}

