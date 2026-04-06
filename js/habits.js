/* ── Home / Habitos & Metas — MiDoctorYa Lite ──────────────────────────
   Hub central de retención y bienestar:
   - Saludo motivacional personalizado por hora/progreso
   - Nutrición consciente: sanar con alimentación (sin dietas extremas)
   - Hábitos basados en evidencia (OMS, Harvard, NIH, JAMA)
   - Tracking diario con streaks y gamificación
   - Workout tracker integrado
   - Tips nutricionales diarios rotativos con bases científicas
─────────────────────────────────────────────────────────────────────── */
import { t, tBP } from './i18n.js';
import { getRecommendations, logMood } from './api.js';
import { showToast } from './app.js';
import { getConnectionStatus, getCurrentReading } from './wearables.js';

/* ── Notificaciones ──────────────────────────────────────────────── */
let _remindersScheduled = false;
let _reminderIntervals = [];
function _notificationsSupported() { return typeof Notification !== 'undefined'; }
function _requestNotificationPermission() { if (_notificationsSupported() && Notification.permission === 'default') Notification.requestPermission(); }
function _getNotifKey(id) { return 'dya_notif_' + _todayKey() + '_' + id; }
function _wasNotifiedToday(id) { return localStorage.getItem(_getNotifKey(id)) === '1'; }
function _markNotified(id) { localStorage.setItem(_getNotifKey(id), '1'); }
function _checkAndNotify(habitId, message) {
  if (!_notificationsSupported() || Notification.permission !== 'granted' || _wasNotifiedToday(habitId)) return;
  const log = _getDailyLog(), habits = _getHabits(), h = habits.find(x => x.id === habitId);
  if (!h || !h.active) return;
  const val = log[habitId] || 0, done = h.inverse ? val <= h.goal : val >= h.goal;
  if (done) return;
  try { new Notification('MiDoctorYa', { body: message, icon: 'icons/icon-192.png', tag: 'dya-' + habitId }); _markNotified(habitId); } catch(_e) {}
}
function _scheduleReminders() {
  if (_remindersScheduled) return; _remindersScheduled = true; _requestNotificationPermission();
  _reminderIntervals.forEach(id => clearInterval(id)); _reminderIntervals = [];
  const cid = setInterval(() => {
    if (!_notificationsSupported() || Notification.permission !== 'granted') return;
    const h = new Date().getHours(), m = new Date().getMinutes();
    if (m === 0 && h >= 8 && h <= 20 && h % 2 === 0) _checkAndNotify('water', '💧 Recuerda hidratarte. Tu cuerpo lo necesita.');
    if (h === 18 && m === 0) _checkAndNotify('exercise', '🏋️ ¿Ya te moviste hoy? 30 minutos hacen la diferencia.');
    if (h === 22 && m === 0) _checkAndNotify('sleep', '😴 Prepárate para descansar. Mañana será un gran día.');
  }, 60000);
  _reminderIntervals.push(cid);
}

/* ── Constantes ──────────────────────────────────────────────── */
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── Hábitos predeterminados (basados en ciencia) ────────────── */
const DEFAULT_HABITS = [
  { id: 'water',      icon: '💧', name: 'Hidratación',         desc: '8 vasos de agua (OMS)',                unit: 'vasos',     goal: 8,    category: 'salud',     source: 'OMS',                 color: 'from-cyan-400 to-blue-500' },
  { id: 'exercise',   icon: '🏋️', name: 'Movimiento',          desc: '30 min actividad física (OMS)',        unit: 'min',       goal: 30,   category: 'fitness',   source: 'OMS',                 color: 'from-orange-400 to-red-500' },
  { id: 'sleep',      icon: '😴', name: 'Descanso',             desc: '7-9 horas de sueño (NIH)',             unit: 'horas',     goal: 8,    category: 'salud',     source: 'NIH',                 color: 'from-indigo-400 to-purple-600' },
  { id: 'fruits',     icon: '🥗', name: 'Alimentación Natural', desc: '5 porciones frutas/verduras (OMS)',    unit: 'porciones', goal: 5,    category: 'nutricion', source: 'OMS',                 color: 'from-green-400 to-emerald-500' },
  { id: 'meditation', icon: '🧘', name: 'Mente en Calma',      desc: '10 min mindfulness (Harvard)',         unit: 'min',       goal: 10,   category: 'estres',    source: 'Harvard',             color: 'from-violet-400 to-purple-500' },
  { id: 'steps',      icon: '🚶', name: 'Caminar',              desc: '8,000 pasos diarios (JAMA)',           unit: 'pasos',     goal: 8000, category: 'fitness',   source: 'JAMA 2020',           color: 'from-teal-400 to-cyan-500' },
  { id: 'screen',     icon: '📵', name: 'Desconexión Digital',  desc: 'Máx 2h pantalla ocio (AAP)',           unit: 'horas',     goal: 2,    category: 'salud',     source: 'AAP',                 color: 'from-gray-400 to-gray-600', inverse: true },
  { id: 'gratitude',  icon: '🙏', name: 'Gratitud',             desc: '3 cosas positivas del día',            unit: 'cosas',     goal: 3,    category: 'estres',    source: 'Psicología Positiva', color: 'from-yellow-400 to-amber-500' },
];

/* ── Tips Nutricionales Diarios (ciencia, no dietas extremas) ──── */
const NUTRITION_TIPS = [
  { title: 'Colores en tu plato', body: 'Cada color en frutas y verduras aporta antioxidantes diferentes. Un plato colorido es un plato sanador.', source: 'Harvard T.H. Chan', icon: '🌈', action: 'Hoy incluye 3 colores diferentes en cada comida' },
  { title: 'El poder del omega-3', body: 'Los ácidos grasos omega-3 reducen inflamación, mejoran la memoria y protegen el corazón. No necesitas suplementos costosos.', source: 'AHA', icon: '🐟', action: 'Incluye pescado, nueces o semillas de chía esta semana' },
  { title: 'Fibra: tu aliada invisible', body: 'La fibra alimenta las bacterias buenas de tu intestino, regula el azúcar y te mantiene satisfecho por más tiempo.', source: 'Mayo Clinic', icon: '🌾', action: 'Agrega legumbres, avena o frutas con cáscara hoy' },
  { title: 'Hidratación inteligente', body: 'Tu cerebro es 75% agua. La deshidratación leve ya afecta concentración, humor y energía antes de que sientas sed.', source: 'NIH', icon: '💧', action: 'Toma un vaso de agua al despertar, antes de cada comida' },
  { title: 'Especias que sanan', body: 'La cúrcuma, el jengibre y la canela tienen propiedades antiinflamatorias comprobadas. Son medicinas en tu cocina.', source: 'NCCIH', icon: '🧄', action: 'Añade cúrcuma o jengibre a una comida hoy' },
  { title: 'Comer despacio', body: 'Tu cerebro tarda 20 minutos en registrar saciedad. Comer despacio previene sobrealimentación y mejora la digestión.', source: 'Harvard Health', icon: '⏱️', action: 'En tu próxima comida, mastica 20 veces cada bocado' },
  { title: 'Probióticos naturales', body: 'El yogur, el kéfir y los alimentos fermentados fortalecen tu sistema inmune desde el intestino.', source: 'Stanford Medicine', icon: '🥛', action: 'Incluye un alimento fermentado hoy' },
  { title: 'Proteína en cada comida', body: 'La proteína mantiene masa muscular, controla el apetito y estabiliza el azúcar. No solo es para atletas.', source: 'ACSM', icon: '🥚', action: 'Asegura una fuente de proteína en desayuno, almuerzo y cena' },
  { title: 'Grasas buenas, no miedo', body: 'El aguacate, las nueces, el aceite de oliva protegen tu corazón y cerebro. Las grasas saludables son esenciales, no enemigas.', source: 'Dieta Mediterránea (UNESCO)', icon: '🥑', action: 'Reemplaza una fritura por aguacate o aceite de oliva' },
  { title: 'Verduras de hoja verde', body: 'Espinaca, kale, acelgas: son las más densas en nutrientes del planeta. Reducen riesgo cardiovascular hasta 15%.', source: 'JAMA Internal Medicine', icon: '🥬', action: 'Agrega una porción de hojas verdes en almuerzo o cena' },
  { title: 'El ayuno natural', body: 'No cenar demasiado tarde permite a tu cuerpo repararse durante el sueño. No es una dieta, es respetar tu reloj biológico.', source: 'Circadian Biology (Nobel 2017)', icon: '🌙', action: 'Intenta cenar al menos 2-3 horas antes de dormir' },
  { title: 'Legumbres: superalimento', body: 'Lentejas, garbanzos y frijoles son baratos, nutritivos y reducen colesterol. Las zonas azules del mundo las comen a diario.', source: 'Blue Zones / Dan Buettner', icon: '🫘', action: 'Incluye legumbres al menos 3 veces esta semana' },
  { title: 'Reduce el azúcar añadido', body: 'El exceso de azúcar causa inflamación crónica, no solo caries. La OMS recomienda máximo 25g/día. Lee las etiquetas.', source: 'OMS', icon: '🍬', action: 'Hoy sustituye una bebida azucarada por agua con fruta' },
  { title: 'Cocina en casa', body: 'Cocinar en casa reduce consumo de sodio, azúcar y grasas trans hasta 50%. Además conecta con la comida y reduce estrés.', source: 'Cambridge University', icon: '👨‍🍳', action: 'Prepara al menos una comida completa en casa hoy' },
  { title: 'Frutos secos: energía pura', body: 'Un puñado diario de nueces, almendras o maní reduce riesgo cardiovascular 30%. Son snack perfecto entre comidas.', source: 'NEJM', icon: '🥜', action: 'Lleva un puñado de frutos secos como snack hoy' },
  { title: 'No elimines, sustituye', body: 'Las dietas restrictivas fallan 95% de las veces. Es mejor hacer sustituciones graduales: integral por blanco, fruta por dulce.', source: 'APA / Psychology of Eating', icon: '🔄', action: 'Identifica un alimento que puedas sustituir por uno más nutritivo' },
  { title: 'Vitamina D y sol', body: 'El 80% de la vitamina D viene del sol. 15 minutos de luz solar mejoran huesos, inmunidad y estado de ánimo.', source: 'Endocrine Society', icon: '☀️', action: 'Sal 15 minutos al sol hoy (sin protector solo ese rato)' },
  { title: 'Come con atención plena', body: 'Mindful eating reduce atracones, mejora digestión y la relación con la comida. No hay alimentos "prohibidos", hay consciencia.', source: 'Harvard Mindfulness', icon: '🧠', action: 'En la próxima comida, sin pantallas: solo tú y tu plato' },
  { title: 'Hierro y energía', body: 'El cansancio crónico puede ser falta de hierro. Lentejas, espinaca y carne roja (moderada) son tus aliados.', source: 'WHO / Anemia Guidelines', icon: '💪', action: 'Si te sientes cansado, revisa tu consumo de hierro esta semana' },
  { title: 'El intestino: segundo cerebro', body: 'El 90% de la serotonina se produce en tu intestino. Alimentar tu microbioma es alimentar tu felicidad.', source: 'Nature / Gut-Brain Axis', icon: '🦠', action: 'Incluye fibra prebiótica: plátano verde, cebolla, ajo' },
  { title: 'Antiinflamatorio natural', body: 'La inflamación crónica está detrás de diabetes, obesidad y depresión. La dieta mediterránea es el mejor antiinflamatorio.', source: 'Lancet / Mediterranean Diet', icon: '🫒', action: 'Hoy: aceite de oliva, tomate, pescado o nueces' },
  { title: 'No te saltes el desayuno', body: 'Desayunar activa el metabolismo y mejora concentración. No necesita ser elaborado: fruta + proteína + fibra es suficiente.', source: 'ADSA', icon: '🍳', action: 'Mañana desayuna en los primeros 90 minutos al despertar' },
  { title: 'Magnesio: el mineral olvidado', body: 'El magnesio regula sueño, reduce estrés muscular y calma ansiedad. Chocolate oscuro, espinaca y plátano lo contienen.', source: 'NIH Office of Dietary Supplements', icon: '🍫', action: 'Un cuadro de chocolate oscuro (70%+) es saludable y delicioso' },
  { title: 'Porciones, no restricción', body: 'No se trata de comer menos, sino de comer inteligente. Tu mano es tu mejor medidor: puño = carbohidrato, palma = proteína.', source: 'Precision Nutrition', icon: '✋', action: 'Usa tu mano como guía de porciones en la próxima comida' },
  { title: 'Alimentos locales y de temporada', body: 'Las frutas y verduras de temporada tienen más nutrientes, mejor sabor y menor costo. Apoya lo local.', source: 'FAO', icon: '🌱', action: 'Pregunta en el mercado qué frutas están en temporada' },
  { title: 'Potasio para tu corazón', body: 'El plátano, la papa y el tomate son ricos en potasio, que regula la presión arterial naturalmente.', source: 'AHA', icon: '🍌', action: 'Incluye un plátano o tomate hoy' },
  { title: 'Cena ligera, sueño profundo', body: 'Una cena pesada dificulta el sueño y la regeneración nocturna. Ligera no es "no cenar", es elegir bien.', source: 'Sleep Foundation', icon: '🥗', action: 'Esta noche: ensalada, sopa o proteína ligera con verduras' },
  { title: 'Canela: estabiliza tu azúcar', body: 'Media cucharadita de canela al día puede ayudar a regular niveles de glucosa. Funciona en avena, café o frutas.', source: 'Diabetes Care Journal', icon: '🫘', action: 'Añade canela a tu café, avena o fruta de hoy' },
  { title: 'Agua antes de comer', body: 'Un vaso de agua 30 minutos antes de cada comida mejora digestión y reduce ingesta calórica naturalmente, sin esfuerzo.', source: 'Clinical Nutrition', icon: '🥤', action: 'Antes de almorzar hoy, toma un vaso de agua' },
  { title: 'Tu cuerpo no es tu enemigo', body: 'La alimentación saludable no es castigo. Es un acto de amor propio. Cada buena elección suma, ninguna mala elección te define.', source: 'Psicología de la Salud', icon: '❤️', action: 'Hoy agradece a tu cuerpo por todo lo que hace por ti' },
];

/* ── Límites médicos para metas de salud ────────────────────── */
const HEALTH_GOAL_LIMITS = {
  weight_loss: { maxPerWeek: 0.75, unit: 'kg', source: 'OMS/CDC', warning: 'Perder más de 0.75kg por semana puede ser peligroso' },
  weight_gain: { maxPerWeek: 0.5, unit: 'kg', source: 'ACSM', warning: 'Ganar más de 0.5kg por semana podría ser grasa, no músculo' },
  running_km: { maxPerWeek: 3, unit: 'km', source: 'ACSM', warning: 'Aumentar más de 10% semanal incrementa riesgo de lesión' },
  bike_km: { maxPerWeek: 10, unit: 'km', source: 'ACE', warning: 'Incremento gradual recomendado' },
  press_kg: { maxPerWeek: 2.5, unit: 'kg', source: 'NSCA', warning: 'Progresión gradual para evitar lesiones' },
  bar_kg: { maxPerWeek: 2.5, unit: 'kg', source: 'NSCA', warning: 'Aumentos de 2.5kg máximo por semana' },
};

const GOAL_METRIC_CONFIG = {
  weight: { icon: '⚖️', label: 'Peso', unit: 'kg', metricKey: 'weight', color: '#818CF8', borderColor: 'border-l-indigo-500', directions: ['increase', 'decrease'] },
  running_km: { icon: '🏃', label: 'Running', unit: 'km', metricKey: 'running_km', color: '#F59E0B', borderColor: 'border-l-amber-500', directions: ['increase'] },
  bike_km: { icon: '🚴', label: 'Bicicleta', unit: 'km', metricKey: 'bike_km', color: '#10B981', borderColor: 'border-l-emerald-500', directions: ['increase'] },
  press_kg: { icon: '💪', label: 'Press', unit: 'kg', metricKey: 'press_kg', color: '#EF4444', borderColor: 'border-l-red-500', directions: ['increase'] },
  bar_kg: { icon: '🏋️', label: 'Barra', unit: 'kg', metricKey: 'bar_kg', color: '#8B5CF6', borderColor: 'border-l-purple-500', directions: ['increase'] },
};

/* ── Frases motivacionales ───────────────────────────────────── */
const GREETINGS = {
  morning: ['Buenos días', '¡Arriba!', 'Nuevo día, nuevas fuerzas'],
  afternoon: ['Buenas tardes', 'Sigue así', '¡Vas muy bien!'],
  evening: ['Buenas noches', 'Cierra el día con orgullo', 'Descansa bien'],
};

const CELEBRATE_MSGS = [
  '¡Máquina! 🔥', '¡Imparable! 💪', '¡Así se hace! ⭐',
  '¡Increíble! 🚀', '¡Eres constancia pura! 💎', '¡Tu futuro yo te agradece! 🌟',
];

/* ── Recomendaciones por edad (OMS/CDC) ──────────────────────── */
function _getAgeRecommendations(age) {
  if (!age) return { exercise: 30, sleep: 8, water: 8, label: 'General', tip: 'Registra tu fecha de nacimiento en Ajustes para recomendaciones personalizadas.' };
  if (age < 18) return { exercise: 60, sleep: 9, water: 8, label: 'Adolescente', tip: 'Tu cuerpo está en desarrollo. Necesitas más movimiento, sueño y nutrientes que un adulto. ¡Aprovéchalo!' };
  if (age < 30) return { exercise: 30, sleep: 8, water: 10, label: '18-29', tip: 'Etapa perfecta para crear hábitos que duren toda la vida. 150 min/semana de ejercicio moderado (OMS).' };
  if (age < 45) return { exercise: 30, sleep: 7, water: 10, label: '30-44', tip: 'Prioriza ejercicio de fuerza 2x/semana para prevenir pérdida muscular. Tu metabolismo te lo agradecerá (ACSM).' };
  if (age < 60) return { exercise: 30, sleep: 7, water: 8, label: '45-59', tip: 'Chequeos regulares, antioxidantes naturales y manejo del estrés son tu mejor inversión en salud (Mayo Clinic).' };
  return { exercise: 20, sleep: 7, water: 8, label: '60+', tip: 'Equilibrio, flexibilidad y caminar son tus mejores aliados. Cada minuto de movimiento cuenta (NIA).' };
}

function _getUserAge() {
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  if (!user.birthdate) return null;
  const birth = new Date(user.birthdate), today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function _getGreeting() {
  const h = new Date().getHours();
  const list = h < 12 ? GREETINGS.morning : h < 18 ? GREETINGS.afternoon : GREETINGS.evening;
  return list[Math.floor(Math.random() * list.length)];
}

function _getTodayTip() {
  // Rotate daily based on day of year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return NUTRITION_TIPS[dayOfYear % NUTRITION_TIPS.length];
}

/* ── Storage ─────────────────────────────────────────────────── */
function _todayKey() { return new Date().toISOString().split('T')[0]; }

function _getHabits() {
  const stored = localStorage.getItem('dya_habits');
  if (stored) return JSON.parse(stored);
  const habits = DEFAULT_HABITS.map(h => ({ ...h, active: true }));
  localStorage.setItem('dya_habits', JSON.stringify(habits));
  return habits;
}
function _saveHabits(h) { localStorage.setItem('dya_habits', JSON.stringify(h)); }

function _getDailyLog() {
  return JSON.parse(localStorage.getItem('dya_log_' + _todayKey()) || '{}');
}
function _saveDailyLog(log) {
  localStorage.setItem('dya_log_' + _todayKey(), JSON.stringify(log));
}

function _getStreaks() { return JSON.parse(localStorage.getItem('dya_streaks') || '{}'); }
function _updateStreaks(habitId, completed) {
  const streaks = _getStreaks();
  if (!streaks[habitId]) streaks[habitId] = { current: 0, best: 0, lastDate: '' };
  const today = _todayKey();
  if (completed) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = y.toISOString().split('T')[0];
    if (streaks[habitId].lastDate === yKey || streaks[habitId].lastDate === today) {
      if (streaks[habitId].lastDate !== today) streaks[habitId].current++;
    } else { streaks[habitId].current = 1; }
    streaks[habitId].lastDate = today;
    if (streaks[habitId].current > streaks[habitId].best) streaks[habitId].best = streaks[habitId].current;
  }
  localStorage.setItem('dya_streaks', JSON.stringify(streaks));
  return streaks[habitId];
}

/* ── Best streak across all habits ───────────────────────────── */
function _getBestStreak() {
  const streaks = _getStreaks();
  let best = 0;
  Object.values(streaks).forEach(s => { if (s.current > best) best = s.current; });
  return best;
}

/* ── Métricas Personales ─────────────────────────────────────── */
function _getMetrics() {
  return JSON.parse(localStorage.getItem('dya_metrics') || '{"weight":[],"height":null,"running_km":[],"bike_km":[],"press_kg":[],"bar_kg":[]}');
}
function _saveMetrics(m) { localStorage.setItem('dya_metrics', JSON.stringify(m)); }
function _addMetric(key, value) {
  const m = _getMetrics();
  if (Array.isArray(m[key])) {
    m[key].push({ value, date: new Date().toISOString().split('T')[0] });
    // Keep last 90 entries
    if (m[key].length > 90) m[key] = m[key].slice(-90);
  } else {
    m[key] = value;
  }
  _saveMetrics(m);
}
function _getLatestMetric(key) {
  const m = _getMetrics();
  if (Array.isArray(m[key]) && m[key].length > 0) return m[key][m[key].length - 1];
  return m[key];
}

/* ── Goal Storage ───────────────────────────────────────────── */
function _getGoals() {
  return JSON.parse(localStorage.getItem('dya_goals') || '[]');
}
function _saveGoals(goals) {
  localStorage.setItem('dya_goals', JSON.stringify(goals));
}
function _getLatestMetricValue(metricKey) {
  var m = _getMetrics();
  if (metricKey === 'weight') {
    var arr = m.weight || [];
    return arr.length > 0 ? arr[arr.length - 1].value : null;
  }
  var arr2 = m[metricKey] || [];
  return arr2.length > 0 ? arr2[arr2.length - 1].value : null;
}
function _validateGoalRate(metric, direction, current, target, weeks) {
  var diff = Math.abs(target - current);
  var ratePerWeek = diff / weeks;
  var limitKey = metric === 'weight' ? (direction === 'decrease' ? 'weight_loss' : 'weight_gain') : metric;
  var limit = HEALTH_GOAL_LIMITS[limitKey];
  if (!limit) return { safe: true };
  if (ratePerWeek > limit.maxPerWeek) {
    var safeWeeks = Math.ceil(diff / limit.maxPerWeek);
    return { safe: false, limit: limit, ratePerWeek: ratePerWeek, safeWeeks: safeWeeks, safeRate: limit.maxPerWeek };
  }
  return { safe: true };
}
function _calcGoalProgress(goal) {
  var latest = _getLatestMetricValue(GOAL_METRIC_CONFIG[goal.metric] ? GOAL_METRIC_CONFIG[goal.metric].metricKey : goal.metric);
  if (latest === null) return { pct: 0, currentValue: goal.currentValue, completed: false, expired: false };
  var totalDiff = Math.abs(goal.target - goal.currentValue);
  if (totalDiff === 0) return { pct: 100, currentValue: latest, completed: true, expired: false };
  var achieved = goal.direction === 'increase' ? latest - goal.currentValue : goal.currentValue - latest;
  var pct = Math.max(0, Math.min(100, Math.round((achieved / totalDiff) * 100)));
  var completed = goal.direction === 'increase' ? latest >= goal.target : latest <= goal.target;
  var createdDate = new Date(goal.createdAt);
  var endDate = new Date(createdDate); endDate.setDate(endDate.getDate() + goal.weeks * 7);
  var expired = new Date() > endDate && !completed;
  var msLeft = endDate - new Date();
  var weeksLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 7)));
  return { pct: pct, currentValue: latest, completed: completed, expired: expired, weeksLeft: weeksLeft };
}

/* ── Total days active ───────────────────────────────────────── */
function _getTotalDaysActive() {
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = 'dya_log_' + d.toISOString().split('T')[0];
    if (localStorage.getItem(key)) count++;
  }
  return count;
}

/* ── Workout State ───────────────────────────────────────────── */
function _getActiveWorkout() { return JSON.parse(localStorage.getItem('dya_active_workout') || 'null'); }
function _setActiveWorkout(w) { localStorage.setItem('dya_active_workout', w ? JSON.stringify(w) : ''); }
let _timerInterval = null, _twoHourTimeout = null;
function _formatTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ══════════════════════════════════════════════════════════════════════
   ██  RENDER PRINCIPAL — HOME
   ══════════════════════════════════════════════════════════════════════ */
export async function renderHabits(container) {
  // Active workout takes priority
  const active = _getActiveWorkout();
  if (active) { _renderActiveWorkout(container, active); return; }

  const age = _getUserAge();
  const ageRec = _getAgeRecommendations(age);
  const habits = _getHabits().filter(h => h.active);
  const log = _getDailyLog();
  const streaks = _getStreaks();
  const today = new Date();
  const userName = (JSON.parse(localStorage.getItem('dya_user')||'{}').name||'').split(' ')[0] || 'Usuario';
  const tip = _getTodayTip();
  const bestStreak = _getBestStreak();
  const totalDays = _getTotalDaysActive();

  // Progress
  let completed = 0;
  habits.forEach(h => {
    const val = log[h.id] || 0;
    if (h.inverse ? val <= h.goal : val >= h.goal) completed++;
  });
  const pct = habits.length ? Math.round((completed / habits.length) * 100) : 0;
  const greeting = _getGreeting();
  const celebMsg = pct === 100 ? CELEBRATE_MSGS[Math.floor(Math.random() * CELEBRATE_MSGS.length)] : '';

  // ── Load allergy + doctor recommendation data ──
  let _habitsAllergies = [];
  let _habitsAllergyOther = '';
  let _habitsRecs = [];
  try {
    const _habUser = JSON.parse(localStorage.getItem('dya_user') || '{}');
    const _habEmail = _habUser.email || '';
    const _habProfile = JSON.parse(localStorage.getItem('dya_patient_profile_' + _habEmail) || '{}');
    _habitsAllergies = Array.isArray(_habProfile.allergies) ? _habProfile.allergies : [];
    _habitsAllergyOther = _habProfile.allergiesOther || '';
    _habitsRecs = JSON.parse(localStorage.getItem('dya_patient_recs_' + _habEmail) || '[]');
  } catch (_e) { /* ignore */ }

  const _ALLERGY_LABELS_HAB = {
    mani: 'Maní', frutos_secos: 'Frutos secos', mariscos: 'Mariscos',
    lactosa: 'Lácteos', gluten: 'Gluten', huevo: 'Huevo', soya: 'Soya',
  };
  const _displayAllergies = _habitsAllergies
    .filter(a => a && a !== 'ninguna')
    .map(a => _ALLERGY_LABELS_HAB[a] || a);
  if (_habitsAllergyOther && _habitsAllergyOther.trim()) {
    _habitsAllergyOther.split(',').forEach(a => { if (a.trim()) _displayAllergies.push(a.trim()); });
  }
  const _hasAllergies = _displayAllergies.length > 0;
  const _hasRecs = Array.isArray(_habitsRecs) && _habitsRecs.length > 0;

  const _REC_ICONS = {
    'Restricción alimenticia': '🥗',
    'Medicamento': '💊',
    'Actividad física': '🏋️',
    'Examen médico': '🩺',
    'Control': '📋',
    'Otro': '📌',
  };
  const _PRIORITY_BADGES = {
    alta: 'bg-red-100 text-red-700',
    media: 'bg-yellow-100 text-yellow-700',
    baja: 'bg-green-100 text-green-700',
  };

  container.innerHTML = `
    <div class="animate-fade-in">

      <!-- ═══ HERO HEADER ═══ -->
      <div class="relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #4338ca 100%);">
        <div class="absolute top-[-40px] right-[-40px] w-52 h-52 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-[-30px] left-[-20px] w-36 h-36 bg-purple-500/10 rounded-full blur-2xl"></div>

        <div class="px-5 pt-11 pb-5 relative z-10">
          <!-- Top row -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-white/40 text-[11px] font-medium">${DIAS_FULL[today.getDay()]}, ${today.getDate()} de ${MESES[today.getMonth()]}</p>
              <h1 class="text-[22px] font-black text-white leading-tight mt-0.5">${greeting}, <span class="text-indigo-300">${userName}</span></h1>
              ${age ? `<p class="text-white/30 text-[10px] mt-0.5">${age} años · Plan ${ageRec.label}</p>` : ''}
              ${_hasAllergies ? `<span class="inline-block mt-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-[9px] text-red-300 font-bold">🚨 Alergias: ${_displayAllergies.join(', ')}</span>` : ''}
            </div>
            <div class="relative w-[68px] h-[68px]">
              <svg class="w-[68px] h-[68px] -rotate-90" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="30" stroke="rgba(255,255,255,0.08)" stroke-width="5" fill="none"/>
                <circle cx="34" cy="34" r="30" stroke="url(#progressGrad)" stroke-width="5" fill="none"
                  stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="${2*Math.PI*30*(1-pct/100)}" stroke-linecap="round" class="transition-all duration-1000"/>
                <defs><linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#34D399"/></linearGradient></defs>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center flex-col">
                <span class="text-[15px] font-black text-white leading-none">${pct}%</span>
                <span class="text-[8px] text-white/40">hoy</span>
              </div>
            </div>
          </div>

          <!-- Stats strip -->
          <div class="flex gap-2 mb-2">
            <div class="flex-1 bg-white/[0.06] rounded-xl px-3 py-2 backdrop-blur-sm">
              <p class="text-[9px] text-white/40 uppercase tracking-wider">Completados</p>
              <p class="text-base font-black text-white">${completed}<span class="text-white/30 text-xs">/${habits.length}</span></p>
            </div>
            <div class="flex-1 bg-white/[0.06] rounded-xl px-3 py-2 backdrop-blur-sm">
              <p class="text-[9px] text-white/40 uppercase tracking-wider">Mejor racha</p>
              <p class="text-base font-black text-white">${bestStreak > 0 ? '🔥 ' + bestStreak : '--'}<span class="text-white/30 text-xs"> días</span></p>
            </div>
            <div class="flex-1 bg-white/[0.06] rounded-xl px-3 py-2 backdrop-blur-sm">
              <p class="text-[9px] text-white/40 uppercase tracking-wider">Días activo</p>
              <p class="text-base font-black text-white">${totalDays}<span class="text-white/30 text-xs"> total</span></p>
            </div>
          </div>

          ${(() => { try { const _wSt = getConnectionStatus(); const _wR = getCurrentReading(); if (_wSt.connected && _wR.heartRate > 0) return `
          <div class="flex gap-2 mb-2 mt-2">
            <div class="flex-1 bg-red-500/20 rounded-xl px-3 py-2 backdrop-blur-sm border border-red-400/20">
              <p class="text-[9px] text-red-300/60 uppercase tracking-wider">\u{1F493} FC</p>
              <p class="text-base font-black text-red-300">${_wR.heartRate}<span class="text-red-300/40 text-[10px]"> bpm</span></p>
            </div>
            ${_wR.spo2 > 0 ? `<div class="flex-1 bg-blue-500/20 rounded-xl px-3 py-2 backdrop-blur-sm border border-blue-400/20">
              <p class="text-[9px] text-blue-300/60 uppercase tracking-wider">\u{1FA78} SpO2</p>
              <p class="text-base font-black text-blue-300">${_wR.spo2}<span class="text-blue-300/40 text-[10px]">%</span></p>
            </div>` : ''}
            ${_wR.steps > 0 ? `<div class="flex-1 bg-emerald-500/20 rounded-xl px-3 py-2 backdrop-blur-sm border border-emerald-400/20">
              <p class="text-[9px] text-emerald-300/60 uppercase tracking-wider">\u{1F6B6} Pasos</p>
              <p class="text-base font-black text-emerald-300">${(_wR.steps/1000).toFixed(1)}<span class="text-emerald-300/40 text-[10px]">k</span></p>
            </div>` : ''}
          </div>`; return ''; } catch(_e) { return ''; } })()}

          <button id="go-progress" class="mt-3 w-full py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white/80 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition backdrop-blur-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Ver Mi Progreso
          </button>

          ${celebMsg ? `
          <div class="mt-2 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-xl px-4 py-2.5 border border-white/10 animate-pop">
            <p class="text-sm font-black text-white text-center">${celebMsg} ¡Día perfecto!</p>
          </div>` : ''}
        </div>
      </div>

      <!-- ═══ ACCIONES RÁPIDAS ═══ -->
      <div class="px-4 -mt-3 mb-4 relative z-20">
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100/80 p-2.5">
          <div class="grid grid-cols-4 gap-1.5">
            <button id="quick-workout" class="py-3 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 transition shadow-md shadow-orange-500/20">
              <span class="text-xl leading-none">🏋️</span>Entrenar
            </button>
            <button id="quick-water" class="py-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 transition shadow-md shadow-blue-500/20">
              <span class="text-xl leading-none">💧</span>+1 Vaso
            </button>
            <button id="quick-mood" class="py-3 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 transition shadow-md shadow-violet-500/20">
              <span class="text-xl leading-none">🧘</span>Meditar
            </button>
            <button id="quick-food" class="py-3 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 text-white text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 transition shadow-md shadow-emerald-500/20">
              <span class="text-xl leading-none">🥗</span>Nutrición
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ ALIMENTACIÓN CONSCIENTE — TIP DEL DÍA ═══ -->
      <div class="px-4 mb-4">
        <div class="relative overflow-hidden rounded-2xl" style="background: linear-gradient(135deg, #065f46, #047857, #10b981);">
          <div class="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div class="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3"></div>
          <div class="p-4 relative z-10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">${tip.icon}</span>
              <div>
                <p class="text-[9px] text-emerald-200/60 uppercase tracking-wider font-semibold">Alimentación Consciente</p>
                <h3 class="text-sm font-black text-white leading-tight">${tip.title}</h3>
              </div>
            </div>
            <p class="text-[11px] text-white/80 leading-relaxed mb-2">${tip.body}</p>
            <div class="bg-white/10 rounded-lg px-3 py-2 mb-2">
              <p class="text-[10px] text-emerald-100 font-semibold">👉 ${tip.action}</p>
            </div>
            <p class="text-[8px] text-emerald-300/40 text-right">Fuente: ${tip.source}</p>
          </div>
        </div>
      </div>

      <!-- ═══ TIP DE SALUD POR EDAD ═══ -->
      ${ageRec.tip ? `
      <div class="px-4 mb-4">
        <div class="bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100 flex items-start gap-3">
          <span class="text-xl mt-0.5">💡</span>
          <div>
            <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Para tu edad (${age} años)</p>
            <p class="text-[11px] text-indigo-800 leading-relaxed">${ageRec.tip}</p>
          </div>
        </div>
      </div>` : ''}

      <!-- ═══ RECOMENDACIONES DEL MÉDICO ═══ -->
      ${_hasRecs ? `
      <div class="px-4 mb-4">
        <div class="rounded-2xl overflow-hidden" style="border: 2px solid transparent; background-image: linear-gradient(white, white), linear-gradient(135deg, #3B82F6, #6366F1, #8B5CF6); background-origin: border-box; background-clip: padding-box, border-box;">
          <div class="p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xl">⚕️</span>
              <h3 class="text-sm font-black text-gray-800">Recomendaciones de tu médico</h3>
            </div>
            <div class="space-y-2">
              ${_habitsRecs.map(function(r) {
                var icon = _REC_ICONS[r.type] || '📌';
                var pClass = _PRIORITY_BADGES[(r.priority || '').toLowerCase()] || 'bg-gray-100 text-gray-600';
                return '<div class="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">' +
                  '<span class="text-base mt-0.5">' + icon + '</span>' +
                  '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-2 mb-0.5">' +
                      '<p class="text-[11px] font-bold text-gray-700 line-clamp-1">' + (r.type || 'Recomendación') + '</p>' +
                      (r.priority ? '<span class="text-[8px] px-1.5 py-0.5 rounded-full font-bold ' + pClass + '">' + r.priority + '</span>' : '') +
                    '</div>' +
                    '<p class="text-[10px] text-gray-500 leading-relaxed">' + (r.description || r.desc || r.text || '') + '</p>' +
                  '</div>' +
                '</div>';
              }).join('')}
            </div>
          </div>
        </div>
      </div>` : ''}

      <!-- ═══ MIS HÁBITOS ═══ -->
      <div class="px-4 mb-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-black text-gray-800">Mis Hábitos de Hoy</h3>
          <button id="add-habit-btn" class="text-[11px] text-indigo-500 font-bold flex items-center gap-1 active:scale-95 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            Nueva meta
          </button>
        </div>
      </div>

      <div id="habits-list" class="px-4 space-y-2 mb-4">
        ${habits.map((h, idx) => {
          const val = log[h.id] || 0;
          const done = h.inverse ? val <= h.goal : val >= h.goal;
          const progress = h.inverse ? Math.max(0, 1 - val/h.goal) : Math.min(1, val / h.goal);
          const streak = streaks[h.id]?.current || 0;
          return `
            <div class="habit-card bg-white rounded-2xl shadow-sm border ${done ? 'border-emerald-200' : 'border-gray-100'} p-3.5 transition-all animate-slide-up ${done ? 'bg-gradient-to-r from-emerald-50/50 to-white' : ''}" style="animation-delay:${idx*40}ms" data-id="${h.id}">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${h.color} flex items-center justify-center text-xl shadow-sm flex-shrink-0 ${done ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}">
                  ${done ? '✅' : h.icon}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <p class="text-[13px] font-bold ${done ? 'text-emerald-700' : 'text-gray-800'} line-clamp-1">${h.name}</p>
                    ${streak > 1 ? `<span class="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black flex-shrink-0">🔥${streak}d</span>` : ''}
                  </div>
                  <p class="text-[10px] text-gray-400 line-clamp-1">${h.desc}</p>
                  <div class="mt-1.5 flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-700 ease-out ${done ? 'bg-emerald-500' : 'bg-gradient-to-r ' + h.color}" style="width:${Math.round(progress*100)}%"></div>
                    </div>
                    <span class="text-[10px] font-black ${done ? 'text-emerald-600' : 'text-gray-500'} w-12 text-right">${h.id === 'steps' ? (val/1000).toFixed(1)+'k' : val}/${h.id === 'steps' ? (h.goal/1000)+'k' : h.goal}</span>
                  </div>
                </div>
                <div class="flex flex-col gap-1 flex-shrink-0">
                  <button class="habit-inc w-9 h-9 rounded-xl ${done ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-indigo-50 text-indigo-600'} font-bold text-sm flex items-center justify-center active:scale-90 transition" data-id="${h.id}" data-delta="1">+</button>
                  ${val > 0 ? `<button class="habit-inc w-9 h-9 rounded-xl bg-gray-50 text-gray-400 font-bold text-xs flex items-center justify-center active:scale-90 transition" data-id="${h.id}" data-delta="-1">−</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- ═══ RESUMEN SEMANAL ═══ -->
      ${_renderWeeklyOverview(habits, streaks)}

      <!-- ═══ FILOSOFÍA ═══ -->
      <div class="px-4 mb-6">
        <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
          <p class="text-[11px] text-gray-400 italic leading-relaxed">"Que tu alimento sea tu medicina y tu medicina sea tu alimento"</p>
          <p class="text-[9px] text-gray-300 mt-1">— Hipócrates · La filosofía de MiDoctorYa</p>
        </div>
      </div>

      <!-- ═══ DESCARGO MÉDICO ═══ -->
      <div class="px-4 mb-8">
        <p class="text-[8px] text-gray-300 text-center leading-relaxed px-2">
          Las recomendaciones son orientativas basadas en guías internacionales (OMS, Harvard, NIH).
          No sustituyen consejo médico profesional. Dietas especiales solo bajo prescripción médica.
        </p>
      </div>

    </div>
  `;

  // ── EVENT HANDLERS ────────────────────────────────────────
  container.querySelectorAll('.habit-inc').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id, delta = parseInt(btn.dataset.delta);
      const log = _getDailyLog();
      const habit = habits.find(h => h.id === id);
      log[id] = Math.max(0, (log[id] || 0) + (id === 'steps' ? delta * 1000 : delta));
      _saveDailyLog(log);
      const done = habit.inverse ? log[id] <= habit.goal : log[id] >= habit.goal;
      _updateStreaks(id, done);
      renderHabits(container);
      if (done && delta > 0) showToast(`${habit.icon} ¡${habit.name} completado!`);
    };
  });

  container.querySelector('#quick-workout')?.addEventListener('click', () => _showWorkoutSetup(container));

  container.querySelector('#quick-water')?.addEventListener('click', () => {
    const log = _getDailyLog();
    log.water = (log.water || 0) + 1;
    _saveDailyLog(log);
    const habit = habits.find(h => h.id === 'water');
    if (habit && log.water >= habit.goal) _updateStreaks('water', true);
    showToast('💧 +1 vaso de agua');
    renderHabits(container);
  });

  container.querySelector('#quick-mood')?.addEventListener('click', () => {
    if (window._dyaNav?.navigateTo) window._dyaNav.navigateTo('stress');
  });

  container.querySelector('#quick-food')?.addEventListener('click', () => {
    if (window._dyaNav?.navigateTo) window._dyaNav.navigateTo('nutrition');
  });

  container.querySelector('#add-habit-btn')?.addEventListener('click', () => _showAddHabit(container));
  container.querySelector('#go-progress')?.addEventListener('click', () => _showProgress(container));

  _scheduleReminders();
}

/* ── Weekly Overview ────────────────────────────────────────── */
function _renderWeeklyOverview(habits, streaks) {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('dya_log_' + key) || '{}');
    let done = 0;
    habits.forEach(h => { const val = log[h.id] || 0; if (h.inverse ? val <= h.goal : val >= h.goal) done++; });
    days.push({ date: d, key, done, total: habits.length, pct: habits.length ? Math.round((done/habits.length)*100) : 0 });
  }

  return `
    <div class="px-4 mb-4">
      <h3 class="text-sm font-black text-gray-800 mb-3">Tu Semana</h3>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div class="flex justify-between items-end gap-1.5" style="height: 90px;">
          ${days.map(d => {
            const isToday = d.key === _todayKey();
            const h = Math.max(10, d.pct * 0.8);
            const barColor = d.pct >= 80 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' :
                             d.pct >= 40 ? 'bg-gradient-to-t from-indigo-500 to-indigo-400' :
                             d.pct > 0  ? 'bg-gradient-to-t from-gray-300 to-gray-200' : 'bg-gray-100';
            return `
              <div class="flex-1 flex flex-col items-center gap-1.5">
                ${d.pct >= 80 ? '<span class="text-[8px]">⭐</span>' : d.pct > 0 ? `<span class="text-[8px] text-gray-400">${d.pct}%</span>` : ''}
                <div class="w-full rounded-lg transition-all ${barColor} ${isToday ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}" style="height:${h}px"></div>
                <span class="text-[9px] font-semibold ${isToday ? 'text-indigo-600' : 'text-gray-400'}">${DIAS[d.date.getDay()]}</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ── Add Custom Habit ──────────────────────────────────────── */
function _showAddHabit(container) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-fade-in';
  overlay.innerHTML = `
    <div class="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 animate-slide-up">
      <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
      <h3 class="text-lg font-black text-gray-800 mb-1">Nueva Meta Personal</h3>
      <p class="text-xs text-gray-400 mb-4">Define un hábito que te acerque a tu mejor versión</p>
      <input type="text" id="habit-name" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 mb-3 transition" placeholder="Nombre (ej: Leer 20 minutos)">
      <div class="flex gap-3 mb-3">
        <div class="flex-1">
          <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Meta diaria</label>
          <input type="number" id="habit-goal" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition" placeholder="20" value="1">
        </div>
        <div class="flex-1">
          <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Unidad</label>
          <input type="text" id="habit-unit" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition" placeholder="min, vasos..." value="veces">
        </div>
      </div>
      <div class="mb-4">
        <label class="text-[10px] text-gray-400 font-bold uppercase mb-2 block">Elige un icono</label>
        <div class="flex flex-wrap gap-2" id="icon-picker">
          ${['📚','🏃','💊','🎵','🧹','✍️','🧠','💰','🎯','💤','🥤','🌿','🎨','📝','🤸','🧘'].map(e =>
            `<button class="icon-opt w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-lg flex items-center justify-center hover:border-indigo-300 transition active:scale-90" data-icon="${e}">${e}</button>`
          ).join('')}
        </div>
        <input type="hidden" id="habit-icon" value="⭐">
      </div>
      <div class="flex gap-3">
        <button id="habit-cancel" class="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-[0.98] transition">Cancelar</button>
        <button id="habit-save" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition">Crear Meta</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  // Icon picker
  overlay.querySelectorAll('.icon-opt').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      overlay.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('border-indigo-500', 'bg-indigo-50'));
      btn.classList.add('border-indigo-500', 'bg-indigo-50');
      overlay.querySelector('#habit-icon').value = btn.dataset.icon;
    };
  });
  overlay.querySelector('#habit-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#habit-save').onclick = () => {
    const name = overlay.querySelector('#habit-name').value.trim();
    const goal = parseInt(overlay.querySelector('#habit-goal').value) || 1;
    const unit = overlay.querySelector('#habit-unit').value.trim() || 'veces';
    const icon = overlay.querySelector('#habit-icon').value.trim() || '⭐';
    if (!name) { showToast('Escribe un nombre'); return; }
    const habits = _getHabits();
    habits.push({
      id: 'custom_' + Date.now(), icon, name, desc: `Meta: ${goal} ${unit} al día`,
      unit, goal, category: 'personal', source: 'Personal',
      color: 'from-indigo-400 to-purple-500', active: true,
    });
    _saveHabits(habits);
    overlay.remove();
    renderHabits(container);
    showToast(`${icon} ¡Meta "${name}" creada!`);
  };
}

/* ═════════════════════════════════════════════════════════════════════
   ██  WORKOUT TRACKER
   ═════════════════════════════════════════════════════════════════════ */
const LOCATIONS = [
  { key: 'home', icon: '🏠', label: 'Casa', desc: 'Entrena sin equipo, en tu espacio', color: 'from-amber-500 to-orange-500' },
  { key: 'gym',  icon: '🏋️', label: 'Gimnasio', desc: 'Máquinas, pesas y más', color: 'from-blue-500 to-indigo-600' },
  { key: 'outdoor', icon: '🌳', label: 'Aire Libre', desc: 'Parque, calle o naturaleza', color: 'from-green-500 to-emerald-600' },
];

function _showWorkoutSetup(container) {
  container.scrollTop = 0;
  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a, #1e1b4b, #312e81);">
        <div class="px-5 pt-11 pb-8">
          <button id="ws-back" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center mb-4 active:scale-90 transition">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 class="text-2xl font-black text-white">Iniciar Entrenamiento</h1>
          <p class="text-sm text-white/50 mt-1">¿Dónde entrenas hoy?</p>
        </div>
      </div>
      <div class="px-4 -mt-4 space-y-3 pb-8">
        ${LOCATIONS.map(loc => `
          <button data-loc="${loc.key}" class="loc-btn w-full bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${loc.color} flex items-center justify-center text-2xl shadow-lg">${loc.icon}</div>
            <div class="text-left flex-1">
              <p class="text-sm font-bold text-gray-800">${loc.label}</p>
              <p class="text-[11px] text-gray-400">${loc.desc}</p>
            </div>
            <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelector('#ws-back').onclick = () => renderHabits(container);
  container.querySelectorAll('.loc-btn').forEach(btn => {
    btn.onclick = () => _showExerciseSelect(container, btn.dataset.loc);
  });
}

async function _showExerciseSelect(container, location) {
  const age = _getUserAge();
  const defaultSets = age && age > 50 ? 2 : 3;
  const defaultReps = age && age > 50 ? 12 : 10;

  container.scrollTop = 0;
  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a, #1e1b4b, #312e81);">
        <div class="px-5 pt-11 pb-6">
          <button id="es-back" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center mb-3 active:scale-90 transition">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 class="text-xl font-black text-white">Arma tu Rutina</h1>
          <p class="text-sm text-white/50 mt-1">${LOCATIONS.find(l=>l.key===location)?.icon} ${LOCATIONS.find(l=>l.key===location)?.label}</p>
        </div>
      </div>
      <div class="px-4 mt-4 mb-3">
        <p class="text-[11px] text-gray-400 mb-2 font-semibold uppercase tracking-wider">Recomendados para ti</p>
        <div id="rec-list" class="flex gap-2 overflow-x-auto hide-scroll pb-2">
          <div class="skeleton w-28 h-14 flex-shrink-0 rounded-xl"></div>
          <div class="skeleton w-28 h-14 flex-shrink-0 rounded-xl"></div>
          <div class="skeleton w-28 h-14 flex-shrink-0 rounded-xl"></div>
        </div>
      </div>
      <div class="px-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-bold text-gray-800">Ejercicios seleccionados</h3>
          <button id="add-custom-ex" class="text-xs text-indigo-500 font-bold">+ Agregar</button>
        </div>
        <div id="sel-list" class="space-y-2 mb-4">
          <p class="text-center py-6 text-gray-300 text-sm">Toca los ejercicios de arriba para agregar</p>
        </div>
      </div>
      <div class="px-4 pb-8">
        <button id="go-btn" class="w-full py-4 rounded-2xl bg-gray-200 text-gray-400 font-bold text-sm cursor-not-allowed" disabled>Selecciona ejercicios</button>
      </div>
    </div>
  `;

  let selected = [];

  try {
    const data = await getRecommendations('male', 10);
    const recDiv = container.querySelector('#rec-list');
    const exs = data.exercises || [];
    if (recDiv && exs.length) {
      recDiv.innerHTML = exs.map(ex => `
        <button data-name="${ex.name}" data-bp="${ex.bodyPart||''}" class="rec-btn flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 text-left active:scale-95 transition min-w-[110px]">
          <p class="text-[11px] font-bold text-gray-700 capitalize line-clamp-1">${ex.name}</p>
          <p class="text-[9px] text-gray-400 capitalize">${tBP(ex.bodyPart||'')}</p>
        </button>
      `).join('');
      recDiv.querySelectorAll('.rec-btn').forEach(btn => {
        btn.onclick = () => {
          if (selected.find(e => e.name === btn.dataset.name)) return;
          selected.push({ name: btn.dataset.name, sets: defaultSets, reps: defaultReps, weight: 0 });
          btn.classList.add('border-indigo-500', 'bg-indigo-50');
          _renderSelExs(container, selected);
        };
      });
    }
  } catch(e) {}

  container.querySelector('#es-back').onclick = () => _showWorkoutSetup(container);
  container.querySelector('#add-custom-ex').onclick = () => {
    const name = prompt('Nombre del ejercicio:');
    if (name) { selected.push({ name, sets: defaultSets, reps: defaultReps, weight: 0 }); _renderSelExs(container, selected); }
  };
  container.querySelector('#go-btn').onclick = () => { if (selected.length) _startWorkout(container, location, selected); };

  function _renderSelExs(ctr, sel) {
    const div = ctr.querySelector('#sel-list'), btn = ctr.querySelector('#go-btn');
    if (!sel.length) {
      div.innerHTML = '<p class="text-center py-6 text-gray-300 text-sm">Toca los ejercicios de arriba para agregar</p>';
      btn.disabled = true; btn.className = 'w-full py-4 rounded-2xl bg-gray-200 text-gray-400 font-bold text-sm cursor-not-allowed'; return;
    }
    btn.disabled = false;
    btn.className = 'w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition';
    btn.textContent = `Iniciar (${sel.length} ejercicios)`;
    div.innerHTML = sel.map((ex, i) => `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold text-gray-800 capitalize">${ex.name}</p>
          <button class="rm-ex text-gray-300 hover:text-red-500" data-i="${i}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="flex gap-3 text-center">
          <div class="flex-1"><span class="text-[9px] text-gray-400 uppercase block">Series</span>
            <div class="flex items-center justify-center gap-1"><button class="adj s-m bg-gray-100 w-6 h-6 rounded text-xs" data-i="${i}">-</button><span class="text-sm font-bold w-5">${ex.sets}</span><button class="adj s-p bg-gray-100 w-6 h-6 rounded text-xs" data-i="${i}">+</button></div>
          </div>
          <div class="flex-1"><span class="text-[9px] text-gray-400 uppercase block">Reps</span>
            <div class="flex items-center justify-center gap-1"><button class="adj r-m bg-gray-100 w-6 h-6 rounded text-xs" data-i="${i}">-</button><span class="text-sm font-bold w-5">${ex.reps}</span><button class="adj r-p bg-gray-100 w-6 h-6 rounded text-xs" data-i="${i}">+</button></div>
          </div>
          <div class="flex-1"><span class="text-[9px] text-gray-400 uppercase block">Kg</span>
            <div class="flex items-center justify-center gap-1"><button class="adj w-m bg-gray-100 w-6 h-6 rounded text-xs" data-i="${i}">-</button><span class="text-sm font-bold w-5">${ex.weight}</span><button class="adj w-p bg-gray-100 w-6 h-6 rounded text-xs" data-i="${i}">+</button></div>
          </div>
        </div>
      </div>
    `).join('');
    div.querySelectorAll('.rm-ex').forEach(b => { b.onclick = () => { sel.splice(+b.dataset.i, 1); _renderSelExs(ctr, sel); }; });
    div.querySelectorAll('.s-m').forEach(b => { b.onclick = () => { const x = sel[+b.dataset.i]; if(x.sets>1){x.sets--;_renderSelExs(ctr,sel);} }; });
    div.querySelectorAll('.s-p').forEach(b => { b.onclick = () => { const x = sel[+b.dataset.i]; if(x.sets<10){x.sets++;_renderSelExs(ctr,sel);} }; });
    div.querySelectorAll('.r-m').forEach(b => { b.onclick = () => { const x = sel[+b.dataset.i]; if(x.reps>1){x.reps--;_renderSelExs(ctr,sel);} }; });
    div.querySelectorAll('.r-p').forEach(b => { b.onclick = () => { const x = sel[+b.dataset.i]; if(x.reps<50){x.reps++;_renderSelExs(ctr,sel);} }; });
    div.querySelectorAll('.w-m').forEach(b => { b.onclick = () => { const x = sel[+b.dataset.i]; if(x.weight>0){x.weight-=2.5;_renderSelExs(ctr,sel);} }; });
    div.querySelectorAll('.w-p').forEach(b => { b.onclick = () => { const x = sel[+b.dataset.i]; x.weight+=2.5;_renderSelExs(ctr,sel); }; });
  }
}

function _startWorkout(container, location, exercises) {
  const w = {
    startTime: Date.now(), location,
    exercises: exercises.map(e => ({ ...e, completed: Array(e.sets).fill(false) })),
    date: new Date().toISOString(), dayName: DIAS[new Date().getDay()],
  };
  _setActiveWorkout(w);
  _renderActiveWorkout(container, w);
  showToast('🏋️ ¡Entrenamiento iniciado!');
}

function _renderActiveWorkout(container, workout) {
  if (_timerInterval) clearInterval(_timerInterval);
  if (_twoHourTimeout) clearTimeout(_twoHourTimeout);
  const loc = LOCATIONS.find(l => l.key === workout.location) || LOCATIONS[0];
  const elapsed = Math.floor((Date.now() - workout.startTime) / 1000);
  const totalSets = workout.exercises.reduce((s,e) => s + e.completed.length, 0);
  const doneSets = workout.exercises.reduce((s,e) => s + e.completed.filter(Boolean).length, 0);

  container.scrollTop = 0;
  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="bg-gradient-to-br ${loc.color} text-white px-5 pt-11 pb-6 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">${loc.icon}</span>
          <p class="text-xs text-white/60 font-medium">${loc.label} · ${workout.dayName}</p>
        </div>
        <p id="wk-timer" class="text-5xl font-black tracking-wider font-mono text-center">${_formatTime(elapsed)}</p>
        <div class="flex justify-center mt-2 gap-4">
          <div class="text-center"><p class="text-lg font-black">${doneSets}</p><p class="text-[9px] text-white/50">completadas</p></div>
          <div class="text-center"><p class="text-lg font-black">${totalSets}</p><p class="text-[9px] text-white/50">total series</p></div>
        </div>
      </div>
      <div class="px-4 mt-4 space-y-2 mb-4" id="wk-exercises">
        ${workout.exercises.map((ex, i) => `
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-bold text-gray-800 capitalize">${ex.name}</p>
              <span class="text-[10px] text-gray-400">${ex.weight > 0 ? ex.weight+'kg' : 'Sin peso'}</span>
            </div>
            <div class="flex gap-1.5">
              ${ex.completed.map((done, s) => `
                <button class="set-btn flex-1 h-10 rounded-lg text-xs font-bold transition-all ${done ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 active:scale-95'}" data-e="${i}" data-s="${s}">
                  ${done ? '✓' : 'S'+(s+1)} <span class="text-[9px]">${ex.reps}r</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="px-4 pb-8">
        <button id="end-btn" class="w-full py-4 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2">
          ⏹ Terminar Entrenamiento
        </button>
      </div>
    </div>
  `;

  _timerInterval = setInterval(() => {
    const el = container.querySelector('#wk-timer');
    if (el) el.textContent = _formatTime(Math.floor((Date.now() - workout.startTime) / 1000));
  }, 1000);

  const rem = (2*60*60*1000) - (Date.now() - workout.startTime);
  if (rem > 0) {
    _twoHourTimeout = setTimeout(() => {
      if (confirm('Llevas 2 horas entrenando. ¿Sigues?')) {
        _twoHourTimeout = setTimeout(() => {}, 2*60*60*1000);
      } else { _finishWk(container, workout); }
    }, rem);
  }

  container.querySelectorAll('.set-btn').forEach(btn => {
    btn.onclick = () => {
      const e = +btn.dataset.e, s = +btn.dataset.s;
      workout.exercises[e].completed[s] = !workout.exercises[e].completed[s];
      _setActiveWorkout(workout);
      _renderActiveWorkout(container, workout);
    };
  });
  container.querySelector('#end-btn').onclick = () => _finishWk(container, workout);
}

function _finishWk(container, workout) {
  if (_timerInterval) clearInterval(_timerInterval);
  if (_twoHourTimeout) clearTimeout(_twoHourTimeout);

  const duration = Math.floor((Date.now() - workout.startTime) / 1000);
  const durationMin = Math.round(duration / 60);
  const totalSets = workout.exercises.reduce((s,e) => s + e.completed.filter(Boolean).length, 0);
  const calories = Math.round(durationMin * (totalSets > 10 ? 8 : 6));

  const history = JSON.parse(localStorage.getItem('dya_workouts') || '[]');
  history.push({
    date: workout.date, dayName: workout.dayName, location: workout.location,
    exercises: workout.exercises.map(e => ({ name: e.name, sets: e.completed.filter(Boolean).length, reps: e.reps, weight: e.weight })),
    duration, totalSets, calories,
  });
  localStorage.setItem('dya_workouts', JSON.stringify(history));
  _setActiveWorkout(null);

  const log = _getDailyLog();
  log.exercise = (log.exercise || 0) + durationMin;
  _saveDailyLog(log);
  const habit = _getHabits().find(h => h.id === 'exercise');
  if (habit && log.exercise >= habit.goal) _updateStreaks('exercise', true);

  const loc = LOCATIONS.find(l => l.key === workout.location) || LOCATIONS[0];
  container.scrollTop = 0;
  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="relative overflow-hidden text-center" style="background: linear-gradient(135deg, #0f172a, #1e1b4b, #312e81);">
        <div class="px-5 pt-14 pb-10">
          <div class="text-6xl mb-3 animate-pop">🎉</div>
          <h1 class="text-2xl font-black text-white">¡Completado!</h1>
          <p class="text-sm text-white/50 mt-1">${loc.icon} ${loc.label} · ${workout.dayName}</p>
        </div>
      </div>
      <div class="px-4 -mt-6">
        <div class="bg-white rounded-2xl shadow-lg p-5">
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="text-center"><p class="text-xl font-black text-indigo-600">${_formatTime(duration)}</p><p class="text-[10px] text-gray-400">Duración</p></div>
            <div class="text-center"><p class="text-xl font-black text-indigo-600">${totalSets}</p><p class="text-[10px] text-gray-400">Series</p></div>
            <div class="text-center"><p class="text-xl font-black text-indigo-600">~${calories}</p><p class="text-[10px] text-gray-400">Kcal</p></div>
          </div>
          <div class="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <p class="text-[11px] text-emerald-700 font-semibold">💪 ¡Cada minuto de ejercicio suma salud a tu vida!</p>
          </div>
        </div>
      </div>
      <div class="px-4 mt-4 space-y-2 pb-8">
        <button id="go-nutrition" class="w-full py-3.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm active:scale-[0.98] transition border border-emerald-100">🥗 Registrar comida post-entreno</button>
        <button id="go-stress" class="w-full py-3.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm active:scale-[0.98] transition border border-indigo-100">🧘 Relajación post-entreno</button>
        <button id="go-back" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition">Volver al Inicio</button>
      </div>
    </div>
  `;
  container.querySelector('#go-nutrition').onclick = () => { if(window._dyaNav?.navigateTo) window._dyaNav.navigateTo('nutrition'); };
  container.querySelector('#go-stress').onclick = () => { if(window._dyaNav?.navigateTo) window._dyaNav.navigateTo('stress'); };
  container.querySelector('#go-back').onclick = () => renderHabits(container);
}

/* ═════════════════════════════════════════════════════════════════════
   ██  PROGRESS / METRICS PAGE
   ═════════════════════════════════════════════════════════════════════ */
function _showProgress(container) {
  container.scrollTop = 0;
  const metrics = _getMetrics();
  const habits = _getHabits().filter(h => h.active);
  const streaks = _getStreaks();
  const workouts = JSON.parse(localStorage.getItem('dya_workouts') || '[]');

  // ── 30-day habit completion data ──
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('dya_log_' + key) || '{}');
    let done = 0;
    habits.forEach(h => { const val = log[h.id] || 0; if (h.inverse ? val <= h.goal : val >= h.goal) done++; });
    const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;
    last30.push({ date: d, key, pct, day: d.getDate() });
  }

  // ── Weight chart SVG ──
  const weightEntries = metrics.weight || [];
  let weightSVG = '';
  if (weightEntries.length >= 2) {
    const vals = weightEntries.slice(-20);
    const minW = Math.min(...vals.map(v => v.value)) - 1;
    const maxW = Math.max(...vals.map(v => v.value)) + 1;
    const rangeW = maxW - minW || 1;
    const svgW = 320, svgH = 120, padX = 10, padY = 10;
    const points = vals.map((v, i) => {
      const x = padX + (i / (vals.length - 1)) * (svgW - 2 * padX);
      const y = padY + (1 - (v.value - minW) / rangeW) * (svgH - 2 * padY);
      return { x, y, val: v.value, date: v.date };
    });
    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const dots = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#818CF8" stroke="white" stroke-width="1.5"/>`).join('');
    const labels = [points[0], points[points.length - 1]].map(p =>
      `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="#818CF8" font-size="9" font-weight="bold">${p.val}</text>`
    ).join('');
    weightSVG = `
      <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full" style="height:${svgH}px">
        <polyline points="${polyline}" fill="none" stroke="url(#wGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <defs><linearGradient id="wGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#34D399"/></linearGradient></defs>
        ${dots}
        ${labels}
      </svg>`;
  } else if (weightEntries.length === 1) {
    weightSVG = `<p class="text-center text-gray-400 text-xs py-4">Agrega al menos 2 registros de peso para ver la gráfica</p>`;
  } else {
    weightSVG = `<p class="text-center text-gray-400 text-xs py-4">Sin registros de peso aún</p>`;
  }

  // ── Latest values ──
  const latestWeight = weightEntries.length ? weightEntries[weightEntries.length - 1].value : '';
  const currentHeight = metrics.height || '';
  const latestRunning = (metrics.running_km || []).length ? metrics.running_km[metrics.running_km.length - 1].value : '';
  const latestBike = (metrics.bike_km || []).length ? metrics.bike_km[metrics.bike_km.length - 1].value : '';
  const latestPress = (metrics.press_kg || []).length ? metrics.press_kg[metrics.press_kg.length - 1].value : '';
  const latestBar = (metrics.bar_kg || []).length ? metrics.bar_kg[metrics.bar_kg.length - 1].value : '';

  // ── Best streak per habit ──
  const habitStreaks = habits.map(h => {
    const s = streaks[h.id];
    return { icon: h.icon, name: h.name, best: s?.best || 0, current: s?.current || 0 };
  });

  container.innerHTML = `
    <div class="animate-fade-in">

      <!-- ═══ HEADER ═══ -->
      <div class="relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #4338ca 100%);">
        <div class="absolute top-[-40px] right-[-40px] w-52 h-52 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-[-30px] left-[-20px] w-36 h-36 bg-purple-500/10 rounded-full blur-2xl"></div>
        <div class="px-5 pt-11 pb-6 relative z-10">
          <button id="prog-back" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center mb-4 active:scale-90 transition">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 class="text-2xl font-black text-white">Mi Progreso</h1>
          <p class="text-sm text-white/50 mt-1">Métricas, marcas y evolución</p>
        </div>
      </div>

      <!-- ═══ MIS NÚMEROS ═══ -->
      <div class="px-4 mt-5 mb-4">
        <h3 class="text-sm font-black text-gray-800 mb-3">Mis Números</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Peso</p>
            <p class="text-xl font-black text-gray-800 mb-2">${latestWeight ? latestWeight + ' <span class="text-xs text-gray-400 font-normal">kg</span>' : '<span class="text-sm text-gray-300">--</span>'}</p>
            <div class="flex gap-1.5">
              <input type="number" step="0.1" id="inp-weight" class="flex-1 bg-gray-50 rounded-lg py-2 px-2.5 text-xs outline-none border border-gray-200 focus:border-indigo-300 transition w-full" placeholder="kg">
              <button id="add-weight" class="px-3 py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold active:scale-95 transition">+</button>
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Estatura</p>
            <p class="text-xl font-black text-gray-800 mb-2">${currentHeight ? currentHeight + ' <span class="text-xs text-gray-400 font-normal">cm</span>' : '<span class="text-sm text-gray-300">--</span>'}</p>
            <div class="flex gap-1.5">
              <input type="number" id="inp-height" class="flex-1 bg-gray-50 rounded-lg py-2 px-2.5 text-xs outline-none border border-gray-200 focus:border-indigo-300 transition w-full" placeholder="cm">
              <button id="save-height" class="px-3 py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold active:scale-95 transition">OK</button>
            </div>
          </div>
        </div>
        ${latestWeight && currentHeight ? `
        <div class="mt-3 bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100 text-center">
          <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">IMC</p>
          <p class="text-lg font-black text-indigo-700">${(latestWeight / ((currentHeight/100) ** 2)).toFixed(1)}</p>
          <p class="text-[10px] text-indigo-400">${(function(b){if(b<18.5)return'Bajo peso';if(b<25)return'Normal';if(b<30)return'Sobrepeso';return'Obesidad'})(latestWeight/((currentHeight/100)**2))}</p>
        </div>` : ''}
      </div>

      <!-- ═══ MIS METAS ═══ -->
      <div class="px-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-black text-gray-800">Mis Metas</h3>
          <button id="new-goal-btn" class="text-[11px] text-indigo-500 font-bold flex items-center gap-1 active:scale-95 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            Nueva Meta
          </button>
        </div>
        <div id="goals-container" class="space-y-2">
          ${(function() {
            var goals = _getGoals();
            var activeGoals = goals.filter(function(g) { return g.status === 'active'; });
            if (!activeGoals.length) {
              return '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center"><p class="text-gray-300 text-sm">Sin metas activas</p><p class="text-[10px] text-gray-300 mt-1">Crea una meta para seguir tu progreso</p></div>';
            }
            return activeGoals.map(function(goal) {
              var cfg = GOAL_METRIC_CONFIG[goal.metric] || { icon: '🎯', label: goal.metric, unit: '', borderColor: 'border-l-gray-400', color: '#6B7280' };
              var prog = _calcGoalProgress(goal);
              var dirLabel = goal.direction === 'increase' ? 'Aumentar' : 'Disminuir';
              var statusBadge = '';
              if (prog.completed) {
                statusBadge = '<span class="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Completada</span>';
              } else if (prog.expired) {
                statusBadge = '<span class="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Tiempo agotado</span>';
              } else {
                statusBadge = '<span class="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Activa</span>';
              }
              var actionBtns = '';
              if (prog.completed) {
                actionBtns = '<div class="mt-2 bg-emerald-50 rounded-lg px-3 py-2 text-center border border-emerald-100"><p class="text-[11px] text-emerald-700 font-bold">🎉 ¡Meta alcanzada! ¡Felicidades!</p></div>';
              } else if (prog.expired) {
                actionBtns = '<div class="mt-2 flex gap-2"><button class="goal-extend flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold active:scale-95 transition border border-indigo-100" data-id="' + goal.id + '">Extender 4 semanas</button><button class="goal-abandon flex-1 py-2 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold active:scale-95 transition border border-red-100" data-id="' + goal.id + '">Abandonar</button></div>';
              }
              return '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ' + cfg.borderColor + ' p-3.5">' +
                '<div class="flex items-center justify-between mb-1.5">' +
                  '<div class="flex items-center gap-2">' +
                    '<span class="text-lg">' + cfg.icon + '</span>' +
                    '<p class="text-xs font-bold text-gray-800">' + dirLabel + ' ' + cfg.label + '</p>' +
                  '</div>' +
                  statusBadge +
                '</div>' +
                '<p class="text-[11px] text-gray-500 mb-2">' + goal.currentValue + ' ' + cfg.unit + ' → ' + goal.target + ' ' + cfg.unit +
                  (prog.weeksLeft !== undefined && !prog.completed && !prog.expired ? ' · ' + prog.weeksLeft + ' semana' + (prog.weeksLeft !== 1 ? 's' : '') + ' restante' + (prog.weeksLeft !== 1 ? 's' : '') : '') +
                '</p>' +
                '<div class="flex items-center gap-2">' +
                  '<div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">' +
                    '<div class="h-full rounded-full transition-all duration-700 ease-out" style="width:' + prog.pct + '%;background:' + cfg.color + '"></div>' +
                  '</div>' +
                  '<span class="text-[10px] font-black text-gray-500">' + prog.pct + '%</span>' +
                '</div>' +
                actionBtns +
              '</div>';
            }).join('');
          })()}
        </div>
      </div>

      <!-- ═══ REGISTRO DE MARCAS ═══ -->
      <div class="px-4 mb-4">
        <h3 class="text-sm font-black text-gray-800 mb-3">Registro de Marcas</h3>
        <div class="space-y-2">
          ${[
            { key: 'running_km', icon: '🏃', label: 'Running', unit: 'km', latest: latestRunning },
            { key: 'bike_km', icon: '🚴', label: 'Bicicleta', unit: 'km', latest: latestBike },
            { key: 'press_kg', icon: '💪', label: 'Press', unit: 'kg', latest: latestPress },
            { key: 'bar_kg', icon: '🏋️', label: 'Barra', unit: 'kg', latest: latestBar },
          ].map(m => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
              <span class="text-xl">${m.icon}</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-800">${m.label}</p>
                <p class="text-[10px] text-gray-400">${m.latest ? 'Último: ' + m.latest + ' ' + m.unit : 'Sin registro'}</p>
              </div>
              <div class="flex gap-1.5">
                <input type="number" step="0.1" class="mark-inp bg-gray-50 rounded-lg py-2 px-2 text-xs outline-none border border-gray-200 focus:border-indigo-300 transition w-16" placeholder="${m.unit}" data-key="${m.key}">
                <button class="mark-add px-2.5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold active:scale-95 transition" data-key="${m.key}">+</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ GRÁFICA DE HÁBITOS (30 DÍAS) ═══ -->
      <div class="px-4 mb-4">
        <h3 class="text-sm font-black text-gray-800 mb-3">Hábitos — Últimos 30 Días</h3>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div class="flex items-end gap-[3px]" style="height:100px;">
            ${last30.map(d => {
              const h = Math.max(4, d.pct * 0.9);
              const color = d.pct >= 80 ? 'background:linear-gradient(to top,#10b981,#34d399)' :
                            d.pct >= 40 ? 'background:linear-gradient(to top,#6366f1,#818cf8)' :
                            d.pct > 0  ? 'background:linear-gradient(to top,#d1d5db,#e5e7eb)' : 'background:#f3f4f6';
              return `<div class="flex-1 rounded-t-sm transition-all" style="height:${h}px;${color}" title="${d.key}: ${d.pct}%"></div>`;
            }).join('')}
          </div>
          <div class="flex justify-between mt-2">
            <span class="text-[8px] text-gray-400">Hace 30d</span>
            <span class="text-[8px] text-gray-400">Hoy</span>
          </div>
          <div class="flex items-center justify-center gap-4 mt-2">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm" style="background:#10b981"></span><span class="text-[8px] text-gray-400">80%+</span></span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm" style="background:#6366f1"></span><span class="text-[8px] text-gray-400">40-79%</span></span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm" style="background:#d1d5db"></span><span class="text-[8px] text-gray-400">1-39%</span></span>
          </div>
        </div>
      </div>

      <!-- ═══ GRÁFICA DE PESO ═══ -->
      <div class="px-4 mb-4">
        <h3 class="text-sm font-black text-gray-800 mb-3">Evolución de Peso</h3>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          ${weightSVG}
        </div>
      </div>

      <!-- ═══ RACHA MÁS LARGA POR HÁBITO ═══ -->
      <div class="px-4 mb-4">
        <h3 class="text-sm font-black text-gray-800 mb-3">Rachas por Hábito</h3>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-2">
          ${habitStreaks.length ? habitStreaks.map(h => {
            const barW = h.best > 0 ? Math.min(100, (h.best / Math.max(...habitStreaks.map(x => x.best), 1)) * 100) : 0;
            return `
              <div class="flex items-center gap-2.5">
                <span class="text-base w-7 text-center">${h.icon}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-0.5">
                    <p class="text-[11px] font-bold text-gray-700 truncate">${h.name}</p>
                    <p class="text-[10px] font-black ${h.best > 0 ? 'text-indigo-600' : 'text-gray-300'}">${h.best > 0 ? h.best + 'd' : '--'}</p>
                  </div>
                  <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style="width:${barW}%"></div>
                  </div>
                </div>
              </div>`;
          }).join('') : '<p class="text-center text-gray-400 text-xs py-3">Aún no hay rachas registradas</p>'}
        </div>
      </div>

      <!-- ═══ HISTORIAL DE ENTRENAMIENTOS ═══ -->
      <div class="px-4 mb-6">
        <h3 class="text-sm font-black text-gray-800 mb-3">Historial de Entrenamientos</h3>
        <div class="space-y-2">
          ${workouts.length ? workouts.slice(-10).reverse().map(w => {
            const loc = LOCATIONS.find(l => l.key === w.location) || LOCATIONS[0];
            const dur = w.duration ? _formatTime(w.duration) : '--';
            return `
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${loc.color} flex items-center justify-center text-lg flex-shrink-0">${loc.icon}</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-bold text-gray-800">${w.dayName || ''} · ${loc.label}</p>
                      <p class="text-[9px] text-gray-400">${w.date ? w.date.split('T')[0] : ''}</p>
                    </div>
                    <div class="flex gap-3 mt-1">
                      <span class="text-[10px] text-gray-500">⏱ ${dur}</span>
                      <span class="text-[10px] text-gray-500">${w.totalSets || 0} series</span>
                      <span class="text-[10px] text-gray-500">~${w.calories || 0} kcal</span>
                    </div>
                    <p class="text-[9px] text-gray-400 mt-0.5 truncate">${(w.exercises || []).map(e => e.name).join(', ')}</p>
                  </div>
                </div>
              </div>`;
          }).join('') : `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p class="text-gray-300 text-sm">Sin entrenamientos registrados</p>
              <p class="text-[10px] text-gray-300 mt-1">Empieza uno desde la pantalla principal</p>
            </div>`}
        </div>
      </div>

      <div class="h-8"></div>
    </div>
  `;

  // ── Event handlers ──
  container.querySelector('#prog-back').onclick = () => renderHabits(container);

  container.querySelector('#add-weight')?.addEventListener('click', () => {
    const inp = container.querySelector('#inp-weight');
    const val = parseFloat(inp.value);
    if (!val || val <= 0) { showToast('Ingresa un peso válido'); return; }
    _addMetric('weight', val);
    showToast('⚖️ Peso registrado: ' + val + ' kg');
    _showProgress(container);
  });

  container.querySelector('#save-height')?.addEventListener('click', () => {
    const inp = container.querySelector('#inp-height');
    const val = parseFloat(inp.value);
    if (!val || val <= 0) { showToast('Ingresa una estatura válida'); return; }
    const m = _getMetrics();
    m.height = val;
    _saveMetrics(m);
    showToast('📏 Estatura guardada: ' + val + ' cm');
    _showProgress(container);
  });

  container.querySelectorAll('.mark-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const inp = container.querySelector(`.mark-inp[data-key="${key}"]`);
      const val = parseFloat(inp.value);
      if (!val || val <= 0) { showToast('Ingresa un valor válido'); return; }
      _addMetric(key, val);
      const labels = { running_km: '🏃 Running', bike_km: '🚴 Bicicleta', press_kg: '💪 Press', bar_kg: '🏋️ Barra' };
      showToast(`${labels[key] || key}: ${val} registrado`);
      _showProgress(container);
    });
  });

  // ── Goal event handlers ──
  container.querySelector('#new-goal-btn')?.addEventListener('click', () => _showGoalCreation(container));

  container.querySelectorAll('.goal-extend').forEach(btn => {
    btn.addEventListener('click', () => {
      const goals = _getGoals();
      const goal = goals.find(g => g.id === btn.dataset.id);
      if (goal) { goal.weeks += 4; _saveGoals(goals); showToast('🎯 Meta extendida 4 semanas'); _showProgress(container); }
    });
  });

  container.querySelectorAll('.goal-abandon').forEach(btn => {
    btn.addEventListener('click', () => {
      const goals = _getGoals();
      const goal = goals.find(g => g.id === btn.dataset.id);
      if (goal) { goal.status = 'abandoned'; _saveGoals(goals); showToast('Meta abandonada'); _showProgress(container); }
    });
  });

  // Auto-complete goals
  (function() {
    const goals = _getGoals();
    let changed = false;
    goals.forEach(function(g) {
      if (g.status !== 'active') return;
      const prog = _calcGoalProgress(g);
      if (prog.completed) { g.status = 'completed'; changed = true; }
    });
    if (changed) { _saveGoals(goals); _showProgress(container); }
  })();
}

/* ═════════════════════════════════════════════════════════════════════
   ██  GOAL CREATION OVERLAY
   ═════════════════════════════════════════════════════════════════════ */
function _showGoalCreation(container) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-fade-in';
  overlay.style.overflowY = 'auto';

  const metricOptions = Object.keys(GOAL_METRIC_CONFIG).map(function(k) {
    const c = GOAL_METRIC_CONFIG[k];
    return '<option value="' + k + '">' + c.icon + ' ' + c.label + ' (' + c.unit + ')</option>';
  }).join('');

  overlay.innerHTML = [
    '<div class="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 animate-slide-up" style="max-height:90vh;overflow-y:auto">',
    '  <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>',
    '  <div class="relative overflow-hidden rounded-2xl p-5 mb-4" style="background:linear-gradient(135deg,#312e81,#4338ca,#6366f1)">',
    '    <div class="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>',
    '    <h3 class="text-lg font-black text-white relative z-10">Nueva Meta de Salud</h3>',
    '    <p class="text-xs text-white/60 mt-1 relative z-10">Define un objetivo medible y seguro</p>',
    '  </div>',
    '  <div class="space-y-3">',
    '    <div>',
    '      <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Métrica</label>',
    '      <select id="goal-metric" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition">' + metricOptions + '</select>',
    '    </div>',
    '    <div>',
    '      <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Dirección</label>',
    '      <select id="goal-direction" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition">',
    '        <option value="increase">Aumentar</option>',
    '        <option value="decrease">Disminuir</option>',
    '      </select>',
    '    </div>',
    '    <div class="flex gap-3">',
    '      <div class="flex-1">',
    '        <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Valor actual</label>',
    '        <input type="number" step="0.1" id="goal-current" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition" placeholder="0">',
    '      </div>',
    '      <div class="flex-1">',
    '        <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Meta objetivo</label>',
    '        <input type="number" step="0.1" id="goal-target" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition" placeholder="0">',
    '      </div>',
    '    </div>',
    '    <div>',
    '      <label class="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Plazo (semanas, 1-52)</label>',
    '      <input type="number" min="1" max="52" id="goal-weeks" class="w-full bg-gray-50 rounded-xl py-3.5 px-4 text-sm outline-none border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition" placeholder="4" value="4">',
    '    </div>',
    '    <div id="goal-validation-area"></div>',
    '  </div>',
    '  <div class="flex gap-3 mt-4">',
    '    <button id="goal-cancel" class="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-[0.98] transition">Cancelar</button>',
    '    <button id="goal-save" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition">Crear Meta</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var metricSelect = overlay.querySelector('#goal-metric');
  var dirSelect = overlay.querySelector('#goal-direction');
  var currentInp = overlay.querySelector('#goal-current');

  function updateDirectionOptions() {
    var cfg = GOAL_METRIC_CONFIG[metricSelect.value];
    if (!cfg) return;
    dirSelect.innerHTML = cfg.directions.map(function(d) {
      return '<option value="' + d + '">' + (d === 'increase' ? 'Aumentar' : 'Disminuir') + '</option>';
    }).join('');
  }

  function autoFillCurrent() {
    var cfg = GOAL_METRIC_CONFIG[metricSelect.value];
    if (!cfg) return;
    var latest = _getLatestMetricValue(cfg.metricKey);
    if (latest !== null) currentInp.value = latest;
    else currentInp.value = '';
  }

  metricSelect.addEventListener('change', function() {
    updateDirectionOptions();
    autoFillCurrent();
    overlay.querySelector('#goal-validation-area').innerHTML = '';
  });

  updateDirectionOptions();
  autoFillCurrent();

  overlay.querySelector('#goal-cancel').onclick = function() { overlay.remove(); };

  overlay.querySelector('#goal-save').onclick = function() {
    var metric = metricSelect.value;
    var direction = dirSelect.value;
    var current = parseFloat(currentInp.value);
    var target = parseFloat(overlay.querySelector('#goal-target').value);
    var weeks = parseInt(overlay.querySelector('#goal-weeks').value);

    if (isNaN(current) || isNaN(target) || !weeks || weeks < 1 || weeks > 52) {
      showToast('Completa todos los campos correctamente');
      return;
    }
    if (direction === 'increase' && target <= current) {
      showToast('La meta debe ser mayor al valor actual');
      return;
    }
    if (direction === 'decrease' && target >= current) {
      showToast('La meta debe ser menor al valor actual');
      return;
    }

    var validation = _validateGoalRate(metric, direction, current, target, weeks);

    if (!validation.safe) {
      _showGoalWarning(overlay, container, metric, direction, current, target, weeks, validation);
    } else {
      _createGoal(metric, direction, current, target, weeks);
      overlay.remove();
      showToast('🎯 ¡Meta creada exitosamente!');
      _showProgress(container);
    }
  };
}

function _showGoalWarning(overlay, container, metric, direction, current, target, weeks, validation) {
  var area = overlay.querySelector('#goal-validation-area');
  var cfg = GOAL_METRIC_CONFIG[metric] || { unit: '' };
  area.innerHTML = [
    '<div class="bg-amber-50 rounded-xl border border-amber-200 p-4 mt-2 animate-slide-up">',
    '  <div class="flex items-start gap-2 mb-2">',
    '    <span class="text-xl">⚠️</span>',
    '    <div>',
    '      <p class="text-xs font-bold text-amber-800 mb-1">Ritmo superior al recomendado</p>',
    '      <p class="text-[11px] text-amber-700 leading-relaxed">' + validation.limit.warning + '</p>',
    '      <p class="text-[10px] text-amber-600 mt-1">Máximo recomendado: <strong>' + validation.limit.maxPerWeek + ' ' + validation.limit.unit + '/semana</strong></p>',
    '      <p class="text-[10px] text-amber-600">Tu ritmo: <strong>' + validation.ratePerWeek.toFixed(2) + ' ' + cfg.unit + '/semana</strong></p>',
    '      <p class="text-[9px] text-amber-500 mt-1">Fuente: ' + validation.limit.source + '</p>',
    '    </div>',
    '  </div>',
    '  <p class="text-[11px] text-amber-800 font-semibold mb-3">Esta meta podría no ser saludable según estándares internacionales de medicina</p>',
    '  <div class="flex gap-2">',
    '    <button id="goal-adjust" class="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold active:scale-95 transition">Ajustar meta (' + validation.safeWeeks + ' sem)</button>',
    '    <button id="goal-override" class="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold active:scale-95 transition">Continuar bajo mi responsabilidad</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  area.querySelector('#goal-adjust').onclick = function() {
    overlay.querySelector('#goal-weeks').value = validation.safeWeeks;
    area.innerHTML = '<div class="bg-emerald-50 rounded-xl border border-emerald-200 p-3 mt-2"><p class="text-[11px] text-emerald-700 font-semibold">✅ Plazo ajustado a ' + validation.safeWeeks + ' semanas (ritmo seguro). Pulsa "Crear Meta".</p></div>';
  };

  area.querySelector('#goal-override').onclick = function() {
    _showGoalDisclaimer(area, overlay, container, metric, direction, current, target, weeks);
  };
}

function _showGoalDisclaimer(area, overlay, container, metric, direction, current, target, weeks) {
  area.innerHTML = [
    '<div class="bg-red-50 rounded-xl border border-red-200 p-4 mt-2 animate-slide-up">',
    '  <div class="flex items-start gap-2 mb-3">',
    '    <span class="text-xl">⚕️</span>',
    '    <div>',
    '      <p class="text-xs font-bold text-red-800 mb-1">AVISO MÉDICO</p>',
    '      <p class="text-[11px] text-red-700 leading-relaxed">Para fijar esta meta se recomienda agendar una cita con un profesional de la salud. MiDoctorYa no reemplaza el consejo médico profesional.</p>',
    '    </div>',
    '  </div>',
    '  <div class="space-y-2">',
    '    <button id="goal-appointment" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold active:scale-95 transition shadow-md">📅 Agendar cita médica</button>',
    '    <button id="goal-understood" class="w-full py-2.5 rounded-lg bg-red-500 text-white text-[11px] font-bold active:scale-95 transition">Entendido, crear meta</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  area.querySelector('#goal-appointment').onclick = function() {
    overlay.remove();
    if (window._dyaNav && window._dyaNav.navigateTo) window._dyaNav.navigateTo('appointments');
  };

  area.querySelector('#goal-understood').onclick = function() {
    _createGoal(metric, direction, current, target, weeks);
    overlay.remove();
    showToast('🎯 Meta creada (consulta un profesional de salud)');
    _showProgress(container);
  };
}

function _createGoal(metric, direction, current, target, weeks) {
  var goals = _getGoals();
  goals.push({
    id: 'goal_' + Date.now(),
    metric: metric,
    direction: direction,
    target: target,
    currentValue: current,
    weeks: weeks,
    createdAt: new Date().toISOString().split('T')[0],
    status: 'active'
  });
  _saveGoals(goals);
}
