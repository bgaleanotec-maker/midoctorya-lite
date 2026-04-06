/* ── Fitness Module — MiDoctorYa Lite (Production) ──────────────────── */
import { t, tBP } from './i18n.js';
import { getBodyParts, searchExercises, getExercisesByBodyPart, getExerciseDetail, getRecommendations, getSimilarByTarget, API_BASE_URL } from './api.js';
import { showToast } from './app.js';

/* Resolve gifUrl: backend returns relative paths like /api/v1/fitness/external/gif/0025
   We need to prepend the backend origin so <img src> works */
function _gifSrc(gifUrl) {
  if (!gifUrl) return '';
  if (gifUrl.startsWith('http')) return gifUrl;
  return 'http://localhost:5000' + gifUrl;
}

/* ── Traduccion de nombres de ejercicios ─────────────────── */
const EXERCISE_NAMES_ES = {
  'assisted chest dip (kneeling)':'Fondo de pecho asistido (rodillas)',
  'barbell bench press':'Press de banca con barra',
  'barbell decline bench press':'Press declinado con barra',
  'barbell decline wide-grip press':'Press declinado agarre ancho',
  'barbell front raise and pullover':'Elevacion frontal y pullover',
  'barbell incline bench press':'Press inclinado con barra',
  'barbell lying close-grip press':'Press acostado agarre cerrado',
  'barbell lying close-grip triceps extension':'Extension de triceps acostado',
  'barbell pullover':'Pullover con barra',
  'barbell reverse grip bench press':'Press de banca agarre invertido',
  'barbell wide bench press':'Press de banca agarre amplio',
  'cable bench press':'Press de banca con cable',
  'cable cross-over':'Cruce de cables',
  'cable decline fly':'Aperturas declinadas con cable',
  'cable fly':'Aperturas con cable',
  'chest dip':'Fondo de pecho',
  'chest dip (on dip-Loss machine)':'Fondo de pecho en maquina',
  'close-grip push-up':'Flexion agarre cerrado',
  'decline push-up':'Flexion declinada',
  'dumbbell around pullover':'Pullover circular con mancuerna',
  'dumbbell bench press':'Press de banca con mancuernas',
  'dumbbell cross body hammer curl':'Curl martillo cruzado',
  'dumbbell decline bench press':'Press declinado con mancuernas',
  'dumbbell decline fly':'Aperturas declinadas con mancuernas',
  'dumbbell fly':'Aperturas con mancuernas',
  'dumbbell incline bench press':'Press inclinado con mancuernas',
  'dumbbell incline fly':'Aperturas inclinadas con mancuernas',
  'dumbbell pullover':'Pullover con mancuerna',
  'dumbbell squeeze bench press':'Press de banca squeeze',
  'incline push-up':'Flexion inclinada',
  'kneeling push-up':'Flexion de rodillas',
  'lever chest press':'Press de pecho en maquina',
  'lever decline chest press':'Press declinado en maquina',
  'lever incline chest press':'Press inclinado en maquina',
  'push-up':'Flexion de pecho',
  'wide hand push-up':'Flexion manos separadas',
  'smith machine bench press':'Press de banca Smith',
  // Back
  'barbell bent over row':'Remo inclinado con barra',
  'barbell deadlift':'Peso muerto con barra',
  'cable lat pulldown':'Jalon al pecho con cable',
  'cable seated row':'Remo sentado con cable',
  'chin-up':'Dominada supina',
  'dumbbell bent over row':'Remo inclinado con mancuerna',
  'dumbbell row':'Remo con mancuerna',
  'lat pulldown':'Jalon al pecho',
  'pull-up':'Dominada',
  'seated row':'Remo sentado',
  't-bar row':'Remo en T',
  // Shoulders
  'barbell overhead press':'Press militar con barra',
  'dumbbell lateral raise':'Elevacion lateral con mancuerna',
  'dumbbell shoulder press':'Press de hombros con mancuerna',
  'dumbbell front raise':'Elevacion frontal con mancuerna',
  'face pull':'Jalon a la cara',
  'barbell upright row':'Remo al menton con barra',
  // Arms
  'barbell curl':'Curl con barra',
  'dumbbell curl':'Curl con mancuerna',
  'dumbbell hammer curl':'Curl martillo',
  'dumbbell concentration curl':'Curl concentrado',
  'cable pushdown':'Extension de triceps con cable',
  'dumbbell triceps extension':'Extension de triceps con mancuerna',
  'dumbbell kickback':'Patada de triceps',
  'barbell close-grip bench press':'Press agarre cerrado',
  'cable overhead triceps extension':'Extension de triceps sobre cabeza',
  // Legs
  'barbell squat':'Sentadilla con barra',
  'leg press':'Prensa de piernas',
  'leg extension':'Extension de piernas',
  'leg curl':'Curl de piernas',
  'lunge':'Zancada',
  'dumbbell lunge':'Zancada con mancuernas',
  'barbell hip thrust':'Empuje de cadera con barra',
  'calf raise':'Elevacion de pantorrillas',
  'romanian deadlift':'Peso muerto rumano',
  'goblet squat':'Sentadilla goblet',
  'sumo deadlift':'Peso muerto sumo',
  'step-up':'Subida al banco',
  'bulgarian split squat':'Sentadilla bulgara',
  // Cardio/Core
  'crunch':'Abdominal crunch',
  'bicycle crunch':'Abdominal bicicleta',
  'plank':'Plancha',
  'mountain climber':'Escalador',
  'burpee':'Burpee',
  'jumping jack':'Salto de tijera',
  'russian twist':'Giro ruso',
  'sit-up':'Abdominal sit-up',
  'running':'Correr',
  'walking':'Caminar',
};

/* Traducciones de instrucciones comunes EN→ES */
const INSTR_DICT = {
  'adjust the machine':'ajusta la maquina','to your desired height':'a tu altura deseada',
  'secure your knees on the pad':'asegura tus rodillas en el cojin',
  'grasp the handles':'agarra las manijas','with your palms facing down':'con las palmas hacia abajo',
  'arms fully extended':'brazos completamente extendidos','lower your body':'baja tu cuerpo',
  'by bending your elbows':'doblando los codos','until your upper arms':'hasta que tus brazos',
  'are parallel to the floor':'esten paralelos al piso','pause for a moment':'haz una pausa',
  'push yourself back up':'empujate hacia arriba','to the starting position':'a la posicion inicial',
  'repeat for the desired number':'repite el numero deseado','of repetitions':'de repeticiones',
  'stand with your feet':'parate con los pies','shoulder-width apart':'separados al ancho de hombros',
  'keep your back straight':'manten la espalda recta','slowly lower':'baja lentamente',
  'slowly raise':'sube lentamente','grip the bar':'agarra la barra',
  'lift the weight':'levanta el peso','return to':'regresa a','starting position':'posicion inicial',
  'inhale as you':'inhala mientras','exhale as you':'exhala mientras',
  'keep your core tight':'manten el core apretado','squeeze at the top':'aprieta arriba',
  'lower the weight':'baja el peso','raise the weight':'sube el peso',
  'extend your arms':'extiende los brazos','bend your knees':'dobla las rodillas',
  'straighten your legs':'estira las piernas','hold for':'manten por',
  'a second':'un segundo','seconds':'segundos','repeat':'repite',
  'lie on':'acuestate en','sit on':'sientate en','stand up':'levantate',
  'lie face down':'acuestate boca abajo','lie face up':'acuestate boca arriba',
  'flat bench':'banco plano','incline bench':'banco inclinado','decline bench':'banco declinado',
  'with a barbell':'con una barra','with dumbbells':'con mancuernas','with a dumbbell':'con una mancuerna',
  'pull the bar':'jala la barra','push the bar':'empuja la barra',
  'lower the bar':'baja la barra','raise the bar':'sube la barra',
  'your chest':'tu pecho','your back':'tu espalda','your shoulders':'tus hombros',
  'your arms':'tus brazos','your legs':'tus piernas','your hips':'tus caderas',
  'your knees':'tus rodillas','your elbows':'tus codos','your wrists':'tus munecas',
  'the handles':'las manijas','the weight':'el peso','the bar':'la barra',
  'palms facing':'palmas hacia','facing up':'hacia arriba','facing down':'hacia abajo',
  'facing each other':'frente a frente','overhand grip':'agarre prono','underhand grip':'agarre supino',
  'wide grip':'agarre amplio','narrow grip':'agarre cerrado','close grip':'agarre cerrado',
  ' and ':' y ',' then ':' luego ',' with ':' con ',' the ':' el/la ',' your ':' tu ',
  ' or ':' o ',' to ':' hacia ',' on ':' en ',' at ':' en ',' for ':' para ',
  'step forward':'da un paso adelante','step back':'da un paso atras',
  'while keeping':'mientras mantienes','while maintaining':'mientras mantienes',
  'make sure':'asegurate','do not':'no','be careful':'ten cuidado',
  'breathe in':'inhala','breathe out':'exhala',
  'fully extended':'completamente extendidos','fully contracted':'completamente contraidos',
  'controlled manner':'manera controlada','controlled motion':'movimiento controlado',
  'desired number of repetitions':'numero deseado de repeticiones',
  'opposite direction':'direccion opuesta','same direction':'misma direccion',
};

function _tName(name) {
  if (!name) return '';
  const lang = localStorage.getItem('dya_lang') || 'es';
  if (lang === 'en') return name;
  const lower = name.toLowerCase().trim();
  if (lang === 'es' && EXERCISE_NAMES_ES[lower]) return EXERCISE_NAMES_ES[lower];
  // For other languages, return original (API only has English)
  return name;
}

function _tInstructions(steps) {
  if (!steps || !steps.length) return [];
  const lang = localStorage.getItem('dya_lang') || 'es';
  if (lang === 'en') return steps;
  if (lang !== 'es') return steps; // Only ES translation for now
  // Sort dict entries by length descending so longer phrases match first
  const sorted = Object.entries(INSTR_DICT).sort((a, b) => b[0].length - a[0].length);
  return steps.map(step => {
    let s = step.toLowerCase();
    for (const [en, es] of sorted) {
      s = s.replaceAll(en, es);
    }
    // Clean up double spaces and capitalize
    s = s.replace(/\s+/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}

/* ── Traducciones de equipamiento y UI fitness ───────────── */
const EQUIP_ES = {
  'barbell':'Barra','dumbbell':'Mancuerna','cable':'Cable','machine':'Maquina',
  'leverage machine':'Maquina de palanca','body weight':'Peso corporal','band':'Banda elastica',
  'ez barbell':'Barra EZ','olympic barbell':'Barra olimpica','kettlebell':'Kettlebell',
  'smith machine':'Maquina Smith','medicine ball':'Balon medicinal','stability ball':'Pelota de estabilidad',
  'rope':'Cuerda','roller':'Rodillo','hammer':'Martillo','trap bar':'Barra hexagonal',
  'weighted':'Con peso','assisted':'Asistido','resistance band':'Banda de resistencia',
  'bosu ball':'Bosu','tire':'Llanta','sled machine':'Maquina trineo','upper body ergometer':'Ergometro',
  'elliptical machine':'Eliptica','stationary bike':'Bicicleta fija','stepmill machine':'Escaladora',
  'skierg machine':'SkiErg','wheel roller':'Rueda abdominal',
};
const EQUIP_EN = {}; // English = original
const EQUIP_PT = {
  'barbell':'Barra','dumbbell':'Halter','cable':'Cabo','machine':'Maquina',
  'leverage machine':'Maquina alavanca','body weight':'Peso corporal','band':'Faixa elastica',
};
const EQUIP_FR = {
  'barbell':'Barre','dumbbell':'Haltere','cable':'Cable','machine':'Machine',
  'leverage machine':'Machine a levier','body weight':'Poids du corps','band':'Bande elastique',
};
const EQUIP_DE = {
  'barbell':'Langhantel','dumbbell':'Kurzhantel','cable':'Kabel','machine':'Maschine',
  'leverage machine':'Hebelmaschine','body weight':'Korpergewicht','band':'Widerstandsband',
};
const EQUIP_MAPS = { es: EQUIP_ES, en: EQUIP_EN, pt: EQUIP_PT, fr: EQUIP_FR, de: EQUIP_DE };

function _tEquip(equip) {
  if (!equip) return '';
  const lang = localStorage.getItem('dya_lang') || 'es';
  const map = EQUIP_MAPS[lang] || EQUIP_ES;
  return map[equip.toLowerCase()] || equip;
}

const LABEL_MAP = {
  es: { series: 'series', reps: 'reps', rest: 'descanso', muscle: 'Musculo', equip: 'Equipo', secondary: 'Secundarios', instructions: 'Instrucciones', similar: 'Ejercicios similares' },
  en: { series: 'sets', reps: 'reps', rest: 'rest', muscle: 'Muscle', equip: 'Equipment', secondary: 'Secondary', instructions: 'Instructions', similar: 'Similar exercises' },
  pt: { series: 'series', reps: 'reps', rest: 'descanso', muscle: 'Musculo', equip: 'Equipamento', secondary: 'Secundarios', instructions: 'Instrucoes', similar: 'Exercicios similares' },
  fr: { series: 'series', reps: 'reps', rest: 'repos', muscle: 'Muscle', equip: 'Equipement', secondary: 'Secondaires', instructions: 'Instructions', similar: 'Exercices similaires' },
  de: { series: 'Satze', reps: 'Wdh', rest: 'Pause', muscle: 'Muskel', equip: 'Gerat', secondary: 'Sekundar', instructions: 'Anleitung', similar: 'Ahnliche Ubungen' },
};
function _l(key) {
  const lang = localStorage.getItem('dya_lang') || 'es';
  return (LABEL_MAP[lang] || LABEL_MAP.es)[key] || key;
}

const BP_ICONS = {
  back:'🔙', cardio:'❤️', chest:'💪', 'lower arms':'🤲', 'lower legs':'🦵',
  neck:'🧣', shoulders:'🏋️', 'upper arms':'💪', 'upper legs':'🦿', waist:'🎯',
};
const BP_COLORS = {
  chest:'from-blue-500 to-blue-600', back:'from-emerald-500 to-emerald-600',
  shoulders:'from-violet-500 to-violet-600', 'upper legs':'from-orange-500 to-orange-600',
  'upper arms':'from-rose-500 to-rose-600', waist:'from-amber-500 to-amber-600',
  cardio:'from-red-500 to-red-600', 'lower legs':'from-teal-500 to-teal-600',
  'lower arms':'from-cyan-500 to-cyan-600', neck:'from-indigo-500 to-indigo-600',
};

/* ── Ejercicios locales — fallback offline ──────────────────────────── */
const LOCAL_EXERCISES = [
  // ── Pecho (5) ──
  { id: 'local_pecho_01', name: 'Flexion de pecho', bodyPart: 'chest', equipment: 'body weight', target: 'pectorals', gifUrl: '',
    instructions: ['Coloca las manos en el suelo separadas al ancho de los hombros.', 'Baja el cuerpo doblando los codos hasta que el pecho casi toque el piso.', 'Empuja hacia arriba hasta extender los brazos completamente.', 'Repite el movimiento de forma controlada.'] },
  { id: 'local_pecho_02', name: 'Press de banca con mancuernas', bodyPart: 'chest', equipment: 'dumbbell', target: 'pectorals', gifUrl: '',
    instructions: ['Acuestate en un banco plano con una mancuerna en cada mano a la altura del pecho.', 'Empuja las mancuernas hacia arriba extendiendo los brazos.', 'Baja lentamente hasta que los codos esten a 90 grados.', 'Repite el numero deseado de repeticiones.'] },
  { id: 'local_pecho_03', name: 'Aperturas con mancuernas', bodyPart: 'chest', equipment: 'dumbbell', target: 'pectorals', gifUrl: '',
    instructions: ['Acuestate en banco plano con mancuernas sobre el pecho y brazos extendidos.', 'Abre los brazos hacia los lados con los codos ligeramente flexionados.', 'Baja hasta sentir un estiramiento en el pecho.', 'Regresa a la posicion inicial apretando los pectorales.'] },
  { id: 'local_pecho_04', name: 'Fondo de pecho', bodyPart: 'chest', equipment: 'body weight', target: 'pectorals', gifUrl: '',
    instructions: ['Sujetate de las barras paralelas con los brazos extendidos.', 'Inclina el torso ligeramente hacia adelante.', 'Baja el cuerpo doblando los codos hasta que los brazos esten a 90 grados.', 'Empujate hacia arriba a la posicion inicial.'] },
  { id: 'local_pecho_05', name: 'Press inclinado con barra', bodyPart: 'chest', equipment: 'barbell', target: 'pectorals', gifUrl: '',
    instructions: ['Acuestate en un banco inclinado a 30-45 grados y agarra la barra al ancho de los hombros.', 'Baja la barra controladamente hasta el pecho superior.', 'Empuja la barra hacia arriba hasta extender los brazos.'] },

  // ── Piernas (5) ──
  { id: 'local_pierna_01', name: 'Sentadilla con barra', bodyPart: 'upper legs', equipment: 'barbell', target: 'quads', gifUrl: '',
    instructions: ['Coloca la barra sobre los trapecios y separa los pies al ancho de los hombros.', 'Flexiona las rodillas y caderas bajando como si te sentaras.', 'Baja hasta que los muslos esten paralelos al suelo.', 'Empuja con los talones para regresar a la posicion inicial.'] },
  { id: 'local_pierna_02', name: 'Zancada con mancuernas', bodyPart: 'upper legs', equipment: 'dumbbell', target: 'quads', gifUrl: '',
    instructions: ['De pie con una mancuerna en cada mano, da un paso largo hacia adelante.', 'Flexiona ambas rodillas hasta que la rodilla trasera casi toque el suelo.', 'Empuja con el pie delantero para volver a la posicion inicial.', 'Alterna las piernas en cada repeticion.'] },
  { id: 'local_pierna_03', name: 'Peso muerto rumano', bodyPart: 'upper legs', equipment: 'barbell', target: 'hamstrings', gifUrl: '',
    instructions: ['De pie con la barra frente a los muslos y rodillas ligeramente flexionadas.', 'Inclinate hacia adelante desde las caderas manteniendo la espalda recta.', 'Baja la barra hasta sentir un estiramiento en los isquiotibiales.', 'Regresa a la posicion inicial apretando los gluteos.'] },
  { id: 'local_pierna_04', name: 'Prensa de piernas', bodyPart: 'upper legs', equipment: 'machine', target: 'quads', gifUrl: '',
    instructions: ['Sientate en la maquina de prensa con los pies separados al ancho de los hombros.', 'Baja la plataforma doblando las rodillas hasta 90 grados.', 'Empuja la plataforma extendiendo las piernas sin bloquear las rodillas.'] },
  { id: 'local_pierna_05', name: 'Elevacion de pantorrillas', bodyPart: 'lower legs', equipment: 'body weight', target: 'calves', gifUrl: '',
    instructions: ['De pie con las puntas de los pies en el borde de un escalon.', 'Baja los talones por debajo del nivel del escalon para estirar.', 'Sube empujando con las puntas de los pies lo mas alto posible.', 'Manten la contraccion arriba por un segundo y repite.'] },

  // ── Espalda (5) ──
  { id: 'local_espalda_01', name: 'Dominada', bodyPart: 'back', equipment: 'body weight', target: 'lats', gifUrl: '',
    instructions: ['Agarra la barra con las manos separadas al ancho de los hombros y agarre prono.', 'Desde la posicion colgante, jala tu cuerpo hacia arriba hasta que la barbilla supere la barra.', 'Baja de forma controlada hasta extender los brazos completamente.'] },
  { id: 'local_espalda_02', name: 'Remo inclinado con barra', bodyPart: 'back', equipment: 'barbell', target: 'upper back', gifUrl: '',
    instructions: ['Inclinate hacia adelante con la espalda recta y agarra la barra al ancho de los hombros.', 'Jala la barra hacia el abdomen apretando los omoplatos.', 'Baja la barra de forma controlada hasta extender los brazos.', 'Manten el core apretado durante todo el movimiento.'] },
  { id: 'local_espalda_03', name: 'Jalon al pecho con cable', bodyPart: 'back', equipment: 'cable', target: 'lats', gifUrl: '',
    instructions: ['Sientate en la maquina y agarra la barra ancha con agarre prono.', 'Jala la barra hacia el pecho superior manteniendo el torso ligeramente inclinado.', 'Aprieta los omoplatos al final del movimiento.', 'Regresa la barra arriba de forma controlada.'] },
  { id: 'local_espalda_04', name: 'Remo con mancuerna', bodyPart: 'back', equipment: 'dumbbell', target: 'upper back', gifUrl: '',
    instructions: ['Apoya una rodilla y una mano en el banco, sosteniendo la mancuerna con la otra mano.', 'Jala la mancuerna hacia la cadera manteniendo el codo cerca del cuerpo.', 'Baja la mancuerna de forma controlada.', 'Completa las repeticiones y cambia de lado.'] },
  { id: 'local_espalda_05', name: 'Peso muerto con barra', bodyPart: 'back', equipment: 'barbell', target: 'spine', gifUrl: '',
    instructions: ['De pie frente a la barra con los pies al ancho de las caderas.', 'Agarra la barra, manten la espalda recta y el pecho arriba.', 'Levanta la barra extendiendo las piernas y caderas simultaneamente.', 'Baja la barra de forma controlada hasta el suelo.'] },
];

let _bodyPart = 'chest';
let _exercises = [];
let _searchTimeout = null;

/* Gender filter removed — simplified. Recommendations use mixed plan. */

/* ── Default exercise rules per medical condition ──────────── */
const DEFAULT_EXERCISE_RULES = {
  'Enfermedad cardíaca': [
    'Evitar ejercicio de alta intensidad sin supervisión médica',
    'Monitorear frecuencia cardíaca constantemente',
    'Preferir caminata, natación y yoga'
  ],
  'Asma': [
    'Calentar al menos 10 minutos antes',
    'Evitar ejercicio en ambientes fríos o contaminados',
    'Tener inhalador de rescate disponible'
  ],
  'Enfermedad renal': [
    'Ejercicio de baja a moderada intensidad',
    'Hidratación controlada según indicación médica',
    'Evitar sobreesfuerzo y ejercicio extenuante'
  ],
  'Artritis': [
    'Preferir ejercicios de bajo impacto (natación, bicicleta)',
    'Evitar sobrecarga en articulaciones afectadas',
    'Estiramientos suaves antes y después'
  ],
  'Osteoporosis': [
    'Incluir ejercicios de carga (caminar, escaleras)',
    'Evitar flexión extrema de columna',
    'Cuidado con ejercicios de alto impacto y saltos'
  ]
};

function _getConditionExerciseRules() {
  try {
    const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
    if (!user.email) return [];

    const profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + user.email) || '{}');
    const conditions = Array.isArray(profile.medicalConditions) ? profile.medicalConditions : [];
    if (!conditions.length) return [];

    // Try admin-configured rules first, fall back to defaults
    let exerciseRules;
    try {
      exerciseRules = JSON.parse(localStorage.getItem('dya_config_exercise_rules'));
    } catch (_e) { /* ignore */ }
    if (!exerciseRules || typeof exerciseRules !== 'object') {
      exerciseRules = DEFAULT_EXERCISE_RULES;
    }

    const result = [];
    for (const condition of conditions) {
      const rules = exerciseRules[condition];
      if (!rules || !Array.isArray(rules)) continue;
      result.push({ condition, rules });
    }
    return result;
  } catch (_e) {
    return [];
  }
}

/* ── Doctor exercise restrictions awareness ────────────────── */
function _getExerciseRestrictions() {
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  if (!user.email) return [];
  const recs = JSON.parse(localStorage.getItem('dya_patient_recs_' + user.email) || '[]');
  const doctorRecs = recs.filter(r => r.type === 'Restricción de ejercicio' || r.type === 'Condición médica');
  // Merge with condition-based exercise rules
  const conditionRules = _getConditionExerciseRules();
  return { doctorRecs, conditionRules };
}

function _renderDoctorBanner() {
  const { doctorRecs, conditionRules } = _getExerciseRestrictions();
  if (!doctorRecs.length && !conditionRules.length) return '';

  let html = '';

  // Doctor personal recommendations section
  if (doctorRecs.length) {
    const items = doctorRecs.map(r => {
      const icon = r.type === 'Restricción de ejercicio' ? '🚫' : '⚕️';
      const pClass = r.priority === 'Alta' ? 'text-red-200' : r.priority === 'Media' ? 'text-yellow-200' : 'text-blue-200';
      return `<div class="flex items-start gap-2"><span>${icon}</span><span class="text-xs ${pClass}">${r.description}</span></div>`;
    }).join('');
    html += `
      <div class="mx-4 mb-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl p-3 animate-fade-in">
        <p class="text-xs font-bold text-red-300 mb-1.5">⚕️ Indicaciones de tu médico</p>
        ${items}
        <p class="text-[10px] text-red-300/60 mt-1.5">Respeta siempre las indicaciones de tu profesional de salud</p>
      </div>`;
  }

  // Condition-based exercise rules section
  if (conditionRules.length) {
    const condItems = conditionRules.map(cr => {
      const ruleLines = cr.rules.map(rule =>
        `<div class="flex items-start gap-2"><span>•</span><span class="text-xs text-amber-200">${rule}</span></div>`
      ).join('');
      return `<div class="mb-2"><p class="text-xs font-semibold text-amber-100 mb-1">${cr.condition}:</p>${ruleLines}</div>`;
    }).join('');
    html += `
      <div class="mx-4 mb-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/30 rounded-xl p-3 animate-fade-in">
        <p class="text-xs font-bold text-amber-300 mb-1.5">⚠️ Recomendaciones por condición médica</p>
        ${condItems}
        <p class="text-[10px] text-amber-300/60 mt-1.5">Adapta tu rutina según tu condición de salud</p>
      </div>`;
  }

  return html;
}

export async function renderFitness(container) {
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  const name = (user.name || 'Atleta').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  container.innerHTML = `
    <!-- Hero -->
    <div class="gradient-navy text-white px-5 pt-11 pb-8 relative overflow-hidden">
      <div class="absolute top-[-30px] right-[-30px] w-44 h-44 bg-primary/10 rounded-full blur-2xl"></div>
      <div class="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-blue-500/8 rounded-full blur-xl"></div>

      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-white/40 mb-0.5">MiDoctorYa</p>
          <h1 class="text-xl font-bold">${greeting}, <span class="text-primary-light">${name}</span></h1>
        </div>
        <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">${name[0]}</div>
      </div>

      <!-- Stats row -->
      <div class="flex gap-2 mb-5">
        <div class="flex-1 glass rounded-xl p-3 text-center">
          <p class="text-lg font-bold text-white">0</p>
          <p class="text-[10px] text-white/40">kcal</p>
        </div>
        <div class="flex-1 glass rounded-xl p-3 text-center">
          <p class="text-lg font-bold text-white">0</p>
          <p class="text-[10px] text-white/40">min</p>
        </div>
        <div class="flex-1 glass rounded-xl p-3 text-center">
          <p class="text-lg font-bold text-white">💪</p>
          <p class="text-[10px] text-white/40">${t('fit_title')}</p>
        </div>
      </div>

      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input id="fit-search" type="search" placeholder="${t('fit_search')}"
          class="w-full bg-white/10 text-white placeholder-white/40 rounded-xl py-3 pl-10 pr-4 text-sm border border-white/10 focus:border-primary/50 focus:bg-white/20 transition" style="color:#ffffff;background:rgba(255,255,255,0.1);">
      </div>
    </div>

    <!-- Body Part Pills -->
    <div class="px-4 -mt-3 mb-3">
      <div id="bp-pills" class="flex gap-2 overflow-x-auto hide-scroll pb-1 pt-1"></div>
    </div>

    <!-- Doctor Exercise Restrictions Banner -->
    ${_renderDoctorBanner()}

    <!-- Section Title -->
    <div class="px-4 flex items-center justify-between mb-2">
      <h2 class="text-base font-bold text-gray-800" id="section-title">${t('fit_plan_title')}</h2>
      <span class="text-[10px] text-gray-400" id="exercise-count"></span>
    </div>

    <!-- Exercise List -->
    <div id="exercise-list" class="px-4 flex flex-col gap-3 pb-6">
      ${_skeletons(5)}
    </div>
  `;

  // Events
  const searchInput = container.querySelector('#fit-search');
  searchInput.addEventListener('input', () => {
    clearTimeout(_searchTimeout);
    _searchTimeout = setTimeout(() => _doSearch(searchInput.value.trim(), container), 350);
  });

  // Load data
  await Promise.all([_loadBodyParts(container), _loadRecommendations(container)]);
}

async function _loadBodyParts(container) {
  const bps = await getBodyParts();
  const pillsDiv = container.querySelector('#bp-pills');
  if (!pillsDiv) return;
  const parts = bps.length ? bps : ['chest','back','shoulders','upper legs','upper arms','waist','cardio','lower legs','lower arms','neck'];

  pillsDiv.innerHTML = parts.map(bp => `
    <button data-bp="${bp}" class="bp-pill flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
      ${bp === _bodyPart ? 'pill-active' : 'bg-white text-gray-500 shadow-sm border border-gray-100 active:scale-95'}">
      ${BP_ICONS[bp]||'🏋️'} ${tBP(bp)}
    </button>
  `).join('');

  pillsDiv.querySelectorAll('.bp-pill').forEach(btn => {
    btn.onclick = () => {
      _bodyPart = btn.dataset.bp;
      pillsDiv.querySelectorAll('.bp-pill').forEach(b => {
        b.classList.remove('pill-active', 'bg-white', 'text-gray-500', 'shadow-sm', 'border', 'border-gray-100');
        b.classList.add(...(b.dataset.bp === _bodyPart ? ['pill-active'] : ['bg-white','text-gray-500','shadow-sm','border','border-gray-100']));
      });
      _loadByBodyPart(container);
    };
  });
}

async function _loadRecommendations(container) {
  const listDiv = container.querySelector('#exercise-list');
  const titleDiv = container.querySelector('#section-title');
  const countDiv = container.querySelector('#exercise-count');
  if (!listDiv) return;

  const data = await getRecommendations('male', 12);
  if (data.exercises && data.exercises.length) {
    _exercises = data.exercises;
    if (titleDiv) titleDiv.textContent = data.day_label || t('fit_plan_title');
    if (countDiv) countDiv.textContent = `${_exercises.length} ejercicios`;
    _renderCards(listDiv, container);
  } else {
    // Fallback: intentar por parte del cuerpo, luego ejercicios locales
    await _loadByBodyPart(container);
  }
}

async function _loadByBodyPart(container) {
  const listDiv = container.querySelector('#exercise-list');
  const titleDiv = container.querySelector('#section-title');
  const countDiv = container.querySelector('#exercise-count');
  if (!listDiv) return;
  listDiv.innerHTML = _skeletons(5);
  if (titleDiv) titleDiv.textContent = tBP(_bodyPart);

  let exs = await getExercisesByBodyPart(_bodyPart, 15);
  // Fallback offline: usar ejercicios locales si la API no devuelve resultados
  if (!exs || !exs.length) {
    exs = LOCAL_EXERCISES.filter(e => e.bodyPart === _bodyPart);
  }
  _exercises = exs;
  if (countDiv) countDiv.textContent = `${_exercises.length} ejercicios`;
  _renderCards(listDiv, container);
}

async function _doSearch(q, container) {
  if (!q) { await _loadRecommendations(container); return; }
  const listDiv = container.querySelector('#exercise-list');
  const titleDiv = container.querySelector('#section-title');
  const countDiv = container.querySelector('#exercise-count');
  if (!listDiv) return;
  listDiv.innerHTML = _skeletons(3);
  if (titleDiv) titleDiv.textContent = `"${q}"`;

  let exs = await searchExercises(q, 20);
  // Fallback offline: buscar en ejercicios locales
  if (!exs || !exs.length) {
    const ql = q.toLowerCase();
    exs = LOCAL_EXERCISES.filter(e =>
      e.name.toLowerCase().includes(ql) ||
      e.bodyPart.toLowerCase().includes(ql) ||
      e.target.toLowerCase().includes(ql) ||
      e.equipment.toLowerCase().includes(ql)
    );
  }
  _exercises = exs;
  if (countDiv) countDiv.textContent = `${_exercises.length} resultados`;
  _renderCards(listDiv, container);
}

function _renderCards(listDiv, container) {
  if (!_exercises.length) {
    listDiv.innerHTML = `<div class="text-center py-16 text-gray-300"><div class="text-5xl mb-3">🏋️</div><p class="text-sm font-medium">${t('fit_no_results')}</p></div>`;
    return;
  }

  listDiv.innerHTML = _exercises.map((ex, i) => `
    <div class="exercise-card bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden card-hover animate-slide-up" style="animation-delay:${Math.min(i*40, 300)}ms" data-idx="${i}">
      <div class="flex items-center gap-3 p-3">
        <div class="gif-container w-[76px] h-[76px] flex-shrink-0 rounded-xl">
          ${ex.gifUrl
            ? `<img src="${_gifSrc(ex.gifUrl)}" alt="${ex.name}" loading="lazy" class="w-full h-full" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-3xl bg-gray-50\\'>🏋️</div>'">`
            : `<div class="w-full h-full flex items-center justify-center text-3xl bg-gray-50">🏋️</div>`}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-[13px] text-gray-800 leading-tight capitalize line-clamp-2">${_tName(ex.name) || 'Ejercicio'}</h3>
          <div class="flex items-center gap-1.5 mt-1.5">
            ${ex.target ? `<span class="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-md font-semibold capitalize">${tBP(ex.target)}</span>` : ''}
            ${ex.equipment && ex.equipment !== 'body weight' ? `<span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium capitalize">${_tEquip(ex.equipment)}</span>` : ''}
          </div>
          <div class="flex gap-3 mt-1.5">
            <span class="text-[10px] text-gray-400 font-medium">3x12</span>
            <span class="text-[10px] text-gray-400 font-medium">60s ${_l('rest')}</span>
          </div>
        </div>
        <svg class="w-4 h-4 text-gray-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </div>
    </div>
  `).join('');

  listDiv.querySelectorAll('.exercise-card').forEach(card => {
    card.onclick = () => _showDetail(_exercises[parseInt(card.dataset.idx)], container);
  });
}

async function _showDetail(ex, rootContainer) {
  const mainContent = document.getElementById('main-content');
  mainContent.scrollTop = 0;

  mainContent.innerHTML = `
    <div class="animate-fade-in">
      <!-- Top bar -->
      <div class="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-50">
        <button id="detail-back" class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="font-bold text-sm text-gray-800 truncate capitalize flex-1">${_tName(ex.name)}</h2>
      </div>

      <!-- GIF -->
      <div class="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-gray-50 to-gray-100" style="height: 220px">
        ${ex.gifUrl
          ? `<img src="${_gifSrc(ex.gifUrl)}" alt="${ex.name}" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-6xl\\'>🏋️</div>'">`
          : `<div class="w-full h-full flex items-center justify-center text-6xl">🏋️</div>`}
      </div>

      <!-- Info badges -->
      <div class="flex flex-wrap gap-2 px-4 mt-4">
        ${ex.target ? `<span class="px-3 py-1.5 bg-primary/8 text-primary text-xs font-bold rounded-lg capitalize">${t('fit_target')}: ${tBP(ex.target)}</span>` : ''}
        ${ex.equipment ? `<span class="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg capitalize">${t('fit_equipment')}: ${_tEquip(ex.equipment)}</span>` : ''}
        ${ex.bodyPart ? `<span class="px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-lg capitalize">${tBP(ex.bodyPart)}</span>` : ''}
      </div>
      ${(ex.secondaryMuscles||[]).length ? `<div class="px-4 mt-2"><span class="text-xs text-gray-400">${t('fit_secondary')}: ${ex.secondaryMuscles.map(m => tBP(m)).join(', ')}</span></div>` : ''}

      <!-- Sets -->
      <div class="grid grid-cols-3 gap-3 px-4 mt-4">
        <div class="bg-white rounded-xl p-3.5 text-center shadow-sm border border-gray-100">
          <p class="text-xl font-black text-primary">3</p>
          <p class="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">${t('fit_sets')}</p>
        </div>
        <div class="bg-white rounded-xl p-3.5 text-center shadow-sm border border-gray-100">
          <p class="text-xl font-black text-primary">12</p>
          <p class="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">${t('fit_reps')}</p>
        </div>
        <div class="bg-white rounded-xl p-3.5 text-center shadow-sm border border-gray-100">
          <p class="text-xl font-black text-primary">60</p>
          <p class="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">${t('fit_rest')} (s)</p>
        </div>
      </div>

      <!-- Instructions -->
      ${(ex.instructions||[]).length ? `
      <div class="px-4 mt-5">
        <h3 class="font-bold text-sm text-gray-800 mb-3">${t('fit_instructions')}</h3>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          ${_tInstructions(ex.instructions).map((step, i) => `
            <div class="flex gap-3 items-start">
              <span class="w-6 h-6 rounded-full gradient-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${i+1}</span>
              <p class="text-sm text-gray-600 leading-relaxed">${step}</p>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Similar -->
      <div class="px-4 mt-5 mb-8">
        <h3 class="font-bold text-sm text-gray-800 mb-3">${t('fit_similar')}</h3>
        <div id="similar-list" class="flex gap-3 overflow-x-auto hide-scroll pb-2">
          <div class="skeleton w-36 h-32 flex-shrink-0"></div>
          <div class="skeleton w-36 h-32 flex-shrink-0"></div>
          <div class="skeleton w-36 h-32 flex-shrink-0"></div>
        </div>
      </div>
    </div>
  `;

  mainContent.querySelector('#detail-back').onclick = () => renderFitness(mainContent);

  // Load similar
  if (ex.target) {
    const similar = await getSimilarByTarget(ex.target, 8);
    const sl = mainContent.querySelector('#similar-list');
    if (sl && similar.length) {
      sl.innerHTML = similar.filter(s => s.id !== ex.id).slice(0, 6).map(s => `
        <div class="similar-card flex-shrink-0 w-36 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden card-hover" data-id="${s.id}">
          <div class="gif-container h-24">
            ${s.gifUrl ? `<img src="${_gifSrc(s.gifUrl)}" class="w-full h-full object-contain" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-2xl bg-gray-50\\'>🏋️</div>'">` : `<div class="w-full h-full flex items-center justify-center text-2xl bg-gray-50">🏋️</div>`}
          </div>
          <p class="text-[11px] font-bold text-gray-700 p-2 truncate capitalize">${_tName(s.name)}</p>
        </div>
      `).join('');
      sl.querySelectorAll('.similar-card').forEach(c => {
        c.onclick = async () => {
          const detail = similar.find(s => s.id == c.dataset.id) || await getExerciseDetail(c.dataset.id);
          if (detail) _showDetail(detail, rootContainer);
        };
      });
    }
  }
}

function _skeletons(n) {
  return Array(n).fill(`
    <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-50">
      <div class="skeleton w-[76px] h-[76px] flex-shrink-0 rounded-xl"></div>
      <div class="flex-1 space-y-2.5"><div class="skeleton h-3.5 w-3/4 rounded-md"></div><div class="skeleton h-3 w-1/2 rounded-md"></div><div class="skeleton h-2.5 w-1/3 rounded-md"></div></div>
    </div>
  `).join('');
}
