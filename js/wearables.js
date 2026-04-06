/* ── Wearable Device Integration — MiDoctorYa Lite ─────────────────────
   CicPlus H2 chest band & standard BLE heart rate devices via Web Bluetooth.
   Health Bridge (Puente de Salud) via Google Fit for proprietary watches.
   Medical-grade monitoring, arrhythmia detection, sleep apnea analysis,
   HRV analysis, cardiovascular risk scoring, and emergency alerts.
─────────────────────────────────────────────────────────────────────── */
import { showToast } from './app.js';

/* ═══════════════════════════════════════════════════════════════════════
   DEVICE PROFILES & BLE CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */
const DEVICE_PROFILES = {
  cicplus_h2: {
    name: 'CicPlus H2',
    type: 'chest_band',
    icon: '\u{1F493}',
    services: ['heart_rate'],
    characteristics: {
      heartRate: '00002a37-0000-1000-8000-00805f9b34fb',
      bodySensorLocation: '00002a38-0000-1000-8000-00805f9b34fb',
    },
    metrics: ['heartRate', 'rrInterval', 'heartRateVariability', 'caloriesBurned', 'arrhythmiaDetection'],
    description: 'Banda de pecho cardiaca profesional'
  },
  colmi_p17: {
    name: 'Colmi P17 / P71J',
    type: 'smartwatch',
    icon: '\u231A',
    services: ['heart_rate'],
    namePrefix: 'Colmi',
    characteristics: {
      heartRate: '00002a37-0000-1000-8000-00805f9b34fb',
    },
    metrics: ['heartRate', 'spo2', 'bloodPressure', 'steps', 'calories', 'distance', 'sleep', 'stress', 'bodyTemperature'],
    description: 'Reloj inteligente — usa Puente de Salud (Google Fit)'
  }
};

const MONITORING_MODES = {
  rest: { label: 'Reposo', icon: '\u{1F319}', samplingInterval: 15000, alertLevel: 'medium', bufferSize: 500, description: 'Monitoreo en reposo - bajo consumo' },
  exercise_walking: { label: 'Caminata', icon: '\u{1F6B6}', samplingInterval: 2000, alertLevel: 'medium', bufferSize: 2000, hrZones: true, description: 'Caminata moderada' },
  exercise_running: { label: 'Carrera', icon: '\u{1F3C3}', samplingInterval: 1000, alertLevel: 'high', bufferSize: 3000, hrZones: true, description: 'Carrera / trote' },
  exercise_hiit: { label: 'HIIT', icon: '\u26A1', samplingInterval: 1000, alertLevel: 'high', bufferSize: 3000, hrZones: true, description: 'Entrenamiento de alta intensidad' },
  exercise_strength: { label: 'Fuerza', icon: '\u{1F3CB}\uFE0F', samplingInterval: 2000, alertLevel: 'high', bufferSize: 2000, hrZones: true, description: 'Pesas / calistenia' },
  exercise_cycling: { label: 'Ciclismo', icon: '\u{1F6B4}', samplingInterval: 1000, alertLevel: 'medium', bufferSize: 3000, hrZones: true, description: 'Ciclismo indoor/outdoor' },
  exercise_swimming: { label: 'Natacion', icon: '\u{1F3CA}', samplingInterval: 2000, alertLevel: 'medium', bufferSize: 2000, hrZones: true, description: 'Natacion' },
  pre_surgery: { label: 'Pre-Cirugia', icon: '\u{1F3E5}', samplingInterval: 2000, alertLevel: 'high', bufferSize: 5000, requiresConsent: true, requiresPrescription: false, description: 'Baseline pre-quirurgico (24h)' },
  post_surgery: { label: 'Post-Cirugia', icon: '\u{1FA7A}', samplingInterval: 3000, alertLevel: 'high', bufferSize: 5000, requiresConsent: true, requiresPrescription: false, description: 'Seguimiento post-operatorio' },
  rehab: { label: 'Rehabilitacion', icon: '\u{1F4AA}', samplingInterval: 5000, alertLevel: 'medium', bufferSize: 2000, adaptive: true, description: 'Rehabilitacion cardiaca' },
  continuous_24h: { label: 'Continuo 24h', icon: '\u23F1\uFE0F', samplingInterval: 5000, alertLevel: 'high', bufferSize: 5000, requiresConsent: true, description: 'Monitoreo continuo 24 horas' }
};

/* ═══════════════════════════════════════════════════════════════════════
   LEGAL DISCLAIMERS & CONSENT SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */
var LEGAL_DISCLAIMERS = {
  general: {
    title: 'Aviso Importante',
    text: 'MiDoctorYa es una herramienta de bienestar y entrenamiento. NO es un dispositivo medico certificado ni reemplaza equipos medicos especializados (ECG de 12 derivaciones, oximetros certificados, monitores de grado hospitalario). Los datos proporcionados son estimaciones basadas en sensores de consumo y algoritmos de software. En caso de emergencia, contacte a servicios medicos de emergencia (123 en Colombia). Consulte siempre a un profesional de salud para diagnosticos y decisiones medicas.'
  },
  exercise: {
    title: 'Aviso de Ejercicio',
    text: 'Las zonas de frecuencia cardiaca y recomendaciones de ejercicio son guias generales. Si tiene condiciones cardiacas, hipertension, diabetes u otra condicion cronica, consulte a su medico antes de iniciar cualquier programa de ejercicio. Detenga el ejercicio inmediatamente si siente dolor en el pecho, mareo, nauseas o dificultad para respirar.'
  },
  surgery: {
    title: 'Aviso de Monitoreo Quirurgico',
    text: 'El monitoreo pre y post-quirurgico proporcionado por MiDoctorYa es complementario y NO sustituye el monitoreo clinico profesional. Los datos deben ser interpretados por un profesional de salud calificado. Este sistema no esta certificado por INVIMA, FDA ni ningun organismo regulador como dispositivo medico.'
  },
  arrhythmia: {
    title: 'Aviso de Deteccion de Arritmias',
    text: 'La deteccion de arritmias es una estimacion basada en variabilidad de intervalos R-R de un sensor de frecuencia cardiaca optica/banda de pecho. NO equivale a un electrocardiograma (ECG/EKG). Puede generar falsos positivos y falsos negativos. Cualquier deteccion sospechosa debe ser confirmada por un cardiologo con un ECG de 12 derivaciones.'
  },
  continuous: {
    title: 'Aviso de Monitoreo Continuo',
    text: 'El monitoreo continuo 24h consume recursos significativos del dispositivo y la bateria. Los datos recopilados son orientativos. Para monitoreo medico continuo, utilice equipos aprobados por su institucion de salud.'
  },
  dataProtection: {
    title: 'Proteccion de Datos (Ley 1581 de 2012)',
    text: 'Sus datos de salud son datos sensibles protegidos por la Ley 1581 de 2012 de Colombia. Los datos biometricos se almacenan localmente en su dispositivo y no se transmiten a servidores externos sin su autorizacion expresa. Usted tiene derecho a conocer, actualizar, rectificar y revocar la autorizacion de tratamiento de sus datos en cualquier momento.'
  }
};

/* ── Consent Management ─────────────────────────────────────────────── */
function _getConsentKey() { return 'dya_consent_' + _getEmail(); }

function _getConsent() {
  try { return JSON.parse(localStorage.getItem(_getConsentKey()) || '{}'); } catch(_e) { return {}; }
}

function _saveConsent(consent) {
  localStorage.setItem(_getConsentKey(), JSON.stringify(consent));
}

export function hasConsent(type) {
  var consent = _getConsent();
  if (!consent[type]) return false;
  // Check if consent has expired (90 days)
  var NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  if (Date.now() - consent[type].timestamp > NINETY_DAYS) return false;
  return consent[type].accepted === true;
}

export function grantConsent(type) {
  var consent = _getConsent();
  consent[type] = {
    accepted: true,
    timestamp: Date.now(),
    version: '1.0',
    hash: btoa(type + ':' + _getEmail() + ':' + Date.now())
  };
  _saveConsent(consent);
}

export function revokeConsent(type) {
  var consent = _getConsent();
  if (consent[type]) {
    consent[type].accepted = false;
    consent[type].revokedAt = Date.now();
  }
  _saveConsent(consent);
}

export function requiresConsentForMode(mode) {
  var consentModes = ['pre_surgery', 'post_surgery', 'continuous_24h', 'rehab'];
  return consentModes.indexOf(mode) !== -1;
}

function getDisclaimerForMode(mode) {
  if (mode && mode.indexOf('exercise') === 0) return 'exercise';
  if (mode === 'pre_surgery' || mode === 'post_surgery') return 'surgery';
  if (mode === 'continuous_24h') return 'continuous';
  return 'general';
}

/* ── Consent Modal UI ───────────────────────────────────────────────── */
export function showConsentModal(mode, onAccept, onDecline) {
  var disclaimerType = getDisclaimerForMode(mode);
  var disclaimer = LEGAL_DISCLAIMERS[disclaimerType];
  var generalDisclaimer = LEGAL_DISCLAIMERS.general;
  var dataDisclaimer = LEGAL_DISCLAIMERS.dataProtection;

  var overlay = document.createElement('div');
  overlay.id = 'consent-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';

  overlay.innerHTML =
    '<div style="background:white;border-radius:20px;max-width:440px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.25);">' +
      '<div style="padding:24px 24px 16px;border-bottom:1px solid #F3F4F6;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
          '<div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#EF4444,#DC2626);display:flex;align-items:center;justify-content:center;">' +
            '<span style="font-size:24px;">\u2695\uFE0F</span>' +
          '</div>' +
          '<div>' +
            '<h2 style="font-size:18px;font-weight:800;color:#1F2937;">Consentimiento Informado</h2>' +
            '<p style="font-size:12px;color:#9CA3AF;">Lea cuidadosamente antes de continuar</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="consent-scroll" style="flex:1;overflow-y:auto;padding:20px 24px;">' +
        '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:16px;">' +
          '<h3 style="font-size:14px;font-weight:700;color:#991B1B;margin-bottom:8px;">\u26A0\uFE0F ' + generalDisclaimer.title + '</h3>' +
          '<p style="font-size:12px;color:#7F1D1D;line-height:1.6;">' + generalDisclaimer.text + '</p>' +
        '</div>' +
        '<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;margin-bottom:16px;">' +
          '<h3 style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:8px;">\uD83D\uDCCB ' + disclaimer.title + '</h3>' +
          '<p style="font-size:12px;color:#78350F;line-height:1.6;">' + disclaimer.text + '</p>' +
        '</div>' +
        '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;margin-bottom:16px;">' +
          '<h3 style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:8px;">\uD83D\uDD12 ' + dataDisclaimer.title + '</h3>' +
          '<p style="font-size:12px;color:#1E3A8A;line-height:1.6;">' + dataDisclaimer.text + '</p>' +
        '</div>' +
        '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;">' +
          '<h3 style="font-size:14px;font-weight:700;color:#166534;margin-bottom:8px;">\u2705 Su consentimiento</h3>' +
          '<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;">' +
            '<input type="checkbox" id="consent-checkbox" style="width:20px;height:20px;margin-top:2px;accent-color:#6366F1;flex-shrink:0;">' +
            '<span style="font-size:12px;color:#15803D;line-height:1.5;">Entiendo que MiDoctorYa es una herramienta de bienestar y entrenamiento, no un dispositivo medico. Acepto que los datos son estimaciones y no diagnosticos. Me comprometo a buscar atencion medica profesional ante cualquier sintoma preocupante. Autorizo el tratamiento de mis datos biometricos conforme a la Ley 1581 de 2012.</span>' +
          '</label>' +
        '</div>' +
      '</div>' +
      '<div style="padding:16px 24px 24px;border-top:1px solid #F3F4F6;display:flex;gap:12px;">' +
        '<button id="consent-decline" style="flex:1;padding:14px;border-radius:14px;background:#F3F4F6;color:#6B7280;font-size:14px;font-weight:700;border:none;cursor:pointer;">Declinar</button>' +
        '<button id="consent-accept" style="flex:1;padding:14px;border-radius:14px;background:linear-gradient(135deg,#6366F1,#4F46E5);color:white;font-size:14px;font-weight:700;border:none;cursor:pointer;opacity:0.4;" disabled>Acepto</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  var checkbox = document.getElementById('consent-checkbox');
  var acceptBtn = document.getElementById('consent-accept');
  var declineBtn = document.getElementById('consent-decline');
  var scrollDiv = document.getElementById('consent-scroll');

  // Must scroll to bottom AND check the box to enable accept
  var scrolledToBottom = false;
  scrollDiv.addEventListener('scroll', function() {
    if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight - 20) {
      scrolledToBottom = true;
    }
  });

  checkbox.addEventListener('change', function() {
    if (checkbox.checked && scrolledToBottom) {
      acceptBtn.disabled = false;
      acceptBtn.style.opacity = '1';
    } else if (checkbox.checked) {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.4';
      scrollDiv.scrollTo({ top: scrollDiv.scrollHeight, behavior: 'smooth' });
      setTimeout(function() {
        if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight - 20) {
          scrolledToBottom = true;
          acceptBtn.disabled = false;
          acceptBtn.style.opacity = '1';
        }
      }, 600);
    } else {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.4';
    }
  });

  acceptBtn.addEventListener('click', function() {
    if (acceptBtn.disabled) return;
    grantConsent(disclaimerType);
    grantConsent('general');
    grantConsent('dataProtection');
    overlay.remove();
    if (onAccept) onAccept();
  });

  declineBtn.addEventListener('click', function() {
    overlay.remove();
    if (onDecline) onDecline();
    showToast('Monitoreo no activado \u2014 consentimiento requerido');
  });
}

// Expose showConsentModal globally for inline onclick handlers
window.showConsentModal = showConsentModal;

/* ── Disclaimer Banner ──────────────────────────────────────────────── */
function _getDisclaimerBanner() {
  return '<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">' +
    '<span style="font-size:16px;flex-shrink:0;">\u26A0\uFE0F</span>' +
    '<p style="font-size:10px;color:#92400E;line-height:1.4;margin:0;">Herramienta de bienestar \u2014 No es dispositivo medico. <button onclick="document.getElementById(\'consent-overlay\') || showConsentModal(\'general\', null, null)" style="color:#B45309;text-decoration:underline;background:none;border:none;font-size:10px;cursor:pointer;padding:0;">Ver aviso completo</button></p>' +
  '</div>';
}

function calculateHRZones(age, restingHR) {
  var maxHR = 220 - (age || 30);
  var reserve = maxHR - (restingHR || 60);
  return {
    z1: { min: Math.round(restingHR + reserve * 0.50), max: Math.round(restingHR + reserve * 0.60), label: 'Calentamiento', color: '#3B82F6' },
    z2: { min: Math.round(restingHR + reserve * 0.60), max: Math.round(restingHR + reserve * 0.70), label: 'Quema grasa', color: '#10B981' },
    z3: { min: Math.round(restingHR + reserve * 0.70), max: Math.round(restingHR + reserve * 0.80), label: 'Aerobico', color: '#F59E0B' },
    z4: { min: Math.round(restingHR + reserve * 0.80), max: Math.round(restingHR + reserve * 0.90), label: 'Anaerobico', color: '#EF4444' },
    z5: { min: Math.round(restingHR + reserve * 0.90), max: maxHR, label: 'VO2max', color: '#DC2626' },
    maxHR: maxHR
  };
}

function getCurrentHRZone(hr, zones) {
  if (hr >= zones.z5.min) return { zone: 5, label: zones.z5.label, color: zones.z5.color, min: zones.z5.min, max: zones.z5.max };
  if (hr >= zones.z4.min) return { zone: 4, label: zones.z4.label, color: zones.z4.color, min: zones.z4.min, max: zones.z4.max };
  if (hr >= zones.z3.min) return { zone: 3, label: zones.z3.label, color: zones.z3.color, min: zones.z3.min, max: zones.z3.max };
  if (hr >= zones.z2.min) return { zone: 2, label: zones.z2.label, color: zones.z2.color, min: zones.z2.min, max: zones.z2.max };
  if (hr >= zones.z1.min) return { zone: 1, label: zones.z1.label, color: zones.z1.color, min: zones.z1.min, max: zones.z1.max };
  return { zone: 0, label: 'Reposo', color: '#6B7280', min: 0, max: zones.z1.min };
}

const BLE_SERVICES = {
  heart_rate: 0x180D,
  battery: 0x180F,
  device_info: 0x180A,
};

/* ═══════════════════════════════════════════════════════════════════════
   STATE MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════ */
function _getEmail() {
  try { return (JSON.parse(localStorage.getItem('dya_user') || '{}')).email || ''; } catch (_e) { return ''; }
}
function _stateKey() { return 'dya_wearable_' + _getEmail(); }
function _alertsKey() { return 'dya_wearable_alerts_' + _getEmail(); }

function _defaultState() {
  return {
    email: _getEmail(),
    activeDevice: null,
    deviceName: '',
    deviceId: '',
    monitoringMode: 'normal',
    emergencyContact: { name: '', phone: '', relationship: '' },
    secondaryContact: { name: '', phone: '', relationship: '' },
    doctorMonitoring: false,
    assignedDoctor: '',
    alertThresholds: {
      heartRateHigh: 120,
      heartRateLow: 50,
      heartRateExerciseMax: 190,
      spo2Low: 92,
      spo2Warning: 94,
      bloodPressureSystolicHigh: 140,
      bloodPressureSystolicLow: 90,
      bloodPressureDiastolicHigh: 90,
      bloodPressureDiastolicLow: 60,
      respiratoryRateHigh: 25,
      respiratoryRateLow: 10,
      bodyTempHigh: 38.0,
      bodyTempLow: 35.0,
      rrIrregularityThreshold: 20,
      apneaDesaturationThreshold: 4,
      apneaMinDuration: 10,
      stressHigh: 80,
    },
    medicalConditions: [],
    sessions: [],
    currentSession: null,
    settings: {
      continuousMonitoring: false,
      sleepTracking: true,
      arrhythmiaDetection: true,
      apneaDetection: true,
      fallDetection: false,
      autoAlerts: true,
      alertSound: true,
      vibrationAlerts: true,
      dataRetentionDays: 90,
      syncInterval: 5,
    }
  };
}

function _loadState() {
  try {
    var saved = JSON.parse(localStorage.getItem(_stateKey()) || 'null');
    if (!saved) return _defaultState();
    var def = _defaultState();
    // Merge with defaults for new fields
    return Object.assign({}, def, saved, {
      alertThresholds: Object.assign({}, def.alertThresholds, saved.alertThresholds || {}),
      settings: Object.assign({}, def.settings, saved.settings || {}),
      emergencyContact: Object.assign({}, def.emergencyContact, saved.emergencyContact || {}),
      secondaryContact: Object.assign({}, def.secondaryContact, saved.secondaryContact || {}),
    });
  } catch (_e) { return _defaultState(); }
}
function _saveState(s) { localStorage.setItem(_stateKey(), JSON.stringify(s)); }
function _loadAlerts() {
  try { return JSON.parse(localStorage.getItem(_alertsKey()) || '[]'); } catch (_e) { return []; }
}
function _saveAlerts(a) { localStorage.setItem(_alertsKey(), JSON.stringify(a)); }

function _getAdminConfig() {
  try { return JSON.parse(localStorage.getItem('dya_config_wearables') || '{}'); } catch (_e) { return {}; }
}

/* ═══════════════════════════════════════════════════════════════════════
   RUNTIME STATE (not persisted — live objects)
   ═══════════════════════════════════════════════════════════════════════ */
let _bleDevice = null;
let _bleServer = null;
let _hrCharacteristic = null;
let _monitoringActive = false;
let _monitoringInterval = null;
let _persistInterval = null;
let _currentView = 'dashboard';
let _animFrameId = null;
let _canvasCtx = null;
let _simulatorActive = false;
let _simulatorInterval = null;
let _simulatorDevice = null;
var _exerciseSession = null; // { mode, startTime, hrReadings:[], zones:{z1:0,z2:0,z3:0,z4:0,z5:0}, maxHR:0, minHR:999, avgHR:0, calories:0, paused:false }
var _exerciseZones = null;

// Circular buffers
const HR_BUFFER_SIZE = 3600;
const SPO2_BUFFER_SIZE = 1800;
const RR_BUFFER_SIZE = 1000;
let _hrBuffer = [];
let _spo2Buffer = [];
let _rrBuffer = [];
let _bpBuffer = [];
let _stepsBuffer = [];
let _tempBuffer = [];
let _stressBuffer = [];
let _lastReading = {
  heartRate: 0, spo2: 0, systolic: 0, diastolic: 0,
  steps: 0, calories: 0, distance: 0, bodyTemp: 0,
  stress: 0, battery: 0, rrInterval: 0, timestamp: 0
};

/* ═══════════════════════════════════════════════════════════════════════
   WEB BLUETOOTH — CONNECTION
   ═══════════════════════════════════════════════════════════════════════ */
function _isBleSupported() {
  return typeof navigator !== 'undefined' && navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function';
}

export async function scanForDevice(deviceType, scanAll) {
  if (!_isBleSupported()) {
    showToast('Web Bluetooth no soportado en este navegador. Usa Chrome o Edge.');
    return null;
  }
  var profile = DEVICE_PROFILES[deviceType];
  if (!profile) { showToast('Tipo de dispositivo desconocido'); return null; }
  var optionalServices = Object.values(BLE_SERVICES).filter(Boolean);

  if (scanAll) {
    try {
      return await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: optionalServices
      });
    } catch (err) {
      if (err.name !== 'NotFoundError') { showToast('Error: ' + err.message); }
      return null;
    }
  }

  var filters = [{ services: [BLE_SERVICES.heart_rate] }];
  if (deviceType === 'cicplus_h2') {
    filters.push(
      { namePrefix: 'CicPlus' }, { namePrefix: 'CICPLUS' }, { namePrefix: 'CIC' },
      { namePrefix: 'H2' }, { namePrefix: 'HRM' }, { namePrefix: 'Heart' },
      { namePrefix: 'Polar' }, { namePrefix: 'Wahoo' }, { namePrefix: 'Garmin' }
    );
  }

  try {
    return await navigator.bluetooth.requestDevice({
      filters: filters,
      optionalServices: optionalServices
    });
  } catch (err) {
    if (err.name !== 'NotFoundError') { showToast('Error al buscar: ' + err.message); }
    return null;
  }
}

export async function connectDevice(deviceType, scanAll) {
  var device = await scanForDevice(deviceType, scanAll);
  if (!device) return false;

  _bleDevice = device;
  var profile = DEVICE_PROFILES[deviceType];

  // Retry GATT connection up to 5 times with increasing delays
  var maxRetries = 5;
  var connected = false;

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt <= 2) showToast('Conectando... intento ' + attempt);
      else showToast('Reintentando conexion (' + attempt + ')...');

      if (attempt > 1) await _delay(2000 * attempt);

      _bleServer = await device.gatt.connect();
      connected = true;
      break;
    } catch (err) {
      if (attempt === maxRetries) {
        showToast('No se pudo conectar. Verifica que el dispositivo soporte BLE Heart Rate estandar.');
        _bleDevice = null;
        return false;
      }
    }
  }

  if (!connected) return false;

  try {
    await _delay(800);

    // Subscribe to standard Heart Rate service (0x180D)
    try {
      var hrService = await _bleServer.getPrimaryService(BLE_SERVICES.heart_rate);
      _hrCharacteristic = await hrService.getCharacteristic(profile.characteristics.heartRate);
      await _hrCharacteristic.startNotifications();
      _hrCharacteristic.addEventListener('characteristicvaluechanged', _onHeartRateChanged);
    } catch (_e) {
      showToast('Dispositivo no soporta Heart Rate BLE estandar. Usa Puente de Salud (Google Fit).');
    }

    // Handle disconnect with aggressive auto-reconnect
    // The device should stay connected until the user explicitly disconnects
    device.addEventListener('gattserverdisconnected', function () {
      _onDisconnected();
      // Only auto-reconnect if disconnect was unexpected (device ref still held)
      if (!_bleDevice) return;
      // Aggressive reconnect: 10 attempts with increasing delays (up to ~2 minutes total)
      var delays = [500, 1000, 2000, 3000, 5000, 5000, 8000, 10000, 15000, 20000];
      var attempt = 0;
      var _reconnecting = true;
      function tryReconnect() {
        if (!_bleDevice || !_reconnecting) return; // user manually disconnected
        if (_bleDevice.gatt && _bleDevice.gatt.connected) {
          showToast('Dispositivo conectado');
          return;
        }
        if (attempt >= delays.length) {
          // Final attempt failed — but DON'T give up, schedule periodic retry every 30s
          showToast('Reintentando conexion...');
          setTimeout(function periodicRetry() {
            if (!_bleDevice || !_reconnecting) return;
            if (_bleDevice.gatt && _bleDevice.gatt.connected) return;
            _bleDevice.gatt.connect().then(function (server) {
              _bleServer = server;
              return server.getPrimaryService(BLE_SERVICES.heart_rate).then(function (hrService) {
                return hrService.getCharacteristic(DEVICE_PROFILES[_loadState().activeDevice || deviceType].characteristics.heartRate);
              }).then(function (char) {
                _hrCharacteristic = char;
                return char.startNotifications();
              }).then(function () {
                _hrCharacteristic.addEventListener('characteristicvaluechanged', _onHeartRateChanged);
              });
            }).then(function () {
              showToast('Reconectado!');
              startMonitoring('normal');
            }).catch(function () {
              // Keep trying every 30 seconds indefinitely until user disconnects
              setTimeout(periodicRetry, 30000);
            });
          }, 30000);
          return;
        }
        if (attempt === 0) {
          showToast('Reconectando dispositivo...');
        } else if (attempt % 3 === 0) {
          showToast('Reconectando... (' + (attempt + 1) + '/' + delays.length + ')');
        }
        _bleDevice.gatt.connect().then(function (server) {
          _bleServer = server;
          return server.getPrimaryService(BLE_SERVICES.heart_rate).then(function (hrService) {
            return hrService.getCharacteristic(DEVICE_PROFILES[_loadState().activeDevice || deviceType].characteristics.heartRate);
          }).then(function (char) {
            _hrCharacteristic = char;
            return char.startNotifications();
          }).then(function () {
            _hrCharacteristic.addEventListener('characteristicvaluechanged', _onHeartRateChanged);
          });
        }).then(function () {
          showToast('Reconectado!');
          startMonitoring('normal');
        }).catch(function () {
          attempt++;
          if (attempt < delays.length) {
            setTimeout(tryReconnect, delays[attempt]);
          } else {
            // Transition to periodic retry (every 30s)
            tryReconnect();
          }
        });
      }
      setTimeout(tryReconnect, delays[0]);
    });

    // Save state
    var st = _loadState();
    st.activeDevice = deviceType;
    st.deviceName = device.name || profile.name;
    st.deviceId = device.id || '';
    _saveState(st);

    showToast('\u2705 Conectado a ' + (device.name || profile.name));

    startMonitoring('normal');
    startBreathingCoach();

    return true;
  } catch (err) {
    showToast('Error configurando dispositivo: ' + err.message);
    return false;
  }
}

export function disconnectDevice() {
  _stopMonitoringInternal();
  var dev = _bleDevice;
  _bleDevice = null; // Clear ref first so auto-reconnect handler won't fire
  if (dev && dev.gatt && dev.gatt.connected) {
    dev.gatt.disconnect();
  }
  _bleServer = null;
  _hrCharacteristic = null;
  var st = _loadState();
  st.activeDevice = null;
  st.deviceName = '';
  st.deviceId = '';
  _saveState(st);
  showToast('Dispositivo desconectado');
}

function _onDisconnected() {
  _stopMonitoringInternal();
  _bleServer = null;
  _hrCharacteristic = null;
  showToast('Dispositivo desconectado');
}

/* ═══════════════════════════════════════════════════════════════════════
   SIMULATOR — Test without physical devices
   ═══════════════════════════════════════════════════════════════════════ */
export function startSimulator(deviceType) {
  stopSimulator();
  _simulatorActive = true;
  _simulatorDevice = deviceType || 'colmi_p17';
  var profile = DEVICE_PROFILES[_simulatorDevice];
  var st = _loadState();
  st.activeDevice = _simulatorDevice;
  st.deviceName = profile.name + ' (Simulador)';
  st.deviceId = 'simulator_' + _simulatorDevice;
  _saveState(st);
  _lastReading.battery = 85;
  _monitoringActive = true;

  // Simulator scenarios
  var _simTick = 0;
  var _simBaseHR = 68 + Math.random() * 10;
  var _simBaseRR = Math.round(60000 / _simBaseHR);
  var _simBaseSpo2 = 96 + Math.random() * 2;
  var _simBaseSystolic = 115 + Math.random() * 15;
  var _simBaseDiastolic = 72 + Math.random() * 10;
  var _simBaseTemp = 36.4 + Math.random() * 0.5;
  var _simSteps = Math.floor(Math.random() * 3000) + 2000;
  var _simScenario = 'normal'; // normal, exercise, sleeping, arrhythmia_demo, apnea_demo

  // Pre-fill some history so charts aren't empty
  var now = Date.now();
  for (var i = 600; i > 0; i--) {
    var t = now - i * 1000;
    var histHR = Math.round(_simBaseHR + Math.sin(i * 0.01) * 4 + (Math.random() - 0.5) * 6);
    _pushBuffer(_hrBuffer, { v: histHR, t: t }, HR_BUFFER_SIZE);
    var histRR = Math.round(60000 / histHR + (Math.random() - 0.5) * 30);
    _pushBuffer(_rrBuffer, { v: histRR, t: t }, RR_BUFFER_SIZE);
    if (i % 3 === 0) {
      var histSpo2 = Math.round(_simBaseSpo2 + Math.sin(i * 0.005) * 1.5 + (Math.random() - 0.5) * 1);
      histSpo2 = Math.min(100, Math.max(88, histSpo2));
      _pushBuffer(_spo2Buffer, { v: histSpo2, t: t }, SPO2_BUFFER_SIZE);
    }
    if (i % 60 === 0) {
      _pushBuffer(_bpBuffer, { v: { s: Math.round(_simBaseSystolic + Math.random() * 6 - 3), d: Math.round(_simBaseDiastolic + Math.random() * 4 - 2) }, t: t }, 500);
      _pushBuffer(_tempBuffer, { v: Math.round((_simBaseTemp + Math.random() * 0.2 - 0.1) * 10) / 10, t: t }, 500);
    }
  }
  _pushBuffer(_stepsBuffer, { v: _simSteps, t: now }, 500);

  _simulatorInterval = setInterval(function () {
    _simTick++;
    var t = Date.now();

    // Every 100 ticks, maybe change scenario
    if (_simTick % 100 === 0) {
      var scenarios = ['normal', 'normal', 'normal', 'exercise', 'arrhythmia_demo', 'apnea_demo'];
      _simScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    }

    var hr, rr, spo2, sys, dia, temp, stress;

    switch (_simScenario) {
      case 'exercise':
        hr = Math.round(130 + Math.sin(_simTick * 0.05) * 20 + (Math.random() - 0.5) * 8);
        rr = Math.round(60000 / hr + (Math.random() - 0.5) * 15);
        spo2 = Math.round(95 + Math.random() * 3);
        sys = Math.round(145 + Math.random() * 15);
        dia = Math.round(80 + Math.random() * 8);
        temp = Math.round((37.2 + Math.random() * 0.5) * 10) / 10;
        stress = Math.round(60 + Math.random() * 20);
        break;
      case 'arrhythmia_demo':
        // Simulate PVCs and irregular rhythm
        if (_simTick % 7 === 0) {
          hr = Math.round(_simBaseHR + 25 + Math.random() * 15); // premature fast beat
          rr = Math.round(_simBaseRR * 0.65 + Math.random() * 30); // short RR
        } else if (_simTick % 7 === 1) {
          hr = Math.round(_simBaseHR - 10); // compensatory pause
          rr = Math.round(_simBaseRR * 1.4 + Math.random() * 40); // long RR
        } else {
          hr = Math.round(_simBaseHR + (Math.random() - 0.5) * 8);
          rr = Math.round(_simBaseRR + (Math.random() - 0.5) * 40);
        }
        spo2 = Math.round(96 + Math.random() * 2);
        sys = Math.round(_simBaseSystolic + Math.random() * 8 - 4);
        dia = Math.round(_simBaseDiastolic + Math.random() * 5 - 2);
        temp = Math.round(_simBaseTemp * 10) / 10;
        stress = Math.round(70 + Math.random() * 20);
        break;
      case 'apnea_demo':
        // Simulate desaturation events
        hr = Math.round(_simBaseHR + Math.sin(_simTick * 0.1) * 15 + (Math.random() - 0.5) * 4);
        rr = Math.round(60000 / hr + (Math.random() - 0.5) * 20);
        var apneaCycle = Math.sin(_simTick * 0.03);
        if (apneaCycle < -0.6) {
          spo2 = Math.round(87 + Math.random() * 4); // desaturation
        } else {
          spo2 = Math.round(95 + Math.random() * 3); // recovery
        }
        sys = Math.round(_simBaseSystolic + Math.random() * 6 - 3);
        dia = Math.round(_simBaseDiastolic + Math.random() * 4 - 2);
        temp = Math.round(_simBaseTemp * 10) / 10;
        stress = Math.round(55 + Math.random() * 15);
        break;
      default: // normal
        hr = Math.round(_simBaseHR + Math.sin(_simTick * 0.02) * 5 + (Math.random() - 0.5) * 6);
        rr = Math.round(60000 / hr + (Math.random() - 0.5) * 25);
        spo2 = Math.round(96 + Math.random() * 3);
        sys = Math.round(_simBaseSystolic + Math.random() * 6 - 3);
        dia = Math.round(_simBaseDiastolic + Math.random() * 4 - 2);
        temp = Math.round((_simBaseTemp + Math.random() * 0.2 - 0.1) * 10) / 10;
        stress = Math.round(30 + Math.random() * 25);
    }

    hr = Math.max(40, Math.min(200, hr));
    spo2 = Math.max(82, Math.min(100, spo2));
    rr = Math.max(300, Math.min(1500, rr));

    _lastReading.heartRate = hr;
    _lastReading.rrInterval = rr;
    _lastReading.spo2 = spo2;
    _lastReading.systolic = sys;
    _lastReading.diastolic = dia;
    _lastReading.bodyTemp = temp;
    _lastReading.stress = stress;
    _lastReading.timestamp = t;
    _lastReading.battery = Math.max(0, 85 - Math.floor(_simTick / 500));

    if (_simTick % 15 === 0) {
      _simSteps += Math.floor(Math.random() * 8);
      _lastReading.steps = _simSteps;
      _lastReading.calories = Math.round(_simSteps * 0.04);
      _lastReading.distance = Math.round(_simSteps * 0.75);
      _pushBuffer(_stepsBuffer, { v: _simSteps, t: t }, 500);
    }

    _pushBuffer(_hrBuffer, { v: hr, t: t }, HR_BUFFER_SIZE);
    _pushBuffer(_rrBuffer, { v: rr, t: t }, RR_BUFFER_SIZE);
    _pushBuffer(_spo2Buffer, { v: spo2, t: t }, SPO2_BUFFER_SIZE);

    if (_simTick % 30 === 0) {
      _pushBuffer(_bpBuffer, { v: { s: sys, d: dia }, t: t }, 500);
      _pushBuffer(_tempBuffer, { v: temp, t: t }, 500);
      _pushBuffer(_stressBuffer, { v: stress, t: t }, 500);
    }

    // Check alerts
    var alerts = checkAlerts(_lastReading);
    alerts.forEach(function (a) { _handleAlert(a); });

    // Persist every 60 ticks
    if (_simTick % 60 === 0) _persistBuffers();

    // Live update dashboard values if visible
    _updateLiveUI();
  }, 1000);

  showToast('Simulador activado: ' + profile.name);
  return true;
}

export function stopSimulator() {
  if (_simulatorInterval) {
    clearInterval(_simulatorInterval);
    _simulatorInterval = null;
  }
  if (_simulatorActive) {
    _simulatorActive = false;
    _simulatorDevice = null;
    _monitoringActive = false;
    var st = _loadState();
    st.activeDevice = null;
    st.deviceName = '';
    st.deviceId = '';
    _saveState(st);
    showToast('Simulador detenido');
  }
}

function _updateLiveUI() {
  // Update real-time values on the dashboard without full re-render
  var hrEl = document.getElementById('wbl-hr-value');
  if (hrEl) hrEl.textContent = _lastReading.heartRate || '--';
  var spo2El = document.getElementById('wbl-spo2-value');
  if (spo2El) spo2El.textContent = (_lastReading.spo2 || '--') + '%';
  var bpEl = document.getElementById('wbl-bp-value');
  if (bpEl) bpEl.textContent = (_lastReading.systolic || '--') + '/' + (_lastReading.diastolic || '--');
  var tempEl = document.getElementById('wbl-temp-value');
  if (tempEl) tempEl.textContent = (_lastReading.bodyTemp || '--');
  var stressEl = document.getElementById('wbl-stress-value');
  if (stressEl) stressEl.textContent = _lastReading.stress ? _lastReading.stress + '/100' : 'Sin datos';
  var stepsEl = document.getElementById('wbl-steps-value');
  if (stepsEl) stepsEl.textContent = _lastReading.steps ? _lastReading.steps.toLocaleString() : '--';
}

export function getConnectionStatus() {
  var st = _loadState();
  var connected = _simulatorActive || (_bleDevice && _bleDevice.gatt && _bleDevice.gatt.connected);
  return {
    connected: !!connected,
    simulated: _simulatorActive,
    deviceName: st.deviceName,
    deviceType: st.activeDevice,
    battery: _lastReading.battery,
    lastSync: _lastReading.timestamp ? new Date(_lastReading.timestamp).toLocaleTimeString() : '--'
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   BLE DATA PARSING
   ═══════════════════════════════════════════════════════════════════════ */
function _onHeartRateChanged(event) {
  var value = event.target.value;
  var flags = value.getUint8(0);
  var hrFormat16 = flags & 0x01;
  var rrPresent = flags & 0x10;
  var offset = 1;
  var hr;
  if (hrFormat16) {
    hr = value.getUint16(offset, true);
    offset += 2;
  } else {
    hr = value.getUint8(offset);
    offset += 1;
  }
  _lastReading.heartRate = hr;
  _lastReading.timestamp = Date.now();
  _pushBuffer(_hrBuffer, { v: hr, t: Date.now() }, HR_BUFFER_SIZE);
  // RR intervals
  if (rrPresent) {
    while (offset + 1 < value.byteLength) {
      var rr = value.getUint16(offset, true); // 1/1024 second resolution
      var rrMs = Math.round(rr * 1000 / 1024);
      _lastReading.rrInterval = rrMs;
      _pushBuffer(_rrBuffer, { v: rrMs, t: Date.now() }, RR_BUFFER_SIZE);
      offset += 2;
    }
  }
  // Check alerts
  if (_monitoringActive) {
    var alerts = checkAlerts(_lastReading);
    alerts.forEach(function (a) { _handleAlert(a); });
  }
}

function _delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function _pushBuffer(buf, item, max) {
  buf.push(item);
  if (buf.length > max) buf.shift();
}

/* ═══════════════════════════════════════════════════════════════════════
   MONITORING CONTROL
   ═══════════════════════════════════════════════════════════════════════ */
export function startMonitoring(mode) {
  // Stop any existing monitoring first
  _stopMonitoringInternal();

  // Map legacy 'normal' mode to 'rest'
  if (mode === 'normal' || !mode) mode = 'rest';

  var modeConfig = MONITORING_MODES[mode] || MONITORING_MODES.rest;
  var st = _loadState();
  st.monitoringMode = mode;
  st.currentSession = { start: Date.now(), mode: st.monitoringMode, readings: 0 };
  _saveState(st);
  _monitoringActive = true;

  // Use mode-specific sampling interval, fallback to settings
  var intervalMs = modeConfig.samplingInterval || Math.max((st.settings.syncInterval || 15) * 1000, 10000);

  // If exercise mode, initialize session if not already started via startExerciseSession
  if (mode.indexOf('exercise_') === 0 && !_exerciseSession) {
    var exerciseType = mode.replace('exercise_', '');
    var profile = {};
    try {
      var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
      profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + user.email) || '{}');
    } catch(_e) {}
    var age = profile.age || profile.edad || 30;
    var restingHR = _getRestingHR();
    _exerciseZones = calculateHRZones(age, restingHR);
    _exerciseSession = {
      mode: mode,
      exerciseType: exerciseType,
      startTime: Date.now(),
      hrReadings: [],
      zoneTime: { z0: 0, z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 },
      maxHR: 0,
      minHR: 999,
      totalHR: 0,
      readingCount: 0,
      calories: 0,
      paused: false,
      pausedAt: null,
      totalPausedTime: 0
    };
  }

  _monitoringInterval = setInterval(function () {
    var curSt = _loadState();
    if (curSt.currentSession) curSt.currentSession.readings++;
    _saveState(curSt);
    // Update live UI
    _updateLiveUI();
    // Check alerts with latest reading
    if (_lastReading.heartRate > 0) {
      var alerts = checkAlerts(_lastReading);
      alerts.forEach(function (a) { _handleAlert(a); });
    }
    // Track exercise zone time
    if (_exerciseSession && !_exerciseSession.paused && _exerciseZones && _lastReading.heartRate > 0) {
      var zone = getCurrentHRZone(_lastReading.heartRate, _exerciseZones);
      _exerciseSession.zoneTime['z' + zone.zone] = (_exerciseSession.zoneTime['z' + zone.zone] || 0) + (intervalMs / 1000);
      _exerciseSession.hrReadings.push({ hr: _lastReading.heartRate, t: Date.now() });
      if (_exerciseSession.hrReadings.length > 10000) _exerciseSession.hrReadings = _exerciseSession.hrReadings.slice(-5000);
      if (_lastReading.heartRate > _exerciseSession.maxHR) _exerciseSession.maxHR = _lastReading.heartRate;
      if (_lastReading.heartRate < _exerciseSession.minHR) _exerciseSession.minHR = _lastReading.heartRate;
      _exerciseSession.totalHR += _lastReading.heartRate;
      _exerciseSession.readingCount++;
    }
  }, intervalMs);
  // Persist buffers every 60s
  _persistInterval = setInterval(_persistBuffers, 60000);
  var modeLabel = modeConfig.icon + ' ' + modeConfig.label;
  showToast('Monitoreo iniciado: ' + modeLabel);
}

export function stopMonitoring() {
  _stopMonitoringInternal();
  var st = _loadState();
  if (st.currentSession) {
    st.currentSession.end = Date.now();
    st.sessions.push(st.currentSession);
    if (st.sessions.length > 100) st.sessions = st.sessions.slice(-100);
    st.currentSession = null;
    _saveState(st);
  }
  _persistBuffers();
  showToast('Monitoreo detenido');
}

function _stopMonitoringInternal() {
  _monitoringActive = false;
  if (_monitoringInterval) { clearInterval(_monitoringInterval); _monitoringInterval = null; }
  if (_persistInterval) { clearInterval(_persistInterval); _persistInterval = null; }
  if (_animFrameId) { cancelAnimationFrame(_animFrameId); _animFrameId = null; }
}

/* ═══════════════════════════════════════════════════════════════════════
   EXERCISE SESSION TRACKING
   ═══════════════════════════════════════════════════════════════════════ */
export function startExerciseSession(exerciseType) {
  var mode = 'exercise_' + exerciseType;
  if (!MONITORING_MODES[mode]) { showToast('Tipo de ejercicio no valido'); return; }
  // Get user age for HR zones
  var profile = {};
  try {
    var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
    profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + user.email) || '{}');
  } catch(_e) {}
  var age = profile.age || profile.edad || 30;
  var restingHR = _getRestingHR();
  _exerciseZones = calculateHRZones(age, restingHR);
  _exerciseSession = {
    mode: mode,
    exerciseType: exerciseType,
    startTime: Date.now(),
    hrReadings: [],
    zoneTime: { z0: 0, z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 },
    maxHR: 0,
    minHR: 999,
    totalHR: 0,
    readingCount: 0,
    calories: 0,
    paused: false,
    pausedAt: null,
    totalPausedTime: 0
  };
  startMonitoring(mode);
  showToast(MONITORING_MODES[mode].icon + ' Sesion de ' + MONITORING_MODES[mode].label + ' iniciada');
}

export function pauseExerciseSession() {
  if (!_exerciseSession || _exerciseSession.paused) return;
  _exerciseSession.paused = true;
  _exerciseSession.pausedAt = Date.now();
  _stopMonitoringInternal();
  showToast('\u23F8\uFE0F Sesion pausada');
}

export function resumeExerciseSession() {
  if (!_exerciseSession || !_exerciseSession.paused) return;
  _exerciseSession.totalPausedTime += Date.now() - _exerciseSession.pausedAt;
  _exerciseSession.paused = false;
  _exerciseSession.pausedAt = null;
  startMonitoring(_exerciseSession.mode);
  showToast('\u25B6\uFE0F Sesion reanudada');
}

export function stopExerciseSession() {
  if (!_exerciseSession) return null;
  var session = Object.assign({}, _exerciseSession);
  session.endTime = Date.now();
  session.duration = session.endTime - session.startTime - session.totalPausedTime;
  session.avgHR = session.readingCount > 0 ? Math.round(session.totalHR / session.readingCount) : 0;
  // Calculate calories (simplified Keytel formula)
  var durationMin = session.duration / 60000;
  var profile = {};
  try {
    var user = JSON.parse(localStorage.getItem('dya_user') || '{}');
    profile = JSON.parse(localStorage.getItem('dya_patient_profile_' + user.email) || '{}');
  } catch(_e) {}
  var weight = profile.weight || profile.peso || 70;
  var gender = profile.gender || profile.genero || 'M';
  if (gender === 'M') {
    session.calories = Math.round(durationMin * (0.6309 * session.avgHR + 0.1988 * weight + 0.2017 * (profile.age||30) - 55.0969) / 4.184);
  } else {
    session.calories = Math.round(durationMin * (0.4472 * session.avgHR - 0.1263 * weight + 0.074 * (profile.age||30) - 20.4022) / 4.184);
  }
  session.calories = Math.max(0, session.calories);
  // Recovery check - HR after 1 min
  session.recoveryHR = _lastReading.heartRate;
  // Save to history
  _saveExerciseHistory(session);
  _exerciseSession = null;
  _exerciseZones = null;
  stopMonitoring();
  return session;
}

function _getRestingHR() {
  // Calculate from buffer - lowest average over 5 min window
  if (_hrBuffer.length < 30) return 65;
  var sorted = _hrBuffer.slice(-300).map(function(r) { return r.v; }).sort(function(a,b) { return a-b; });
  return Math.round(sorted[Math.floor(sorted.length * 0.1)]); // 10th percentile
}

function _saveExerciseHistory(session) {
  var email = _getEmail();
  var key = 'dya_exercise_history_' + email;
  try {
    var history = JSON.parse(localStorage.getItem(key) || '[]');
    history.push({
      mode: session.mode,
      exerciseType: session.exerciseType,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      avgHR: session.avgHR,
      maxHR: session.maxHR,
      minHR: session.minHR === 999 ? 0 : session.minHR,
      calories: session.calories,
      zoneTime: session.zoneTime,
      recoveryHR: session.recoveryHR
    });
    if (history.length > 200) history = history.slice(-200);
    localStorage.setItem(key, JSON.stringify(history));
  } catch(_e) {}
}

export function getExerciseHistory(days) {
  var email = _getEmail();
  var cutoff = Date.now() - (days || 30) * 86400000;
  try {
    var history = JSON.parse(localStorage.getItem('dya_exercise_history_' + email) || '[]');
    return history.filter(function(s) { return s.startTime >= cutoff; });
  } catch(_e) { return []; }
}

export function getExerciseSession() {
  return _exerciseSession ? Object.assign({}, _exerciseSession) : null;
}

export function getExerciseZones() {
  return _exerciseZones;
}

/* ═══════════════════════════════════════════════════════════════════════
   MONITORING PRESCRIPTION
   ═══════════════════════════════════════════════════════════════════════ */
export function getMonitoringPrescription() {
  var email = _getEmail();
  try {
    return JSON.parse(localStorage.getItem('dya_monitoring_prescription_' + email) || 'null');
  } catch(_e) { return null; }
}

export function hasPrescription(mode) {
  var rx = getMonitoringPrescription();
  if (!rx) return false;
  return rx.mode === mode && rx.active && (!rx.expiresAt || rx.expiresAt > Date.now());
}

/* ═══════════════════════════════════════════════════════════════════════
   PRE/POST SURGERY BASELINE
   ═══════════════════════════════════════════════════════════════════════ */
export function startSurgeryBaseline() {
  var email = _getEmail();
  var baseline = {
    startTime: Date.now(),
    hrReadings: [],
    rrReadings: [],
    spo2Readings: [],
    duration: 0,
    completed: false
  };
  localStorage.setItem('dya_surgery_baseline_' + email, JSON.stringify(baseline));
  startMonitoring('pre_surgery');
  showToast('Baseline pre-quirurgico iniciado (24h recomendado)');
}

export function getSurgeryBaseline() {
  var email = _getEmail();
  try {
    return JSON.parse(localStorage.getItem('dya_surgery_baseline_' + email) || 'null');
  } catch(_e) { return null; }
}

export function completeSurgeryBaseline() {
  var email = _getEmail();
  var baseline = getSurgeryBaseline();
  if (!baseline) return null;
  baseline.completed = true;
  baseline.endTime = Date.now();
  baseline.duration = baseline.endTime - baseline.startTime;
  // Calculate baseline stats
  var hrs = _hrBuffer.slice(-3600).map(function(r) { return r.v; });
  var rrs = _rrBuffer.slice(-2000).map(function(r) { return r.v; });
  if (hrs.length > 0) {
    var hrSum = hrs.reduce(function(a,b) { return a+b; }, 0);
    baseline.avgHR = Math.round(hrSum / hrs.length);
    baseline.maxHR = Math.max.apply(null, hrs);
    baseline.minHR = Math.min.apply(null, hrs);
  }
  if (rrs.length > 10) {
    baseline.hrv = analyzeHeartRateVariability(rrs.map(function(v) { return { v: v, t: 0 }; }));
  }
  localStorage.setItem('dya_surgery_baseline_' + email, JSON.stringify(baseline));
  stopMonitoring();
  showToast('Baseline pre-quirurgico completado');
  return baseline;
}

export function generateSurgeryReport() {
  var baseline = getSurgeryBaseline();
  var email = _getEmail();
  var currentHRV = analyzeHeartRateVariability(_rrBuffer.slice(-500));
  var arrhythmia = detectArrhythmia(_rrBuffer.slice(-500), _hrBuffer.slice(-500));
  return {
    patient: email,
    generatedAt: new Date().toISOString(),
    baseline: baseline,
    current: {
      avgHR: _lastReading.heartRate,
      hrv: currentHRV,
      arrhythmia: arrhythmia,
      spo2: _lastReading.spo2
    },
    comparison: baseline ? {
      hrDelta: _lastReading.heartRate - (baseline.avgHR || 0),
      hrvDelta: currentHRV.rmssd - ((baseline.hrv || {}).rmssd || 0),
      status: _lastReading.heartRate > (baseline.avgHR || 70) + 20 ? 'ATENCION' : 'ESTABLE'
    } : null,
    disclaimer: 'Este reporte es informativo y NO sustituye evaluacion medica profesional.'
  };
}

function _persistBuffers() {
  var email = _getEmail();
  if (!email) return;
  try {
    var data = {
      hr: _hrBuffer.slice(-500),
      spo2: _spo2Buffer.slice(-300),
      rr: _rrBuffer.slice(-500),
      bp: _bpBuffer.slice(-100),
      steps: _stepsBuffer.slice(-100),
      temp: _tempBuffer.slice(-100),
      stress: _stressBuffer.slice(-100),
      lastReading: _lastReading,
      savedAt: Date.now()
    };
    localStorage.setItem('dya_wearable_buffers_' + email, JSON.stringify(data));
  } catch (_e) { /* storage full */ }
}

function _loadBuffers() {
  var email = _getEmail();
  try {
    var data = JSON.parse(localStorage.getItem('dya_wearable_buffers_' + email) || 'null');
    if (data) {
      _hrBuffer = data.hr || [];
      _spo2Buffer = data.spo2 || [];
      _rrBuffer = data.rr || [];
      _bpBuffer = data.bp || [];
      _stepsBuffer = data.steps || [];
      _tempBuffer = data.temp || [];
      _stressBuffer = data.stress || [];
      if (data.lastReading) _lastReading = data.lastReading;
    }
  } catch (_e) { /* ignore */ }
}

export function getCurrentReading() {
  return Object.assign({}, _lastReading);
}

export function getMetricsHistory(metric, hours) {
  var cutoff = Date.now() - (hours || 1) * 3600000;
  var buf;
  switch (metric) {
    case 'heartRate': buf = _hrBuffer; break;
    case 'spo2': buf = _spo2Buffer; break;
    case 'rr': buf = _rrBuffer; break;
    case 'bp': buf = _bpBuffer; break;
    case 'steps': buf = _stepsBuffer; break;
    case 'temp': buf = _tempBuffer; break;
    case 'stress': buf = _stressBuffer; break;
    default: buf = [];
  }
  return buf.filter(function (r) { return r.t >= cutoff; });
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — HRV
   ═══════════════════════════════════════════════════════════════════════ */
export function analyzeHeartRateVariability(rrIntervals) {
  if (!rrIntervals || rrIntervals.length < 10) {
    return { sdnn: 0, rmssd: 0, pnn50: 0, meanRR: 0, lfHfRatio: 0, stressIndex: 0, recoveryScore: 0, valid: false };
  }
  var vals = rrIntervals.map(function (r) { return typeof r === 'object' ? r.v : r; });
  var n = vals.length;
  var sum = 0;
  for (var i = 0; i < n; i++) sum += vals[i];
  var meanRR = sum / n;
  // SDNN
  var sqSum = 0;
  for (var j = 0; j < n; j++) sqSum += (vals[j] - meanRR) * (vals[j] - meanRR);
  var sdnn = Math.sqrt(sqSum / n);
  // RMSSD
  var diffSqSum = 0;
  var nn50 = 0;
  for (var k = 1; k < n; k++) {
    var diff = vals[k] - vals[k - 1];
    diffSqSum += diff * diff;
    if (Math.abs(diff) > 50) nn50++;
  }
  var rmssd = Math.sqrt(diffSqSum / (n - 1));
  var pnn50 = (nn50 / (n - 1)) * 100;
  // LF/HF ratio approximation from RMSSD
  var lfHfRatio = rmssd > 0 ? Math.max(0.1, Math.min(10, (sdnn / rmssd) * 1.5)) : 1;
  // Stress index (lower HRV = higher stress)
  var stressIndex = Math.max(0, Math.min(100, Math.round(100 - (rmssd / 1.5))));
  // Recovery score (higher HRV = better recovery)
  var recoveryScore = Math.max(0, Math.min(100, Math.round(rmssd / 0.8)));
  return {
    sdnn: Math.round(sdnn * 10) / 10,
    rmssd: Math.round(rmssd * 10) / 10,
    pnn50: Math.round(pnn50 * 10) / 10,
    meanRR: Math.round(meanRR),
    lfHfRatio: Math.round(lfHfRatio * 100) / 100,
    stressIndex: stressIndex,
    recoveryScore: recoveryScore,
    valid: true
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — ARRHYTHMIA DETECTION
   ═══════════════════════════════════════════════════════════════════════ */
export function detectArrhythmia(rrIntervals, heartRates) {
  var result = {
    classification: 'Normal Sinus',
    confidence: 0,
    events: [],
    prematureBeats: 0,
    compensatoryPauses: 0,
    afibSuspect: false,
    pvcsDetected: 0,
    pacsDetected: 0,
    tachycardia: false,
    bradycardia: false
  };
  if (!rrIntervals || rrIntervals.length < 20) return result;
  var vals = rrIntervals.map(function (r) { return typeof r === 'object' ? r.v : r; });
  var hrs = heartRates ? heartRates.map(function (r) { return typeof r === 'object' ? r.v : r; }) : [];
  var n = vals.length;
  // Mean RR
  var sum = 0;
  for (var i = 0; i < n; i++) sum += vals[i];
  var meanRR = sum / n;
  // Coefficient of variation
  var sqDiffSum = 0;
  for (var j = 0; j < n; j++) sqDiffSum += (vals[j] - meanRR) * (vals[j] - meanRR);
  var stdRR = Math.sqrt(sqDiffSum / n);
  var cv = (stdRR / meanRR) * 100;
  // Detect premature beats & compensatory pauses
  for (var k = 1; k < n; k++) {
    var ratio = vals[k] / meanRR;
    if (ratio < 0.8) {
      result.prematureBeats++;
      // Check if it's PVC (wider QRS implied by very short interval + compensatory)
      if (k + 1 < n && vals[k + 1] / meanRR > 1.2) {
        result.pvcsDetected++;
        result.events.push({ type: 'PVC', index: k, rr: vals[k], time: rrIntervals[k].t || 0 });
      } else {
        result.pacsDetected++;
        result.events.push({ type: 'PAC', index: k, rr: vals[k], time: rrIntervals[k].t || 0 });
      }
    }
    if (ratio > 1.2) {
      result.compensatoryPauses++;
    }
  }
  // RMSSD for AFib detection
  var diffSq = 0;
  for (var m = 1; m < n; m++) {
    var d = vals[m] - vals[m - 1];
    diffSq += d * d;
  }
  var rmssd = Math.sqrt(diffSq / (n - 1));
  // AFib: irregularly irregular = high CV + high RMSSD
  if (cv > 15 && rmssd > 50) {
    result.afibSuspect = true;
    result.classification = 'AFib suspect';
    result.confidence = Math.min(90, Math.round(cv * 2));
    result.events.push({ type: 'AFib', index: 0, detail: 'Ritmo irregularmente irregular' });
  }
  // Tachycardia / Bradycardia from HR
  if (hrs.length > 10) {
    var hrSum = 0;
    for (var p = 0; p < hrs.length; p++) hrSum += hrs[p];
    var avgHR = hrSum / hrs.length;
    if (avgHR > 100) {
      result.tachycardia = true;
      if (!result.afibSuspect) result.classification = 'Sinus Tachycardia';
    }
    if (avgHR < 50) {
      result.bradycardia = true;
      if (!result.afibSuspect) result.classification = 'Sinus Bradycardia';
    }
  }
  // PVC/PAC prevalence
  if (result.pvcsDetected > 5 && !result.afibSuspect) {
    result.classification = 'PVC suspect';
    result.confidence = Math.min(80, result.pvcsDetected * 5);
  } else if (result.pacsDetected > 5 && !result.afibSuspect && result.pvcsDetected <= 5) {
    result.classification = 'PAC suspect';
    result.confidence = Math.min(70, result.pacsDetected * 5);
  }
  if (result.classification === 'Normal Sinus') {
    result.confidence = Math.max(0, 95 - Math.round(cv * 2));
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — SLEEP APNEA DETECTION
   ═══════════════════════════════════════════════════════════════════════ */
export function detectSleepApnea(spo2History, heartRateHistory) {
  var result = {
    events: [],
    eventCount: 0,
    totalHours: 0,
    ahiEstimate: 0,
    ahiCategory: 'Normal',
    timeBelow88: 0,
    avgDesaturation: 0,
    bradyTachyCycles: 0,
    valid: false
  };
  if (!spo2History || spo2History.length < 60) return result;
  var spo2 = spo2History.map(function (r) { return typeof r === 'object' ? r.v : r; });
  var times = spo2History.map(function (r) { return typeof r === 'object' ? r.t : 0; });
  var st = _loadState();
  var threshold = st.alertThresholds.apneaDesaturationThreshold || 4;
  var minDuration = st.alertThresholds.apneaMinDuration || 10;
  // Compute baseline SpO2 (95th percentile)
  var sorted = spo2.slice().sort(function (a, b) { return a - b; });
  var baseline = sorted[Math.floor(sorted.length * 0.95)];
  // Detect desaturation events
  var inEvent = false;
  var eventStart = 0;
  var eventMinSpo2 = 100;
  var totalDesat = 0;
  var timeBelow88 = 0;
  for (var i = 0; i < spo2.length; i++) {
    if (spo2[i] < 88) timeBelow88++;
    var drop = baseline - spo2[i];
    if (!inEvent && drop >= threshold) {
      inEvent = true;
      eventStart = i;
      eventMinSpo2 = spo2[i];
    } else if (inEvent) {
      if (spo2[i] < eventMinSpo2) eventMinSpo2 = spo2[i];
      if (drop < threshold * 0.5 || i === spo2.length - 1) {
        var duration = i - eventStart;
        if (duration >= minDuration) {
          result.events.push({
            start: times[eventStart] || eventStart,
            end: times[i] || i,
            duration: duration,
            nadir: eventMinSpo2,
            desaturation: baseline - eventMinSpo2
          });
          totalDesat += baseline - eventMinSpo2;
        }
        inEvent = false;
      }
    }
  }
  result.eventCount = result.events.length;
  // Estimate recording duration in hours
  if (times.length >= 2 && times[0] > 0) {
    result.totalHours = (times[times.length - 1] - times[0]) / 3600000;
  } else {
    result.totalHours = spo2.length / 3600; // assume 1 reading/sec
  }
  if (result.totalHours > 0) {
    result.ahiEstimate = Math.round((result.eventCount / result.totalHours) * 10) / 10;
  }
  result.timeBelow88 = timeBelow88;
  result.avgDesaturation = result.eventCount > 0 ? Math.round((totalDesat / result.eventCount) * 10) / 10 : 0;
  // AHI categories
  if (result.ahiEstimate < 5) result.ahiCategory = 'Normal';
  else if (result.ahiEstimate < 15) result.ahiCategory = 'Leve';
  else if (result.ahiEstimate < 30) result.ahiCategory = 'Moderado';
  else result.ahiCategory = 'Severo';
  // Brady-tachy cycles
  if (heartRateHistory && heartRateHistory.length > 60) {
    var hrs2 = heartRateHistory.map(function (r) { return typeof r === 'object' ? r.v : r; });
    var cycles = 0;
    var state = 'normal';
    for (var q = 1; q < hrs2.length; q++) {
      if (state === 'normal' && hrs2[q] < 55) state = 'brady';
      else if (state === 'brady' && hrs2[q] > 85) { state = 'normal'; cycles++; }
    }
    result.bradyTachyCycles = cycles;
  }
  result.valid = result.totalHours >= 1;
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — SLEEP QUALITY
   ═══════════════════════════════════════════════════════════════════════ */
export function analyzeSleepQuality(data) {
  // data = { hrHistory: [], spo2History: [], startTime, endTime }
  var result = {
    totalSleep: 0, efficiency: 0, lightPct: 0, deepPct: 0, remPct: 0,
    awakePct: 0, stages: [], score: 0, recommendations: [], valid: false
  };
  if (!data || !data.hrHistory || data.hrHistory.length < 120) return result;
  var hrs = data.hrHistory.map(function (r) { return typeof r === 'object' ? r.v : r; });
  var n = hrs.length;
  // Estimate sleep stages from HR patterns
  // Deep: HR significantly below average; REM: HR variable; Light: moderate
  var sum = 0;
  for (var i = 0; i < n; i++) sum += hrs[i];
  var avgHR = sum / n;
  var stages = [];
  for (var j = 0; j < n; j++) {
    var hr = hrs[j];
    var deviation = hr - avgHR;
    if (deviation < -8) stages.push('deep');
    else if (deviation > 5 && Math.abs(hrs[Math.min(j + 1, n - 1)] - hr) > 3) stages.push('rem');
    else if (deviation > 10) stages.push('awake');
    else stages.push('light');
  }
  var counts = { deep: 0, rem: 0, light: 0, awake: 0 };
  stages.forEach(function (s) { counts[s]++; });
  var totalMins = data.endTime && data.startTime ? (data.endTime - data.startTime) / 60000 : n;
  result.totalSleep = Math.round(totalMins * (1 - counts.awake / n));
  result.efficiency = Math.round((1 - counts.awake / n) * 100);
  result.lightPct = Math.round((counts.light / n) * 100);
  result.deepPct = Math.round((counts.deep / n) * 100);
  result.remPct = Math.round((counts.rem / n) * 100);
  result.awakePct = Math.round((counts.awake / n) * 100);
  result.stages = stages;
  // Score (0-100)
  var deepScore = Math.min(30, result.deepPct * 1.5);
  var remScore = Math.min(30, result.remPct * 1.3);
  var effScore = Math.min(40, result.efficiency * 0.4);
  result.score = Math.round(deepScore + remScore + effScore);
  // Recommendations
  if (result.deepPct < 15) result.recommendations.push('Tu sueno profundo es bajo. Evita pantallas 1h antes de dormir.');
  if (result.remPct < 15) result.recommendations.push('Poco sueno REM. Intenta mantener horarios regulares.');
  if (result.efficiency < 80) result.recommendations.push('Tu eficiencia de sueno es baja. Considera tecnicas de relajacion.');
  if (result.totalSleep < 360) result.recommendations.push('Duermes menos de 6 horas. El adulto promedio necesita 7-9h.');
  result.valid = true;
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — CARDIOVASCULAR RISK
   ═══════════════════════════════════════════════════════════════════════ */
export function calculateCardiovascularRisk(metrics) {
  // metrics: { restingHR, hrv (sdnn), systolic, diastolic, spo2, age, conditions }
  var score = 0;
  var factors = [];
  var age = metrics.age || 40;
  // Resting HR scoring
  if (metrics.restingHR) {
    if (metrics.restingHR > 100) { score += 25; factors.push('FC elevada en reposo'); }
    else if (metrics.restingHR > 85) { score += 15; factors.push('FC moderadamente alta'); }
    else if (metrics.restingHR > 75) { score += 5; }
  }
  // HRV scoring (low = bad)
  if (metrics.hrv) {
    if (metrics.hrv < 20) { score += 20; factors.push('HRV muy baja'); }
    else if (metrics.hrv < 40) { score += 10; factors.push('HRV baja'); }
  }
  // Blood pressure
  if (metrics.systolic) {
    if (metrics.systolic >= 180) { score += 30; factors.push('Hipertension severa'); }
    else if (metrics.systolic >= 140) { score += 20; factors.push('Hipertension'); }
    else if (metrics.systolic >= 130) { score += 10; factors.push('PA elevada'); }
  }
  // SpO2
  if (metrics.spo2) {
    if (metrics.spo2 < 90) { score += 25; factors.push('SpO2 critico'); }
    else if (metrics.spo2 < 94) { score += 10; factors.push('SpO2 bajo'); }
  }
  // Age factor
  if (age > 65) { score += 15; factors.push('Edad > 65'); }
  else if (age > 50) { score += 8; }
  // Medical conditions
  if (metrics.conditions && Array.isArray(metrics.conditions)) {
    var riskConditions = ['diabetes', 'hipertension', 'cardiopatia', 'epoc', 'enfermedad renal'];
    metrics.conditions.forEach(function (c) {
      var cl = (c || '').toLowerCase();
      riskConditions.forEach(function (rc) {
        if (cl.indexOf(rc) >= 0) { score += 10; factors.push(c); }
      });
    });
  }
  score = Math.min(100, score);
  var category, color;
  if (score < 25) { category = 'Bajo'; color = '#10B981'; }
  else if (score < 50) { category = 'Moderado'; color = '#F59E0B'; }
  else if (score < 75) { category = 'Alto'; color = '#EF4444'; }
  else { category = 'Muy Alto'; color = '#DC2626'; }
  var recommendations = [];
  if (category === 'Bajo') recommendations.push('Mantener habitos saludables y monitoreo regular.');
  if (category === 'Moderado') recommendations.push('Considere consulta preventiva. Controle factores de riesgo.');
  if (category === 'Alto') recommendations.push('Consulte a su medico pronto. Inicie cambios en estilo de vida.');
  if (category === 'Muy Alto') recommendations.push('Busque atencion medica inmediata. Riesgo cardiovascular elevado.');
  return { score: score, category: category, color: color, factors: factors, recommendations: recommendations };
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — STRESS LEVEL
   ═══════════════════════════════════════════════════════════════════════ */
export function analyzeStressLevel(hrv, heartRate) {
  // hrv = { rmssd, sdnn, lfHfRatio } from analyzeHeartRateVariability
  // heartRate = current resting HR
  if (!hrv || !hrv.valid) return { level: 50, label: 'Sin datos', color: '#9CA3AF' };
  var stress = hrv.stressIndex || 50;
  // Adjust based on resting HR
  if (heartRate > 90) stress = Math.min(100, stress + 10);
  if (heartRate > 100) stress = Math.min(100, stress + 10);
  if (heartRate < 60) stress = Math.max(0, stress - 5);
  // LF/HF ratio: high = sympathetic dominance = stress
  if (hrv.lfHfRatio > 3) stress = Math.min(100, stress + 10);
  if (hrv.lfHfRatio < 1) stress = Math.max(0, stress - 5);
  var label, color;
  if (stress < 30) { label = 'Relajado'; color = '#10B981'; }
  else if (stress < 50) { label = 'Normal'; color = '#3B82F6'; }
  else if (stress < 70) { label = 'Moderado'; color = '#F59E0B'; }
  else if (stress < 85) { label = 'Alto'; color = '#EF4444'; }
  else { label = 'Muy Alto'; color = '#DC2626'; }
  return { level: Math.round(stress), label: label, color: color, sympatheticBalance: hrv.lfHfRatio > 1.5 ? 'Simpatico dominante' : 'Parasimpatico dominante' };
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — VO2MAX
   ═══════════════════════════════════════════════════════════════════════ */
export function calculateVO2Max(heartRate, age, weight) {
  // Borg method: VO2max = 15.3 * (HRmax / HRrest)
  if (!heartRate || heartRate < 40 || !age) return { vo2max: 0, classification: 'Sin datos', valid: false };
  var hrMax = 220 - age;
  var vo2max = Math.round(15.3 * (hrMax / heartRate) * 10) / 10;
  var classification;
  // Classifications by age-adjusted norms
  if (vo2max < 25) classification = 'Muy bajo';
  else if (vo2max < 35) classification = 'Bajo';
  else if (vo2max < 42) classification = 'Medio';
  else if (vo2max < 50) classification = 'Bueno';
  else if (vo2max < 58) classification = 'Excelente';
  else classification = 'Superior';
  return { vo2max: vo2max, classification: classification, hrMax: hrMax, valid: true };
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — BLOOD PRESSURE TRENDS
   ═══════════════════════════════════════════════════════════════════════ */
export function analyzeBloodPressureTrends(history) {
  if (!history || history.length < 3) return { trend: 'Sin datos', morningSurge: false, avgSystolic: 0, avgDiastolic: 0, valid: false };
  var systolics = history.map(function (r) { return typeof r === 'object' ? (r.v ? r.v.s : r.s || 0) : 0; });
  var diastolics = history.map(function (r) { return typeof r === 'object' ? (r.v ? r.v.d : r.d || 0) : 0; });
  var sSum = 0, dSum = 0;
  for (var i = 0; i < systolics.length; i++) { sSum += systolics[i]; dSum += diastolics[i]; }
  var avgS = Math.round(sSum / systolics.length);
  var avgD = Math.round(dSum / diastolics.length);
  // Trend: compare first third to last third
  var third = Math.floor(systolics.length / 3);
  var firstAvg = 0, lastAvg = 0;
  for (var j = 0; j < third; j++) firstAvg += systolics[j];
  for (var k = systolics.length - third; k < systolics.length; k++) lastAvg += systolics[k];
  firstAvg /= third; lastAvg /= third;
  var trend = 'Estable';
  if (lastAvg - firstAvg > 10) trend = 'Ascendente';
  if (firstAvg - lastAvg > 10) trend = 'Descendente';
  // Morning surge detection (if timestamps present)
  var morningSurge = false;
  if (history.length > 10 && history[0].t) {
    var morningReadings = history.filter(function (r) {
      var h = new Date(r.t).getHours();
      return h >= 5 && h <= 9;
    });
    if (morningReadings.length > 0) {
      var mornAvg = morningReadings.reduce(function (s, r) { return s + (r.v ? r.v.s : 0); }, 0) / morningReadings.length;
      if (mornAvg - avgS > 20) morningSurge = true;
    }
  }
  return { trend: trend, morningSurge: morningSurge, avgSystolic: avgS, avgDiastolic: avgD, valid: true };
}

/* ═══════════════════════════════════════════════════════════════════════
   MEDICAL ANALYSIS — FALL DETECTION
   ═══════════════════════════════════════════════════════════════════════ */
export function detectFall(accelerometerData) {
  if (!accelerometerData || accelerometerData.length < 10) return { detected: false };
  // Look for sudden high-g event followed by no movement
  for (var i = 1; i < accelerometerData.length; i++) {
    var prev = accelerometerData[i - 1];
    var curr = accelerometerData[i];
    var deltaG = Math.abs(curr.magnitude - prev.magnitude);
    if (deltaG > 3.0) {
      // Check for inactivity after impact
      var inactive = true;
      for (var j = i + 1; j < Math.min(i + 5, accelerometerData.length); j++) {
        if (Math.abs(accelerometerData[j].magnitude - 1.0) > 0.5) { inactive = false; break; }
      }
      if (inactive) return { detected: true, timestamp: curr.t || Date.now(), gForce: deltaG };
    }
  }
  return { detected: false };
}

/* ═══════════════════════════════════════════════════════════════════════
   ALERT SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */
export function checkAlerts(reading) {
  var st = _loadState();
  var th = st.alertThresholds;
  var cfg = _getAdminConfig();
  var alerts = [];
  var mode = st.monitoringMode;
  var isExercise = mode === 'exercise';
  // Heart Rate
  if (reading.heartRate > 0) {
    var hrHigh = isExercise ? (th.heartRateExerciseMax || 190) : (th.heartRateHigh || 120);
    var hrLow = th.heartRateLow || 50;
    if (reading.heartRate > hrHigh + 20) {
      alerts.push({ type: 'EMERGENCY', metric: 'heartRate', value: reading.heartRate, threshold: hrHigh + 20, message: 'FC peligrosamente alta: ' + reading.heartRate + ' bpm' });
    } else if (reading.heartRate > hrHigh) {
      alerts.push({ type: 'WARNING', metric: 'heartRate', value: reading.heartRate, threshold: hrHigh, message: 'FC alta: ' + reading.heartRate + ' bpm' });
    }
    if (reading.heartRate < hrLow - 10 && reading.heartRate > 0) {
      alerts.push({ type: 'CRITICAL', metric: 'heartRate', value: reading.heartRate, threshold: hrLow - 10, message: 'FC peligrosamente baja: ' + reading.heartRate + ' bpm' });
    } else if (reading.heartRate < hrLow && reading.heartRate > 0) {
      alerts.push({ type: 'WARNING', metric: 'heartRate', value: reading.heartRate, threshold: hrLow, message: 'FC baja: ' + reading.heartRate + ' bpm' });
    }
  }
  // SpO2
  if (reading.spo2 > 0) {
    if (reading.spo2 < 88) {
      alerts.push({ type: 'EMERGENCY', metric: 'spo2', value: reading.spo2, threshold: 88, message: 'SpO2 critico: ' + reading.spo2 + '%' });
    } else if (reading.spo2 < (th.spo2Low || 92)) {
      alerts.push({ type: 'CRITICAL', metric: 'spo2', value: reading.spo2, threshold: th.spo2Low, message: 'SpO2 bajo: ' + reading.spo2 + '%' });
    } else if (reading.spo2 < (th.spo2Warning || 94)) {
      alerts.push({ type: 'WARNING', metric: 'spo2', value: reading.spo2, threshold: th.spo2Warning, message: 'SpO2 en zona de cuidado: ' + reading.spo2 + '%' });
    }
  }
  // Blood Pressure
  if (reading.systolic > 0) {
    if (reading.systolic >= 180 || reading.diastolic >= 120) {
      alerts.push({ type: 'EMERGENCY', metric: 'bloodPressure', value: reading.systolic + '/' + reading.diastolic, message: 'Crisis hipertensiva: ' + reading.systolic + '/' + reading.diastolic + ' mmHg' });
    } else if (reading.systolic >= (th.bloodPressureSystolicHigh || 140)) {
      alerts.push({ type: 'WARNING', metric: 'bloodPressure', value: reading.systolic + '/' + reading.diastolic, message: 'PA elevada: ' + reading.systolic + '/' + reading.diastolic + ' mmHg' });
    }
  }
  // Body Temperature
  if (reading.bodyTemp > 0) {
    if (reading.bodyTemp >= 39.5) {
      alerts.push({ type: 'CRITICAL', metric: 'bodyTemp', value: reading.bodyTemp, message: 'Fiebre alta: ' + reading.bodyTemp + '\u00B0C' });
    } else if (reading.bodyTemp >= (th.bodyTempHigh || 38.0)) {
      alerts.push({ type: 'WARNING', metric: 'bodyTemp', value: reading.bodyTemp, message: 'Temperatura elevada: ' + reading.bodyTemp + '\u00B0C' });
    }
    if (reading.bodyTemp < (th.bodyTempLow || 35.0) && reading.bodyTemp > 0) {
      alerts.push({ type: 'CRITICAL', metric: 'bodyTemp', value: reading.bodyTemp, message: 'Hipotermia: ' + reading.bodyTemp + '\u00B0C' });
    }
  }
  // Timestamp each alert
  alerts.forEach(function (a) { a.timestamp = Date.now(); });
  return alerts;
}

function _handleAlert(alert) {
  var st = _loadState();
  if (!st.settings.autoAlerts) return;
  // Log alert
  var alerts = _loadAlerts();
  alerts.push(alert);
  if (alerts.length > 500) alerts = alerts.slice(-500);
  _saveAlerts(alerts);
  // On-screen notification
  if (alert.type === 'EMERGENCY' || alert.type === 'CRITICAL') {
    if (st.settings.vibrationAlerts && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
    if (st.settings.alertSound) _playAlertSound();
    // Trigger emergency notifications
    if (alert.type === 'EMERGENCY') {
      triggerEmergencyAlert(alert.type, _lastReading);
    }
  }
  // Doctor monitoring
  if (st.doctorMonitoring && st.assignedDoctor && (alert.type === 'WARNING' || alert.type === 'CRITICAL' || alert.type === 'EMERGENCY')) {
    _notifyDoctor(st.assignedDoctor, st.email, alert);
  }
}

function _playAlertSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (_e) { /* no audio context */ }
}

export function triggerEmergencyAlert(alertType, reading) {
  var st = _loadState();
  var cfg = _getAdminConfig();
  var message = '[MiDoctorYa ALERTA] Paciente ' + (st.email || 'desconocido') +
    ' - FC: ' + (reading.heartRate || '--') + ' bpm, SpO2: ' + (reading.spo2 || '--') +
    '%, PA: ' + (reading.systolic || '--') + '/' + (reading.diastolic || '--') +
    ' mmHg. Hora: ' + new Date().toLocaleString() + '. Tipo: ' + alertType;
  // Emergency contact
  if (st.emergencyContact && st.emergencyContact.phone) {
    var notifMethod = cfg.emergencyNotifMethod || 'whatsapp';
    if (notifMethod === 'whatsapp' || notifMethod === 'both') {
      _sendEmergencyWhatsApp(st.emergencyContact.phone, message);
    }
    if (notifMethod === 'sms' || notifMethod === 'both') {
      _sendEmergencySMS(st.emergencyContact.phone, message);
    }
  }
  // Secondary contact for critical
  if (st.secondaryContact && st.secondaryContact.phone) {
    _sendEmergencyWhatsApp(st.secondaryContact.phone, message);
  }
}

export async function _sendEmergencyWhatsApp(phone, message) {
  try {
    var apiConfig = {};
    try { apiConfig = JSON.parse(localStorage.getItem('dya_config') || '{}'); } catch (_e) { /* */ }
    var instanceId = apiConfig.ULTRAMSG_INSTANCE || '';
    var token = apiConfig.ULTRAMSG_TOKEN || '';
    if (!instanceId || !token) return;
    await fetch('/api/ultramsg/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: instanceId, token: token, to: phone, body: message })
    });
  } catch (_e) { /* silent */ }
}

export async function _sendEmergencySMS(phone, message) {
  try {
    await fetch('/api/emergency/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, message: message, type: 'sms' })
    });
  } catch (_e) { /* silent */ }
}

export function _notifyDoctor(doctorEmail, patientEmail, alert) {
  try {
    var key = 'dya_medical_alerts_' + doctorEmail;
    var existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      patientEmail: patientEmail,
      alert: alert,
      reading: Object.assign({}, _lastReading),
      timestamp: Date.now(),
      acknowledged: false
    });
    if (existing.length > 200) existing = existing.slice(-200);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (_e) { /* storage error */ }
}

/* ═══════════════════════════════════════════════════════════════════════
   UI RENDERING — MAIN ENTRY POINT
   ═══════════════════════════════════════════════════════════════════════ */
const DISCLAIMER = 'Este dispositivo no es un equipo medico certificado. Los datos son referenciales. Ante cualquier emergencia, llame al 123 o acuda a urgencias.';

export function renderWearables(container) {
  _loadBuffers();
  var st = _loadState();
  var status = getConnectionStatus();
  var tabs = [
    { id: 'dashboard', label: 'Resumen', icon: '\u{1F4CA}' },
    { id: 'cardiac', label: 'Cardiaco', icon: '\u{1F9E1}' },
    { id: 'breathing', label: 'Respirar', icon: '\u{1F32C}\uFE0F' },
    { id: 'sleep', label: 'Sueno', icon: '\u{1F634}' },
    { id: 'alerts', label: 'Alertas', icon: '\u{1F6A8}' },
    { id: 'history', label: 'Historial', icon: '\u{1F4C8}' },
    { id: 'device', label: 'Dispositivo', icon: '\u{1F4F1}' },
  ];

  container.innerHTML = '<div class="animate-fade-in">' +
    // Header
    '<div class="relative overflow-hidden" style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#312e81 70%,#4338ca 100%)">' +
      '<div class="px-5 pt-11 pb-4 relative z-10">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<div>' +
            '<button id="wearable-back" class="text-white/60 text-xs flex items-center gap-1 mb-1">' +
              '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>Volver' +
            '</button>' +
            '<h1 class="text-xl font-black text-white">Dispositivos</h1>' +
            '<p class="text-white/40 text-[11px]">' + (status.connected ? '\u{1F7E2} ' + status.deviceName : '\u26AA Sin conexion') + '</p>' +
          '</div>' +
          (status.connected ? '<div class="flex flex-col items-end gap-1">' +
            '<span class="text-[10px] text-white/40">\u{1F50B} ' + (status.battery || '--') + '%</span>' +
            '<span class="text-[10px] text-white/40">Sync: ' + status.lastSync + '</span>' +
          '</div>' : '') +
        '</div>' +
        // Tab bar
        '<div class="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">' +
          tabs.map(function (tab) {
            var active = tab.id === _currentView;
            return '<button class="wbl-tab flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition ' +
              (active ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60') +
              '" data-wview="' + tab.id + '">' + tab.icon + ' ' + tab.label + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>' +
    // Content area
    '<div id="wbl-content" class="px-4 py-4"></div>' +
    // Disclaimer
    '<div class="px-4 pb-24"><p class="text-[9px] text-gray-400 text-center leading-tight italic">' + DISCLAIMER + '</p></div>' +
  '</div>';

  // Back button
  container.querySelector('#wearable-back').onclick = function () {
    if (window._dyaNav) window._dyaNav.navigateTo('fitness');
  };

  // Tab switching
  container.querySelectorAll('.wbl-tab').forEach(function (btn) {
    btn.onclick = function () {
      _currentView = btn.dataset.wview;
      renderWearables(container);
    };
  });

  // Render current view
  var contentEl = container.querySelector('#wbl-content');
  switch (_currentView) {
    case 'dashboard': _renderDashboard(contentEl, st); break;
    case 'cardiac': _renderCardiac(contentEl, st); break;
    case 'breathing': _renderBreathing(contentEl, st); break;
    case 'sleep': _renderSleep(contentEl, st); break;
    case 'alerts': _renderAlerts(contentEl, st); break;
    case 'history': _renderHistory(contentEl, st); break;
    case 'device': _renderDevice(contentEl, st, container); break;
  }
}

/* ── DASHBOARD VIEW ─────────────────────────────────────────────────── */
function _renderDashboard(el, st) {
  var r = _lastReading;
  var hrv = analyzeHeartRateVariability(_rrBuffer);
  var stressData = analyzeStressLevel(hrv, r.heartRate);
  var hrZone = _getHRZone(r.heartRate);

  var status = getConnectionStatus();
  var gfitConnected = _isGoogleFitConnected();

  el.innerHTML =
    // Legal disclaimer banner
    _getDisclaimerBanner() +

    // ══ QUICK CONNECT PANEL (shown when no device connected) ══
    (!status.connected && !_simulatorActive ?
    '<div class="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-4 mb-3 shadow-lg">' +
      '<div class="flex items-center gap-3 mb-3">' +
        '<div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">\u{1F4F1}</div>' +
        '<div class="flex-1">' +
          '<h3 class="text-white font-black text-sm">Conecta tu dispositivo</h3>' +
          '<p class="text-white/60 text-[10px]">Banda de pecho, reloj o simulador</p>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 mb-2">' +
        '<button id="dash-ble-connect" class="py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-transform">' +
          '<span class="text-xl">\u{1F493}</span>' +
          '<span>Banda de Pecho</span>' +
          '<span class="text-[9px] text-white/50">CycPlus H2 / BLE</span>' +
        '</button>' +
        '<button id="dash-gfit-connect" class="py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-transform">' +
          '<span class="text-xl">\u{231A}</span>' +
          '<span>Reloj / Banda</span>' +
          '<span class="text-[9px] text-white/50">Via Google Fit</span>' +
        '</button>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2">' +
        '<button id="dash-sim-cicplus" class="py-2.5 rounded-xl bg-white/10 text-white/80 text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform">' +
          '\u{1F9EA} Simular Banda' +
        '</button>' +
        '<button id="dash-sim-colmi" class="py-2.5 rounded-xl bg-white/10 text-white/80 text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform">' +
          '\u{1F9EA} Simular Reloj' +
        '</button>' +
      '</div>' +
    '</div>' : '') +

    // Heart Rate hero card
    '<div class="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-4 mb-3 shadow-lg shadow-red-500/20">' +
      '<div class="flex items-center justify-between">' +
        '<div>' +
          '<p class="text-white/60 text-[10px] font-bold uppercase tracking-wider">Frecuencia Cardiaca</p>' +
          '<p class="text-5xl font-black text-white leading-none mt-1" id="wbl-hr-value">' + (r.heartRate || '--') + '</p>' +
          '<p class="text-white/80 text-xs mt-1">bpm</p>' +
        '</div>' +
        '<div class="text-right">' +
          '<div class="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center">' +
            '<span class="text-3xl" id="wbl-hr-pulse">\u{1F493}</span>' +
          '</div>' +
          '<p class="text-[10px] text-white/60 mt-1">Zona: ' + hrZone.label + '</p>' +
          '<div class="h-1.5 w-20 rounded-full bg-white/20 mt-1 ml-auto"><div class="h-full rounded-full" style="width:' + hrZone.pct + '%;background:' + hrZone.color + '"></div></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Vitals grid
    '<div class="grid grid-cols-2 gap-3 mb-3">' +
      // SpO2
      _vitalCardId('wbl-spo2-value', '\u{1FA78}', 'SpO2', (r.spo2 || '--') + '%', r.spo2 >= 95 ? '#10B981' : r.spo2 >= 92 ? '#F59E0B' : '#EF4444', 'from-blue-500 to-cyan-500') +
      // Blood Pressure
      _vitalCardId('wbl-bp-value', '\u{1FA7A}', 'Presion Arterial', (r.systolic || '--') + '/' + (r.diastolic || '--'), '#6366F1', 'from-purple-500 to-indigo-500') +
      // Body Temperature
      _vitalCardId('wbl-temp-value', '\u{1F321}\uFE0F', 'Temperatura', (r.bodyTemp ? r.bodyTemp.toFixed(1) : '--'), r.bodyTemp > 37.5 ? '#EF4444' : '#10B981', 'from-amber-500 to-orange-500') +
      // Stress
      _vitalCardId('wbl-stress-value', '\u{1F9E0}', 'Estres', stressData.label, stressData.color, 'from-violet-500 to-purple-500') +
    '</div>' +

    // Steps & Calories row
    (st.activeDevice === 'colmi_p17' || _simulatorActive ? '<div class="grid grid-cols-3 gap-2 mb-3">' +
      '<div class="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm"><p class="text-lg">\u{1F6B6}</p><p class="text-base font-black text-gray-800" id="wbl-steps-value">' + (r.steps || 0) + '</p><p class="text-[9px] text-gray-400">Pasos</p></div>' +
      _miniCard('\u{1F525}', 'Calorias', r.calories || 0) +
      _miniCard('\u{1F4CF}', 'Distancia', (r.distance ? (r.distance / 1000).toFixed(1) + 'km' : '--')) +
    '</div>' : '') +

    // HRV card
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-2">\u{1F4C9} Variabilidad de Frecuencia Cardiaca</p>' +
      '<div class="grid grid-cols-3 gap-3">' +
        '<div class="text-center"><p class="text-lg font-black text-indigo-600">' + (hrv.sdnn || '--') + '</p><p class="text-[9px] text-gray-400">SDNN (ms)</p></div>' +
        '<div class="text-center"><p class="text-lg font-black text-purple-600">' + (hrv.rmssd || '--') + '</p><p class="text-[9px] text-gray-400">RMSSD (ms)</p></div>' +
        '<div class="text-center"><p class="text-lg font-black text-blue-600">' + (hrv.pnn50 || '--') + '</p><p class="text-[9px] text-gray-400">pNN50 (%)</p></div>' +
      '</div>' +
    '</div>' +

    // Breathing quick start
    '<div class="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4 mb-3 shadow-lg shadow-emerald-500/20">' +
      '<div class="flex items-center justify-between">' +
        '<div>' +
          '<p class="text-white/60 text-[10px] font-bold uppercase tracking-wider">Coach de Respiración</p>' +
          '<p class="text-white font-bold text-sm mt-1">Respira y reduce tu estrés</p>' +
          '<p class="text-white/60 text-[10px] mt-0.5">Estrés actual: <strong class="text-white/90">' + stressData.label + ' (' + stressData.level + '/100)</strong></p>' +
        '</div>' +
        '<button class="breath-quick-start w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl backdrop-blur-sm shadow-inner" data-tech="' + (stressData.level >= 70 ? 'calm' : stressData.level >= 50 ? '4-7-8' : 'coherent') + '">🫁</button>' +
      '</div>' +
    '</div>' +

    // Active monitoring status card (if active)
    _renderActiveMonitoringCard() +

    // Exercise history
    _renderExerciseHistorySection() +

    // Quick monitoring controls
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F3AF} Control de Monitoreo</p>' +
      '<div class="grid grid-cols-2 gap-2">' +
        (_monitoringActive ?
          '<button class="wbl-action col-span-2 py-3 rounded-xl bg-red-500 text-white text-xs font-bold" data-action="stop">Detener Monitoreo</button>' :
          '<button class="wbl-action py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold" data-action="start-normal">Normal</button>' +
          '<button class="wbl-action py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold" data-action="start-medical">Medico</button>' +
          '<button class="wbl-action py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold" data-action="start-sleep">Sueno</button>' +
          '<button class="wbl-action py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold" data-action="start-exercise">Ejercicio</button>'
        ) +
      '</div>' +
    '</div>';

  // Bind breathing quick start
  el.querySelectorAll('.breath-quick-start').forEach(function (btn) {
    btn.onclick = function () {
      launchBreathingSession(btn.dataset.tech);
    };
  });

  // Bind actions
  el.querySelectorAll('.wbl-action').forEach(function (btn) {
    btn.onclick = function () {
      var action = btn.dataset.action;
      if (action === 'stop') { stopMonitoring(); }
      else if (action.startsWith('start-')) { startMonitoring(action.replace('start-', '')); }
      _renderDashboard(el, _loadState());
    };
  });

  // Bind quick stop button on active monitoring card
  el.querySelectorAll('.pmu-stop-quick').forEach(function (btn) {
    btn.onclick = function () {
      if (_exerciseSession) { stopExerciseSession(); }
      stopMonitoring();
      _renderDashboard(el, _loadState());
    };
  });

  // Render mode selector (appends to el, binds its own events)
  _renderModeSelector(el, st);

  // ── Dashboard Quick Connect Buttons ──
  var dashBleBtn = el.querySelector('#dash-ble-connect');
  if (dashBleBtn) {
    dashBleBtn.onclick = async function () {
      dashBleBtn.innerHTML = '<span class="text-xl animate-pulse">\u{1F493}</span><span>Buscando...</span><span class="text-[9px] text-white/50">Enciende tu banda</span>';
      var success = await connectDevice('cicplus_h2', true);
      if (success) {
        showToast('Banda conectada exitosamente');
        _renderDashboard(el, _loadState());
      } else {
        dashBleBtn.innerHTML = '<span class="text-xl">\u{1F493}</span><span>Reintentar</span><span class="text-[9px] text-white/50">CycPlus H2 / BLE</span>';
      }
    };
  }
  var dashGfitBtn = el.querySelector('#dash-gfit-connect');
  if (dashGfitBtn) {
    dashGfitBtn.onclick = function () {
      connectGoogleFit();
    };
  }
  var dashSimCicplus = el.querySelector('#dash-sim-cicplus');
  if (dashSimCicplus) {
    dashSimCicplus.onclick = function () {
      startSimulator('cicplus_h2');
      _renderDashboard(el, _loadState());
    };
  }
  var dashSimColmi = el.querySelector('#dash-sim-colmi');
  if (dashSimColmi) {
    dashSimColmi.onclick = function () {
      startSimulator('colmi_p17');
      _renderDashboard(el, _loadState());
    };
  }
}

function _vitalCardId(id, icon, title, value, valueColor, gradient) {
  return '<div class="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">' +
    '<div class="flex items-center gap-2 mb-1">' +
      '<div class="w-8 h-8 rounded-lg bg-gradient-to-br ' + gradient + ' flex items-center justify-center text-white text-sm">' + icon + '</div>' +
      '<p class="text-[10px] text-gray-400 font-semibold">' + title + '</p>' +
    '</div>' +
    '<p class="text-xl font-black" id="' + id + '" style="color:' + valueColor + '">' + value + '</p>' +
  '</div>';
}

function _vitalCard(icon, title, value, valueColor, gradient) {
  return '<div class="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">' +
    '<div class="flex items-center gap-2 mb-1">' +
      '<div class="w-8 h-8 rounded-lg bg-gradient-to-br ' + gradient + ' flex items-center justify-center text-white text-sm">' + icon + '</div>' +
      '<p class="text-[10px] text-gray-400 font-semibold">' + title + '</p>' +
    '</div>' +
    '<p class="text-xl font-black" style="color:' + valueColor + '">' + value + '</p>' +
  '</div>';
}

function _miniCard(icon, label, value) {
  return '<div class="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">' +
    '<p class="text-lg">' + icon + '</p>' +
    '<p class="text-base font-black text-gray-800">' + value + '</p>' +
    '<p class="text-[9px] text-gray-400">' + label + '</p>' +
  '</div>';
}

function _getHRZone(hr) {
  if (!hr || hr <= 0) return { label: '--', pct: 0, color: '#9CA3AF' };
  if (hr < 60) return { label: 'Reposo', pct: 20, color: '#3B82F6' };
  if (hr < 100) return { label: 'Normal', pct: 40, color: '#10B981' };
  if (hr < 130) return { label: 'Quema grasa', pct: 60, color: '#F59E0B' };
  if (hr < 160) return { label: 'Cardio', pct: 80, color: '#EF4444' };
  return { label: 'Pico', pct: 100, color: '#DC2626' };
}

/* ── CARDIAC VIEW ─────────────────────────────────────────────────── */
function _renderCardiac(el, st) {
  var hrv = analyzeHeartRateVariability(_rrBuffer);
  var arrhythmia = detectArrhythmia(_rrBuffer, _hrBuffer);
  var stressData = analyzeStressLevel(hrv, _lastReading.heartRate);

  el.innerHTML =
    // ECG-style waveform
    '<div class="bg-gray-900 rounded-2xl p-4 mb-3 shadow-lg">' +
      '<p class="text-[10px] text-emerald-400 font-bold mb-2">MONITOR CARDIACO EN VIVO</p>' +
      '<canvas id="wbl-ecg-canvas" width="340" height="120" class="w-full rounded-lg" style="background:#111827"></canvas>' +
      '<div class="flex justify-between mt-2">' +
        '<span class="text-emerald-400 text-xl font-black">' + (_lastReading.heartRate || '--') + ' <span class="text-xs">bpm</span></span>' +
        '<span class="text-white/40 text-[10px]">' + arrhythmia.classification + '</span>' +
      '</div>' +
    '</div>' +

    // Arrhythmia analysis
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F9E1} Analisis de Ritmo</p>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><p class="text-[10px] text-gray-400">Clasificacion</p><p class="text-sm font-bold text-gray-800">' + arrhythmia.classification + '</p></div>' +
        '<div><p class="text-[10px] text-gray-400">Confianza</p><p class="text-sm font-bold text-indigo-600">' + arrhythmia.confidence + '%</p></div>' +
        '<div><p class="text-[10px] text-gray-400">Latidos prematuros</p><p class="text-sm font-bold text-gray-800">' + arrhythmia.prematureBeats + '</p></div>' +
        '<div><p class="text-[10px] text-gray-400">PVCs / PACs</p><p class="text-sm font-bold text-gray-800">' + arrhythmia.pvcsDetected + ' / ' + arrhythmia.pacsDetected + '</p></div>' +
      '</div>' +
      (arrhythmia.afibSuspect ? '<div class="mt-3 p-2 rounded-lg bg-red-50 border border-red-200"><p class="text-xs text-red-700 font-bold">\u26A0\uFE0F Sospecha de fibrilacion auricular. Consulte a un medico.</p></div>' : '') +
    '</div>' +

    // HRV detailed
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F4CA} HRV Detallado</p>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><p class="text-[10px] text-gray-400">SDNN</p><p class="text-lg font-black text-indigo-600">' + (hrv.sdnn || '--') + ' <span class="text-xs text-gray-400">ms</span></p></div>' +
        '<div><p class="text-[10px] text-gray-400">RMSSD</p><p class="text-lg font-black text-purple-600">' + (hrv.rmssd || '--') + ' <span class="text-xs text-gray-400">ms</span></p></div>' +
        '<div><p class="text-[10px] text-gray-400">pNN50</p><p class="text-lg font-black text-blue-600">' + (hrv.pnn50 || '--') + '%</p></div>' +
        '<div><p class="text-[10px] text-gray-400">LF/HF Ratio</p><p class="text-lg font-black text-amber-600">' + (hrv.lfHfRatio || '--') + '</p></div>' +
      '</div>' +
    '</div>' +

    // Autonomic balance
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u2696\uFE0F Balance Autonomico</p>' +
      '<div class="flex items-center gap-3">' +
        '<div class="flex-1">' +
          '<div class="flex justify-between text-[10px] mb-1"><span class="text-blue-500 font-bold">Parasimpatico</span><span class="text-red-500 font-bold">Simpatico</span></div>' +
          '<div class="h-3 rounded-full bg-gray-100 overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-red-500" style="width:' + Math.min(100, (hrv.lfHfRatio || 1) * 30) + '%"></div></div>' +
        '</div>' +
        '<div class="text-center">' +
          '<p class="text-xs font-bold" style="color:' + stressData.color + '">' + stressData.label + '</p>' +
          '<p class="text-[10px] text-gray-400">Estres: ' + stressData.level + '/100</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Animate ECG canvas
  _drawECGWaveform(el.querySelector('#wbl-ecg-canvas'));
}

function _drawECGWaveform(canvas) {
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  var rrVals = _rrBuffer.slice(-100).map(function (r) { return r.v; });
  if (rrVals.length < 5) {
    // Draw flatline
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Conecta un dispositivo para ver el ECG', w / 2, h / 2 - 15);
    return;
  }
  // Generate pseudo-ECG from RR intervals
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#10B981';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  var x = 0;
  var baseY = h * 0.6;
  var stepX = w / Math.max(rrVals.length, 50);
  for (var i = 0; i < rrVals.length && x < w; i++) {
    var rr = rrVals[i];
    var amplitude = Math.min(h * 0.4, (rr / 10));
    // P wave
    ctx.lineTo(x, baseY - amplitude * 0.15);
    x += stepX * 0.15;
    ctx.lineTo(x, baseY);
    x += stepX * 0.05;
    // QRS complex
    ctx.lineTo(x, baseY + amplitude * 0.1); // Q
    x += stepX * 0.05;
    ctx.lineTo(x, baseY - amplitude * 0.7); // R
    x += stepX * 0.05;
    ctx.lineTo(x, baseY + amplitude * 0.3); // S
    x += stepX * 0.05;
    ctx.lineTo(x, baseY);
    x += stepX * 0.15;
    // T wave
    ctx.lineTo(x, baseY - amplitude * 0.2);
    x += stepX * 0.15;
    ctx.lineTo(x, baseY);
    x += stepX * 0.35;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/* ── SLEEP VIEW ──────────────────────────────────────────────────── */
function _renderSleep(el, st) {
  var sleepData = analyzeSleepQuality({ hrHistory: _hrBuffer, spo2History: _spo2Buffer, startTime: _hrBuffer.length > 0 ? _hrBuffer[0].t : 0, endTime: _hrBuffer.length > 0 ? _hrBuffer[_hrBuffer.length - 1].t : 0 });
  var apnea = detectSleepApnea(_spo2Buffer, _hrBuffer);

  el.innerHTML =
    // Sleep score hero
    '<div class="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 mb-3 shadow-lg shadow-indigo-500/30 text-center">' +
      '<p class="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Calidad de Sueno</p>' +
      '<p class="text-6xl font-black text-white">' + (sleepData.valid ? sleepData.score : '--') + '</p>' +
      '<p class="text-white/60 text-xs">/100</p>' +
      (sleepData.valid ? '<div class="flex justify-center gap-4 mt-3">' +
        '<div><p class="text-white text-sm font-bold">' + Math.round(sleepData.totalSleep / 60) + 'h ' + (sleepData.totalSleep % 60) + 'm</p><p class="text-white/40 text-[9px]">Total</p></div>' +
        '<div><p class="text-white text-sm font-bold">' + sleepData.efficiency + '%</p><p class="text-white/40 text-[9px]">Eficiencia</p></div>' +
      '</div>' : '<p class="text-white/40 text-xs mt-2">Activa el modo sueno para comenzar</p>') +
    '</div>' +

    // Sleep stages
    (sleepData.valid ? '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F30C} Etapas del Sueno</p>' +
      '<div class="space-y-2">' +
        _sleepStageBar('Ligero', sleepData.lightPct, '#93C5FD', '\u{1F4A4}') +
        _sleepStageBar('Profundo', sleepData.deepPct, '#3730A3', '\u{1F30C}') +
        _sleepStageBar('REM', sleepData.remPct, '#7C3AED', '\u{1F9E0}') +
        _sleepStageBar('Despierto', sleepData.awakePct, '#F87171', '\u{1F440}') +
      '</div>' +
    '</div>' : '') +

    // Apnea analysis
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F32C}\uFE0F Analisis de Apnea</p>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><p class="text-[10px] text-gray-400">AHI Estimado</p><p class="text-2xl font-black ' + _ahiColor(apnea.ahiEstimate) + '">' + (apnea.valid ? apnea.ahiEstimate : '--') + '</p></div>' +
        '<div><p class="text-[10px] text-gray-400">Categoria</p><p class="text-sm font-bold text-gray-800">' + apnea.ahiCategory + '</p></div>' +
        '<div><p class="text-[10px] text-gray-400">Eventos detectados</p><p class="text-lg font-bold text-gray-800">' + apnea.eventCount + '</p></div>' +
        '<div><p class="text-[10px] text-gray-400">Tiempo SpO2<88%</p><p class="text-lg font-bold ' + (apnea.timeBelow88 > 60 ? 'text-red-600' : 'text-gray-800') + '">' + apnea.timeBelow88 + 's</p></div>' +
      '</div>' +
      _ahiInterpretation(apnea.ahiEstimate, apnea.valid) +
    '</div>' +

    // Recommendations
    (sleepData.valid && sleepData.recommendations.length > 0 ? '<div class="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 shadow-sm">' +
      '<p class="text-xs font-bold text-indigo-700 mb-2">\u{1F4A1} Recomendaciones</p>' +
      '<div class="space-y-1">' + sleepData.recommendations.map(function (r) {
        return '<p class="text-xs text-indigo-600">\u2022 ' + r + '</p>';
      }).join('') + '</div>' +
    '</div>' : '');
}

function _sleepStageBar(label, pct, color, icon) {
  return '<div class="flex items-center gap-2">' +
    '<span class="text-sm w-5">' + icon + '</span>' +
    '<span class="text-[10px] text-gray-500 w-16">' + label + '</span>' +
    '<div class="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all" style="width:' + pct + '%;background:' + color + '"></div></div>' +
    '<span class="text-[10px] font-bold text-gray-600 w-8 text-right">' + pct + '%</span>' +
  '</div>';
}

function _ahiColor(ahi) {
  if (ahi < 5) return 'text-emerald-600';
  if (ahi < 15) return 'text-amber-600';
  if (ahi < 30) return 'text-orange-600';
  return 'text-red-600';
}

function _ahiInterpretation(ahi, valid) {
  if (!valid) return '<p class="mt-2 text-[10px] text-gray-400 italic">Se necesitan al menos 1h de datos de SpO2 durante sueno.</p>';
  var text, bg;
  if (ahi < 5) { text = 'AHI Normal (<5). Sin evidencia de apnea significativa.'; bg = 'bg-emerald-50 border-emerald-200 text-emerald-700'; }
  else if (ahi < 15) { text = 'AHI Leve (5-15). Se recomienda evaluacion medica.'; bg = 'bg-amber-50 border-amber-200 text-amber-700'; }
  else if (ahi < 30) { text = 'AHI Moderado (15-30). Consulte a un especialista en sueno.'; bg = 'bg-orange-50 border-orange-200 text-orange-700'; }
  else { text = 'AHI Severo (>30). Requiere atencion medica urgente.'; bg = 'bg-red-50 border-red-200 text-red-700'; }
  return '<div class="mt-3 p-2 rounded-lg border ' + bg + '"><p class="text-[11px] font-semibold">' + text + '</p></div>';
}

/* ── ALERTS VIEW ──────────────────────────────────────────────────── */
function _renderAlerts(el, st) {
  var alertHistory = _loadAlerts().slice(-50).reverse();

  el.innerHTML =
    // Emergency contacts
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F198} Contactos de Emergencia</p>' +
      '<div class="space-y-3">' +
        _contactInput('Contacto principal', 'ec1', st.emergencyContact) +
        _contactInput('Contacto secundario', 'ec2', st.secondaryContact) +
      '</div>' +
      '<button id="wbl-save-contacts" class="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold">Guardar Contactos</button>' +
    '</div>' +

    // Doctor monitoring
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1FA7A} Monitoreo Medico</p>' +
      '<div class="flex items-center justify-between mb-3">' +
        '<div><p class="text-sm text-gray-600">Enviar alertas a mi medico</p><p class="text-[10px] text-gray-400">Las alertas WARNING y superiores se comparten</p></div>' +
        '<label class="toggle-switch"><input type="checkbox" id="wbl-doc-toggle" ' + (st.doctorMonitoring ? 'checked' : '') + '><span class="toggle-slider"></span></label>' +
      '</div>' +
      '<input type="email" id="wbl-doc-email" value="' + (st.assignedDoctor || '') + '" placeholder="Email del medico asignado" class="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">' +
    '</div>' +

    // Threshold config
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u2699\uFE0F Umbrales de Alerta</p>' +
      '<div class="space-y-3">' +
        _thresholdInput('FC Alta (reposo)', 'th-hrHigh', st.alertThresholds.heartRateHigh, 'bpm') +
        _thresholdInput('FC Baja', 'th-hrLow', st.alertThresholds.heartRateLow, 'bpm') +
        _thresholdInput('FC Max Ejercicio', 'th-hrExMax', st.alertThresholds.heartRateExerciseMax, 'bpm') +
        _thresholdInput('SpO2 Bajo', 'th-spo2Low', st.alertThresholds.spo2Low, '%') +
        _thresholdInput('PA Sistolica Alta', 'th-bpSysHigh', st.alertThresholds.bloodPressureSystolicHigh, 'mmHg') +
        _thresholdInput('PA Diastolica Alta', 'th-bpDiaHigh', st.alertThresholds.bloodPressureDiastolicHigh, 'mmHg') +
        _thresholdInput('Temp. Alta', 'th-tempHigh', st.alertThresholds.bodyTempHigh, '\u00B0C') +
        _thresholdInput('Estres Alto', 'th-stressHigh', st.alertThresholds.stressHigh, '/100') +
      '</div>' +
      '<button id="wbl-save-thresholds" class="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold">Guardar Umbrales</button>' +
    '</div>' +

    // Alert history
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u{1F4DC} Historial de Alertas</p>' +
      (alertHistory.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">Sin alertas registradas</p>' :
        '<div class="space-y-2 max-h-64 overflow-y-auto">' + alertHistory.map(function (a) {
          var colors = { INFO: 'bg-yellow-50 border-yellow-200 text-yellow-700', WARNING: 'bg-orange-50 border-orange-200 text-orange-700', CRITICAL: 'bg-red-50 border-red-200 text-red-700', EMERGENCY: 'bg-red-100 border-red-300 text-red-800' };
          var c = colors[a.type] || colors.INFO;
          return '<div class="p-2 rounded-lg border ' + c + '">' +
            '<div class="flex justify-between items-start">' +
              '<p class="text-[11px] font-bold">' + (a.type || 'INFO') + '</p>' +
              '<p class="text-[9px] opacity-60">' + (a.timestamp ? new Date(a.timestamp).toLocaleString() : '') + '</p>' +
            '</div>' +
            '<p class="text-[10px] mt-0.5">' + (a.message || '') + '</p>' +
          '</div>';
        }).join('') + '</div>'
      ) +
    '</div>';

  // Bind events
  var saveContacts = el.querySelector('#wbl-save-contacts');
  if (saveContacts) {
    saveContacts.onclick = function () {
      var s = _loadState();
      s.emergencyContact = {
        name: (el.querySelector('#ec1-name') || {}).value || '',
        phone: (el.querySelector('#ec1-phone') || {}).value || '',
        relationship: (el.querySelector('#ec1-rel') || {}).value || ''
      };
      s.secondaryContact = {
        name: (el.querySelector('#ec2-name') || {}).value || '',
        phone: (el.querySelector('#ec2-phone') || {}).value || '',
        relationship: (el.querySelector('#ec2-rel') || {}).value || ''
      };
      s.doctorMonitoring = el.querySelector('#wbl-doc-toggle').checked;
      s.assignedDoctor = (el.querySelector('#wbl-doc-email') || {}).value || '';
      _saveState(s);
      showToast('Contactos guardados');
    };
  }
  var saveThresholds = el.querySelector('#wbl-save-thresholds');
  if (saveThresholds) {
    saveThresholds.onclick = function () {
      var s = _loadState();
      s.alertThresholds.heartRateHigh = parseFloat((el.querySelector('#th-hrHigh') || {}).value) || 120;
      s.alertThresholds.heartRateLow = parseFloat((el.querySelector('#th-hrLow') || {}).value) || 50;
      s.alertThresholds.heartRateExerciseMax = parseFloat((el.querySelector('#th-hrExMax') || {}).value) || 190;
      s.alertThresholds.spo2Low = parseFloat((el.querySelector('#th-spo2Low') || {}).value) || 92;
      s.alertThresholds.bloodPressureSystolicHigh = parseFloat((el.querySelector('#th-bpSysHigh') || {}).value) || 140;
      s.alertThresholds.bloodPressureDiastolicHigh = parseFloat((el.querySelector('#th-bpDiaHigh') || {}).value) || 90;
      s.alertThresholds.bodyTempHigh = parseFloat((el.querySelector('#th-tempHigh') || {}).value) || 38.0;
      s.alertThresholds.stressHigh = parseFloat((el.querySelector('#th-stressHigh') || {}).value) || 80;
      _saveState(s);
      showToast('Umbrales guardados');
    };
  }
}

function _contactInput(title, prefix, data) {
  return '<div class="p-3 bg-gray-50 rounded-xl">' +
    '<p class="text-[10px] font-bold text-gray-500 mb-2">' + title + '</p>' +
    '<div class="grid grid-cols-3 gap-2">' +
      '<input type="text" id="' + prefix + '-name" value="' + (data.name || '') + '" placeholder="Nombre" class="col-span-1 px-2 py-1.5 bg-white rounded-lg border border-gray-200 text-xs">' +
      '<input type="tel" id="' + prefix + '-phone" value="' + (data.phone || '') + '" placeholder="Telefono" class="col-span-1 px-2 py-1.5 bg-white rounded-lg border border-gray-200 text-xs">' +
      '<input type="text" id="' + prefix + '-rel" value="' + (data.relationship || '') + '" placeholder="Relacion" class="col-span-1 px-2 py-1.5 bg-white rounded-lg border border-gray-200 text-xs">' +
    '</div>' +
  '</div>';
}

function _thresholdInput(label, id, value, unit) {
  return '<div class="flex items-center gap-3">' +
    '<label class="flex-1 text-[11px] text-gray-600">' + label + '</label>' +
    '<input type="number" id="' + id + '" value="' + value + '" class="w-20 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-center" step="any">' +
    '<span class="text-[10px] text-gray-400 w-10">' + unit + '</span>' +
  '</div>';
}

/* ── HISTORY VIEW ──────────────────────────────────────────────────── */
function _renderHistory(el, st) {
  var period = 'day'; // default
  var hrHistory = getMetricsHistory('heartRate', 24);
  var spo2Hist = getMetricsHistory('spo2', 24);
  var bpHist = getMetricsHistory('bp', 24);

  // Compute stats
  var hrMin = '--', hrMax = '--', hrAvg = '--';
  if (hrHistory.length > 0) {
    var hrVals = hrHistory.map(function (r) { return r.v; });
    hrMin = Math.min.apply(null, hrVals);
    hrMax = Math.max.apply(null, hrVals);
    hrAvg = Math.round(hrVals.reduce(function (a, b) { return a + b; }, 0) / hrVals.length);
  }

  el.innerHTML =
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<p class="text-xs font-bold text-gray-700">\u{1F4C8} Tendencias</p>' +
        '<div class="flex gap-1">' +
          '<button class="wbl-period px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-100 text-indigo-700" data-period="day">Dia</button>' +
          '<button class="wbl-period px-2 py-1 rounded-lg text-[10px] font-bold text-gray-400" data-period="week">Semana</button>' +
          '<button class="wbl-period px-2 py-1 rounded-lg text-[10px] font-bold text-gray-400" data-period="month">Mes</button>' +
        '</div>' +
      '</div>' +
      // HR trend chart placeholder
      '<div class="mb-4">' +
        '<p class="text-[10px] text-gray-400 mb-1">\u{1F9E1} Frecuencia Cardiaca</p>' +
        '<canvas id="wbl-hr-chart" width="340" height="100" class="w-full rounded-lg bg-gray-50"></canvas>' +
        '<div class="flex justify-between mt-1">' +
          '<span class="text-[9px] text-blue-500">Min: ' + hrMin + '</span>' +
          '<span class="text-[9px] text-gray-500">Prom: ' + hrAvg + '</span>' +
          '<span class="text-[9px] text-red-500">Max: ' + hrMax + '</span>' +
        '</div>' +
      '</div>' +
      // SpO2 trend
      '<div class="mb-4">' +
        '<p class="text-[10px] text-gray-400 mb-1">\u{1FA78} SpO2</p>' +
        '<div class="h-12 bg-gray-50 rounded-lg flex items-end gap-px px-1">' +
          (spo2Hist.length > 0 ? spo2Hist.slice(-50).map(function (r) {
            var pct = Math.max(0, (r.v - 85) / 15 * 100);
            var col = r.v >= 95 ? '#10B981' : r.v >= 92 ? '#F59E0B' : '#EF4444';
            return '<div class="flex-1 rounded-t" style="height:' + pct + '%;background:' + col + ';min-width:2px"></div>';
          }).join('') : '<p class="text-[10px] text-gray-300 w-full text-center self-center">Sin datos</p>') +
        '</div>' +
      '</div>' +
      // BP trend
      '<div>' +
        '<p class="text-[10px] text-gray-400 mb-1">\u{1FA7A} Presion Arterial</p>' +
        (bpHist.length > 0 ?
          '<div class="flex gap-2 overflow-x-auto pb-1">' + bpHist.slice(-20).map(function (r) {
            var s = r.v ? r.v.s : 0;
            var d = r.v ? r.v.d : 0;
            return '<div class="flex-shrink-0 text-center"><p class="text-[10px] font-bold text-gray-700">' + s + '/' + d + '</p><p class="text-[8px] text-gray-300">' + new Date(r.t).toLocaleTimeString().slice(0, 5) + '</p></div>';
          }).join('') + '</div>' :
          '<p class="text-[10px] text-gray-300 text-center py-3">Sin datos de presion arterial</p>'
        ) +
      '</div>' +
    '</div>' +

    // Export button
    '<button id="wbl-export" class="w-full py-3 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 text-white text-xs font-bold shadow-lg">\u{1F4E4} Exportar Datos (JSON)</button>';

  // Draw HR chart
  _drawLineChart(el.querySelector('#wbl-hr-chart'), hrHistory.map(function (r) { return r.v; }), '#EF4444');

  // Export
  var exportBtn = el.querySelector('#wbl-export');
  if (exportBtn) {
    exportBtn.onclick = function () {
      var data = {
        heartRate: _hrBuffer,
        spo2: _spo2Buffer,
        rr: _rrBuffer,
        bp: _bpBuffer,
        steps: _stepsBuffer,
        temp: _tempBuffer,
        alerts: _loadAlerts(),
        exportDate: new Date().toISOString(),
        patient: _getEmail()
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'wearable_data_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Datos exportados');
    };
  }
}

function _drawLineChart(canvas, data, color) {
  if (!canvas || data.length < 2) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  var pad = 5;
  ctx.clearRect(0, 0, w, h);
  var min = Math.min.apply(null, data);
  var max = Math.max.apply(null, data);
  var range = max - min || 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    var y = h - pad - ((data[i] - min) / range) * (h - 2 * pad);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Fill under
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fillStyle = color + '15';
  ctx.fill();
}

/* ═══════════════════════════════════════════════════════════════════════
   GOOGLE FIT INTEGRATION — Health Bridge (Puente de Salud)
   ═══════════════════════════════════════════════════════════════════════ */
const GFIT_STORAGE_KEY = 'dya_googlefit_token';
const GFIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
  'https://www.googleapis.com/auth/fitness.body_temperature.read'
].join(' ');
let _gfitRefreshInterval = null;

function _getGoogleFitClientId() {
  try {
    var cfg = JSON.parse(localStorage.getItem('dya_config') || '{}');
    return cfg.GOOGLE_FIT_CLIENT_ID || '';
  } catch (_e) { return ''; }
}

function _isGoogleFitConnected() {
  try {
    var token = JSON.parse(localStorage.getItem(GFIT_STORAGE_KEY) || 'null');
    return !!(token && token.access_token);
  } catch (_e) { return false; }
}

function _getGoogleFitLastSync() {
  try {
    var token = JSON.parse(localStorage.getItem(GFIT_STORAGE_KEY) || 'null');
    if (token && token.last_sync) return new Date(token.last_sync).toLocaleString();
    return null;
  } catch (_e) { return null; }
}

function _getGoogleFitToken() {
  try { return JSON.parse(localStorage.getItem(GFIT_STORAGE_KEY) || 'null'); } catch (_e) { return null; }
}

function _saveGoogleFitToken(tokenData) {
  tokenData.last_sync = Date.now();
  localStorage.setItem(GFIT_STORAGE_KEY, JSON.stringify(tokenData));
}

export function connectGoogleFit() {
  var clientId = _getGoogleFitClientId();
  if (!clientId) {
    showToast('Configura GOOGLE_FIT_CLIENT_ID en el panel de admin primero.');
    return;
  }

  var redirectUri = window.location.origin + window.location.pathname;
  var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(GFIT_SCOPES) +
    '&access_type=offline' +
    '&prompt=consent' +
    '&state=googlefit_auth';

  // Save current view state so we can return after auth
  localStorage.setItem('dya_gfit_pending', 'true');
  window.location.href = authUrl;
}

export async function handleGoogleFitCallback() {
  // Check if we're returning from OAuth
  var params = new URLSearchParams(window.location.search);
  var code = params.get('code');
  var state = params.get('state');
  var pending = localStorage.getItem('dya_gfit_pending');

  if (code && (state === 'googlefit_auth' || pending === 'true')) {
    localStorage.removeItem('dya_gfit_pending');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    try {
      // Exchange code for tokens via server proxy
      var resp = await fetch('/api/googlefit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, redirect_uri: window.location.origin + window.location.pathname })
      });
      var data = await resp.json();
      if (data.access_token) {
        _saveGoogleFitToken(data);
        showToast('Google Fit conectado exitosamente');
        // Immediately fetch data
        await fetchGoogleFitData();
        // Start periodic refresh
        _startGoogleFitRefresh();
        return true;
      } else {
        showToast('Error al conectar Google Fit: ' + (data.error || 'desconocido'));
      }
    } catch (err) {
      showToast('Error al intercambiar token: ' + err.message);
    }
  }
  // Check if we already have a valid token and should refresh
  if (_isGoogleFitConnected()) {
    _startGoogleFitRefresh();
  }
  return false;
}

export async function fetchGoogleFitData() {
  var token = _getGoogleFitToken();
  if (!token || !token.access_token) return;

  var now = Date.now();
  var startTime = now - 24 * 3600 * 1000; // Last 24 hours

  try {
    var resp = await fetch('/api/googlefit/data?' +
      'access_token=' + encodeURIComponent(token.access_token) +
      '&start_time=' + startTime +
      '&end_time=' + now);

    if (resp.status === 401) {
      // Token expired - try refresh
      var refreshed = await _refreshGoogleFitToken();
      if (refreshed) return fetchGoogleFitData();
      showToast('Sesion de Google Fit expirada. Reconecta.');
      return;
    }

    var data = await resp.json();
    if (data.error) return;

    var t = Date.now();
    // Process heart rate data
    if (data.heartRate && data.heartRate.length > 0) {
      data.heartRate.forEach(function (dp) {
        var hr = Math.round(dp.value);
        if (hr > 30 && hr < 250) {
          _lastReading.heartRate = hr;
          _lastReading.timestamp = dp.timestamp || t;
          _pushBuffer(_hrBuffer, { v: hr, t: dp.timestamp || t }, HR_BUFFER_SIZE);
          var rr = Math.round(60000 / hr);
          _lastReading.rrInterval = rr;
          _pushBuffer(_rrBuffer, { v: rr, t: dp.timestamp || t }, RR_BUFFER_SIZE);
        }
      });
    }
    // Process steps
    if (data.steps && data.steps.length > 0) {
      var totalSteps = 0;
      data.steps.forEach(function (dp) { totalSteps += dp.value; });
      _lastReading.steps = totalSteps;
      _lastReading.calories = Math.round(totalSteps * 0.04);
      _lastReading.distance = Math.round(totalSteps * 0.75);
      _pushBuffer(_stepsBuffer, { v: totalSteps, t: t }, 500);
    }
    // Process SpO2
    if (data.spo2 && data.spo2.length > 0) {
      data.spo2.forEach(function (dp) {
        var spo2 = Math.round(dp.value);
        if (spo2 > 50 && spo2 <= 100) {
          _lastReading.spo2 = spo2;
          _pushBuffer(_spo2Buffer, { v: spo2, t: dp.timestamp || t }, SPO2_BUFFER_SIZE);
        }
      });
    }
    // Process sleep
    if (data.sleep && data.sleep.length > 0) {
      _lastReading.sleepData = data.sleep;
    }
    // Process body temperature
    if (data.bodyTemp && data.bodyTemp.length > 0) {
      data.bodyTemp.forEach(function (dp) {
        if (dp.value > 34 && dp.value < 42) {
          _lastReading.bodyTemp = Math.round(dp.value * 10) / 10;
          _pushBuffer(_tempBuffer, { v: _lastReading.bodyTemp, t: dp.timestamp || t }, 500);
        }
      });
    }

    // Update token last sync
    token.last_sync = Date.now();
    _saveGoogleFitToken(token);

    // Persist and check alerts
    _persistBuffers();
    if (_lastReading.heartRate > 0) {
      var alerts = checkAlerts(_lastReading);
      alerts.forEach(function (a) { _handleAlert(a); });
    }
    _updateLiveUI();
  } catch (_e) { /* network error, silent */ }
}

async function _refreshGoogleFitToken() {
  var token = _getGoogleFitToken();
  if (!token || !token.refresh_token) return false;
  try {
    var resp = await fetch('/api/googlefit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token.refresh_token, grant_type: 'refresh_token' })
    });
    var data = await resp.json();
    if (data.access_token) {
      data.refresh_token = data.refresh_token || token.refresh_token;
      _saveGoogleFitToken(data);
      return true;
    }
  } catch (_e) { /* */ }
  return false;
}

function _startGoogleFitRefresh() {
  if (_gfitRefreshInterval) return;
  // Refresh data every 5 minutes
  _gfitRefreshInterval = setInterval(function () {
    if (_isGoogleFitConnected()) fetchGoogleFitData();
  }, 5 * 60 * 1000);
}

export function disconnectGoogleFit() {
  localStorage.removeItem(GFIT_STORAGE_KEY);
  if (_gfitRefreshInterval) {
    clearInterval(_gfitRefreshInterval);
    _gfitRefreshInterval = null;
  }
  showToast('Google Fit desconectado');
}

// Auto-check for OAuth callback on module load
handleGoogleFitCallback();

/* ── DEVICE VIEW ──────────────────────────────────────────────────── */
function _renderDevice(el, st, containerRef) {
  var status = getConnectionStatus();
  var gfitConnected = _isGoogleFitConnected();
  var gfitLastSync = _getGoogleFitLastSync();

  el.innerHTML =
    // ── CONNECTED STATE (BLE or Google Fit) ──
    (status.connected ? '<div class="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 mb-3">' +
      '<div class="flex items-center justify-between">' +
        '<div>' +
          '<p class="text-sm font-bold text-emerald-700">\u{1F7E2} Conectado</p>' +
          '<p class="text-xs text-emerald-600">' + status.deviceName + '</p>' +
          '<p class="text-[10px] text-emerald-500">Bateria: ' + (status.battery || '--') + '% \u2022 Sync: ' + status.lastSync + '</p>' +
        '</div>' +
        '<button id="wbl-disconnect" class="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">Desconectar</button>' +
      '</div>' +
    '</div>' : '') +

    // ══════ PUENTE DE SALUD (Health Bridge) — UNIVERSAL ══════
    '<div class="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-5 mb-3 shadow-lg shadow-teal-500/20">' +
      '<div class="flex items-center gap-3 mb-3">' +
        '<div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">\u{1F309}</div>' +
        '<div>' +
          '<h3 class="text-white font-black text-base">Puente de Salud Universal</h3>' +
          '<p class="text-white/70 text-[10px]">Compatible con 100+ dispositivos via Google Fit</p>' +
        '</div>' +
        (gfitConnected ? '<span class="ml-auto px-2 py-1 rounded-lg bg-white/20 text-white text-[10px] font-bold">\u2705 Activo</span>' : '') +
      '</div>' +
      // Universal flow diagram
      '<div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">' +
        '<p class="text-white/90 text-[9px] font-bold text-center mb-2">Como funciona con CUALQUIER dispositivo</p>' +
        '<div class="flex items-center justify-between gap-1">' +
          '<div class="text-center flex-1">' +
            '<div class="w-10 h-10 mx-auto rounded-full bg-white/20 flex items-center justify-center text-lg">\u231A</div>' +
            '<p class="text-white/80 text-[8px] mt-1 font-bold">Tu Dispositivo</p>' +
            '<p class="text-white/50 text-[7px]">Cualquier marca</p>' +
          '</div>' +
          '<div class="text-white/40 text-lg">\u2192</div>' +
          '<div class="text-center flex-1">' +
            '<div class="w-10 h-10 mx-auto rounded-full bg-white/20 flex items-center justify-center text-lg">\u{1F4F1}</div>' +
            '<p class="text-white/80 text-[8px] mt-1 font-bold">App Fabricante</p>' +
            '<p class="text-white/50 text-[7px]">Ver lista abajo</p>' +
          '</div>' +
          '<div class="text-white/40 text-lg">\u2192</div>' +
          '<div class="text-center flex-1">' +
            '<div class="w-10 h-10 mx-auto rounded-full bg-white/20 flex items-center justify-center text-lg">\u{1F3CB}\uFE0F</div>' +
            '<p class="text-white/80 text-[8px] mt-1 font-bold">Google Fit</p>' +
            '<p class="text-white/50 text-[7px]">Puente universal</p>' +
          '</div>' +
          '<div class="text-white/40 text-lg">\u2192</div>' +
          '<div class="text-center flex-1">' +
            '<div class="w-10 h-10 mx-auto rounded-full bg-white/20 flex items-center justify-center text-lg">\u{1FA7A}</div>' +
            '<p class="text-white/80 text-[8px] mt-1 font-bold">MiDoctorYa</p>' +
            '<p class="text-white/50 text-[7px]">Analisis IA</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // Compatible devices grid
      '<div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">' +
        '<p class="text-white/90 text-[9px] font-bold mb-2">\u{1F4F1} Dispositivos compatibles y su app de sincronizacion:</p>' +
        '<div class="grid grid-cols-2 gap-1.5">' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Colmi P17/P71J</p><p class="text-white/50 text-[8px]">\u2192 Pubu Wear</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Samsung Galaxy Watch</p><p class="text-white/50 text-[8px]">\u2192 Samsung Health</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Fitbit</p><p class="text-white/50 text-[8px]">\u2192 Fitbit (nativo)</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Xiaomi Mi Band</p><p class="text-white/50 text-[8px]">\u2192 Mi Fit / Zepp Life</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Huawei Watch</p><p class="text-white/50 text-[8px]">\u2192 Huawei Health</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Garmin</p><p class="text-white/50 text-[8px]">\u2192 Garmin Connect</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Amazfit</p><p class="text-white/50 text-[8px]">\u2192 Zepp</p></div>' +
          '<div class="bg-white/10 rounded-lg px-2 py-1.5"><p class="text-white/90 text-[9px] font-bold">Apple Watch</p><p class="text-white/50 text-[8px]">\u2192 Apple Health (iOS)</p></div>' +
        '</div>' +
        '<p class="text-white/40 text-[8px] mt-2 text-center">Y cualquier otro dispositivo que sincronice con Google Fit</p>' +
      '</div>' +
      (gfitConnected ?
        '<div class="bg-white/10 rounded-xl p-3 mb-3">' +
          '<div class="flex items-center justify-between">' +
            '<div>' +
              '<p class="text-white/90 text-xs font-bold">\u{1F7E2} Google Fit conectado</p>' +
              '<p class="text-white/60 text-[10px]">Ultima sincronizacion: ' + (gfitLastSync || 'Nunca') + '</p>' +
            '</div>' +
            '<div class="flex gap-2">' +
              '<button id="wbl-gfit-refresh" class="px-3 py-1.5 rounded-lg bg-white/20 text-white text-[10px] font-bold">\u{1F504} Sync</button>' +
              '<button id="wbl-gfit-disconnect" class="px-3 py-1.5 rounded-lg bg-red-500/30 text-white text-[10px] font-bold">Desconectar</button>' +
            '</div>' +
          '</div>' +
        '</div>' :
        '<div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">' +
          '<p class="text-white/90 text-[10px] font-bold mb-2">\u{1F4CB} Configuracion en 3 pasos:</p>' +
          '<ol class="text-[10px] text-white/70 space-y-1.5 list-decimal list-inside">' +
            '<li>Instala la <strong class="text-white">app de tu dispositivo</strong> (ver lista arriba) y parea tu reloj/banda</li>' +
            '<li>En la app, activa la sincronizacion con <strong class="text-white">Google Fit</strong></li>' +
            '<li>Haz clic en <strong class="text-white">Conectar Google Fit</strong> aqui abajo</li>' +
          '</ol>' +
        '</div>'
      ) +
      (!gfitConnected ?
        '<button id="wbl-gfit-connect" class="w-full py-3.5 rounded-xl bg-white text-teal-700 font-bold text-sm shadow-lg flex items-center justify-center gap-2">' +
          '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#0F766E"/></svg>' +
          'Conectar Google Fit' +
        '</button>' : ''
      ) +
    '</div>' +

    // ══════ CONEXION BLE DIRECTA (Secondary) ══════
    (!status.connected ? '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<div class="flex items-center gap-3 mb-3">' +
        '<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg">' +
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
        '</div>' +
        '<div>' +
          '<p class="text-sm font-bold text-gray-700">Conexion BLE Directa</p>' +
          '<p class="text-[10px] text-gray-400">Para dispositivos con Heart Rate BLE estandar (0x180D)</p>' +
        '</div>' +
      '</div>' +
      // CicPlus H2 device card
      '<div class="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-3 mb-3">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white text-lg">\u{1F493}</div>' +
          '<div class="flex-1">' +
            '<p class="text-sm font-bold text-rose-700">CicPlus H2 — Banda de Pecho</p>' +
            '<p class="text-[10px] text-rose-500">HR en tiempo real + intervalos RR + deteccion de arritmias</p>' +
            '<p class="text-[9px] text-gray-400 mt-0.5">Protocolo BLE estandar — conexion directa, sin app intermedia</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // Other compatible BLE HR devices
      '<div class="bg-gray-50 rounded-xl p-2.5 mb-3">' +
        '<p class="text-[9px] text-gray-500 font-bold mb-1.5">Tambien compatible con:</p>' +
        '<div class="flex flex-wrap gap-1.5">' +
          '<span class="px-2 py-0.5 bg-white rounded-md text-[9px] text-gray-600 border border-gray-200">Polar H10/H9</span>' +
          '<span class="px-2 py-0.5 bg-white rounded-md text-[9px] text-gray-600 border border-gray-200">Garmin HRM</span>' +
          '<span class="px-2 py-0.5 bg-white rounded-md text-[9px] text-gray-600 border border-gray-200">Wahoo TICKR</span>' +
          '<span class="px-2 py-0.5 bg-white rounded-md text-[9px] text-gray-600 border border-gray-200">Coospo H6/H808S</span>' +
          '<span class="px-2 py-0.5 bg-white rounded-md text-[9px] text-gray-600 border border-gray-200">Magene H64</span>' +
          '<span class="px-2 py-0.5 bg-white rounded-md text-[9px] text-gray-600 border border-gray-200">Cualquier banda HR BLE</span>' +
        '</div>' +
      '</div>' +
      '<button id="wbl-quick-connect" class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 mb-2 flex items-center justify-center gap-2">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
        'Conectar via Bluetooth' +
      '</button>' +
      '<p class="text-[9px] text-gray-400 text-center">Un boton, selecciona tu dispositivo, listo. Usa servicio Heart Rate BLE estandar (0x180D).</p>' +
    '</div>' : '') +

    // ══════ SIMULATOR ══════
    '<div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 mb-3">' +
      '<p class="text-xs font-bold text-amber-800 mb-1">\u{1F9EA} Modo Simulador</p>' +
      '<p class="text-[10px] text-amber-600 mb-3">Prueba todas las funciones sin dispositivos fisicos. Genera datos realistas incluyendo arritmias y apnea.</p>' +
      (_simulatorActive
        ? '<div class="flex items-center justify-between mb-2">' +
            '<span class="text-xs font-bold text-emerald-600">\u{1F7E2} Simulador activo: ' + (_simulatorDevice ? DEVICE_PROFILES[_simulatorDevice].name : '') + '</span>' +
            '<button id="wbl-sim-stop" class="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">Detener</button>' +
          '</div>'
        : '<div class="grid grid-cols-2 gap-2">' +
            '<button class="wbl-sim-start px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold" data-simdev="cicplus_h2">\u{1F493} Simular CicPlus H2</button>' +
            '<button class="wbl-sim-start px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold" data-simdev="colmi_p17">\u231A Simular Colmi P17</button>' +
          '</div>'
      ) +
    '</div>' +

    // Settings
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">\u2699\uFE0F Configuracion del Dispositivo</p>' +
      '<div class="space-y-3">' +
        _toggleSetting('wbl-continuous', 'Monitoreo continuo', 'Mantiene la conexion activa', st.settings.continuousMonitoring) +
        _toggleSetting('wbl-sleep', 'Tracking de sueno', 'Registra datos durante la noche', st.settings.sleepTracking) +
        _toggleSetting('wbl-arrhythmia', 'Deteccion de arritmias', 'Analiza ritmo cardiaco', st.settings.arrhythmiaDetection) +
        _toggleSetting('wbl-apnea', 'Deteccion de apnea', 'Monitorea SpO2 en sueno', st.settings.apneaDetection) +
        _toggleSetting('wbl-fall', 'Deteccion de caidas', 'Acelerometro (si disponible)', st.settings.fallDetection) +
        _toggleSetting('wbl-autoalerts', 'Alertas automaticas', 'Notificaciones al exceder umbrales', st.settings.autoAlerts) +
        _toggleSetting('wbl-sound', 'Sonido de alerta', 'Reproduce sonido en emergencias', st.settings.alertSound) +
        _toggleSetting('wbl-vibrate', 'Vibracion', 'Vibrar en alertas criticas', st.settings.vibrationAlerts) +
      '</div>' +
      '<button id="wbl-save-settings" class="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold">Guardar Configuracion</button>' +
    '</div>';

  // ── GOOGLE FIT BUTTONS ──
  var gfitConnectBtn = el.querySelector('#wbl-gfit-connect');
  if (gfitConnectBtn) {
    gfitConnectBtn.onclick = function () { connectGoogleFit(); };
  }
  var gfitRefreshBtn = el.querySelector('#wbl-gfit-refresh');
  if (gfitRefreshBtn) {
    gfitRefreshBtn.onclick = function () {
      fetchGoogleFitData().then(function () {
        showToast('Datos de Google Fit actualizados');
        if (containerRef) renderWearables(containerRef);
      }).catch(function () { showToast('Error al sincronizar'); });
    };
  }
  var gfitDiscBtn = el.querySelector('#wbl-gfit-disconnect');
  if (gfitDiscBtn) {
    gfitDiscBtn.onclick = function () {
      disconnectGoogleFit();
      if (containerRef) renderWearables(containerRef);
    };
  }

  // ── BLE QUICK CONNECT ──
  var quickConnect = el.querySelector('#wbl-quick-connect');
  if (quickConnect) {
    quickConnect.onclick = async function () {
      quickConnect.disabled = true;
      quickConnect.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg> Buscando...';
      var selectedType = st.activeDevice || 'cicplus_h2';
      var success = await connectDevice(selectedType, true);
      if (success) {
        if (containerRef) renderWearables(containerRef);
      } else {
        quickConnect.disabled = false;
        quickConnect.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Intentar de nuevo';
      }
    };
  }

  // ── SIMULATOR BUTTONS ──
  el.querySelectorAll('.wbl-sim-start').forEach(function (btn) {
    btn.onclick = function () {
      startSimulator(btn.dataset.simdev);
      if (containerRef) renderWearables(containerRef);
    };
  });
  var simStopBtn = el.querySelector('#wbl-sim-stop');
  if (simStopBtn) {
    simStopBtn.onclick = function () {
      stopSimulator();
      if (containerRef) renderWearables(containerRef);
    };
  }

  // Disconnect
  var discBtn = el.querySelector('#wbl-disconnect');
  if (discBtn) {
    discBtn.onclick = function () {
      disconnectDevice();
      if (containerRef) renderWearables(containerRef);
    };
  }

  // Save settings
  var saveSettingsBtn = el.querySelector('#wbl-save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.onclick = function () {
      var s = _loadState();
      s.settings.continuousMonitoring = el.querySelector('#wbl-continuous').checked;
      s.settings.sleepTracking = el.querySelector('#wbl-sleep').checked;
      s.settings.arrhythmiaDetection = el.querySelector('#wbl-arrhythmia').checked;
      s.settings.apneaDetection = el.querySelector('#wbl-apnea').checked;
      s.settings.fallDetection = el.querySelector('#wbl-fall').checked;
      s.settings.autoAlerts = el.querySelector('#wbl-autoalerts').checked;
      s.settings.alertSound = el.querySelector('#wbl-sound').checked;
      s.settings.vibrationAlerts = el.querySelector('#wbl-vibrate').checked;
      _saveState(s);
      showToast('Configuracion guardada');
    };
  }
}

function _toggleSetting(id, title, desc, checked) {
  return '<div class="flex items-center justify-between">' +
    '<div><p class="text-sm text-gray-600">' + title + '</p><p class="text-[10px] text-gray-400">' + desc + '</p></div>' +
    '<label class="toggle-switch"><input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') + '><span class="toggle-slider"></span></label>' +
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════
   BREATHING COACH — Smart Notifications with Vibration & Guided Exercises
   ═══════════════════════════════════════════════════════════════════════ */

// Breathing coach state
let _breathCoachActive = false;
let _breathCoachInterval = null;
let _breathSessionActive = false;
let _breathSessionTimer = null;
let _breathSessionTick = 0;
let _breathPhaseIdx = 0;
let _breathPhaseTick = 0;
let _breathTotalCycles = 0;
let _breathLastReminder = 0;
let _breathReminderCount = 0;

// Breathing techniques library
const BREATHING_TECHNIQUES = {
  '4-7-8': {
    name: 'Relajación 4-7-8',
    description: 'Técnica del Dr. Andrew Weil. Calma ansiedad y ayuda a dormir.',
    phases: [
      { name: 'Inhala', duration: 4, icon: '🌬️', color: '#3B82F6', vibPattern: [200] },
      { name: 'Mantén', duration: 7, icon: '⏸️', color: '#8B5CF6', vibPattern: [] },
      { name: 'Exhala', duration: 8, icon: '💨', color: '#10B981', vibPattern: [100, 100, 100] },
    ],
    cycles: 4,
    bestFor: 'Ansiedad, insomnio, estrés agudo',
    stressThreshold: 60,
  },
  'box': {
    name: 'Respiración Cuadrada',
    description: 'Usada por Navy SEALs. Equilibra sistema nervioso autónomo.',
    phases: [
      { name: 'Inhala', duration: 4, icon: '🌬️', color: '#3B82F6', vibPattern: [200] },
      { name: 'Mantén', duration: 4, icon: '⏸️', color: '#8B5CF6', vibPattern: [] },
      { name: 'Exhala', duration: 4, icon: '💨', color: '#10B981', vibPattern: [100, 100, 100] },
      { name: 'Mantén', duration: 4, icon: '⏸️', color: '#F59E0B', vibPattern: [] },
    ],
    cycles: 4,
    bestFor: 'Concentración, control emocional',
    stressThreshold: 50,
  },
  'coherent': {
    name: 'Coherencia Cardíaca',
    description: '5.5 respiraciones/min. Sincroniza ritmo cardíaco y respiratorio.',
    phases: [
      { name: 'Inhala', duration: 5, icon: '🌬️', color: '#3B82F6', vibPattern: [200] },
      { name: 'Exhala', duration: 6, icon: '💨', color: '#10B981', vibPattern: [100, 100, 100] },
    ],
    cycles: 6,
    bestFor: 'HRV, salud cardiovascular, equilibrio',
    stressThreshold: 40,
  },
  'calm': {
    name: 'Respiración Calmante',
    description: 'Exhalación prolongada activa parasimpático. Ideal para pánico.',
    phases: [
      { name: 'Inhala', duration: 3, icon: '🌬️', color: '#3B82F6', vibPattern: [200] },
      { name: 'Exhala', duration: 6, icon: '💨', color: '#10B981', vibPattern: [100, 100, 100] },
    ],
    cycles: 6,
    bestFor: 'Ataques de pánico, taquicardia, crisis',
    stressThreshold: 75,
  },
  'energizing': {
    name: 'Respiración Energizante',
    description: 'Inhalación prolongada activa simpático. Para despertar y energía.',
    phases: [
      { name: 'Inhala', duration: 6, icon: '🌬️', color: '#EF4444', vibPattern: [200] },
      { name: 'Exhala', duration: 2, icon: '💨', color: '#10B981', vibPattern: [100] },
    ],
    cycles: 8,
    bestFor: 'Fatiga, somnolencia, falta de energía',
    stressThreshold: 20,
  },
};

// Breathing coach settings (persisted in wearable state)
function _getBreathSettings(st) {
  return Object.assign({
    enabled: true,
    reminderIntervalMin: 60,        // Remind every 60 min if no breathing done
    stressTriggered: true,           // Auto-suggest when stress is high
    stressThreshold: 65,             // Stress level to trigger reminder
    vibrationGuide: true,            // Vibrate to guide inhale/exhale
    preferredTechnique: '4-7-8',     // Default technique
    quietHoursStart: 23,             // Don't remind after 11pm
    quietHoursEnd: 6,                // Don't remind before 6am
    autoDetectNeed: true,            // Use HRV+HR to detect breathing need
    sessionsToday: 0,
    lastSessionDate: '',
    totalSessions: 0,
    totalMinutes: 0,
  }, st.breathingCoach || {});
}

function _saveBreathSettings(st, settings) {
  st.breathingCoach = settings;
  _saveState(st);
}

/**
 * Start the breathing coach background monitor.
 * Checks stress level periodically and triggers reminders.
 */
export function startBreathingCoach() {
  if (_breathCoachActive) return;
  _breathCoachActive = true;
  _breathLastReminder = Date.now();

  // Check every 30 seconds
  _breathCoachInterval = setInterval(function () {
    _evaluateBreathingNeed();
  }, 30000);

  // Initial check after 5s
  setTimeout(_evaluateBreathingNeed, 5000);
}

export function stopBreathingCoach() {
  _breathCoachActive = false;
  if (_breathCoachInterval) {
    clearInterval(_breathCoachInterval);
    _breathCoachInterval = null;
  }
}

function _evaluateBreathingNeed() {
  var st = _loadState();
  var bs = _getBreathSettings(st);
  if (!bs.enabled) return;

  // Check quiet hours
  var hour = new Date().getHours();
  if (hour >= bs.quietHoursStart || hour < bs.quietHoursEnd) return;

  var now = Date.now();
  var minSinceReminder = (now - _breathLastReminder) / 60000;

  // Get current stress data
  var hrv = analyzeHeartRateVariability(_rrBuffer);
  var stressData = analyzeStressLevel(hrv, _lastReading.heartRate);
  var currentStress = stressData.level;

  var shouldRemind = false;
  var reason = '';
  var suggestedTechnique = bs.preferredTechnique;

  // Stress-triggered reminder
  if (bs.stressTriggered && currentStress >= bs.stressThreshold && minSinceReminder > 5) {
    shouldRemind = true;
    reason = 'Tu nivel de estrés está en ' + currentStress + '/100';
    // Pick best technique for current stress level
    if (currentStress >= 75) suggestedTechnique = 'calm';
    else if (currentStress >= 60) suggestedTechnique = '4-7-8';
    else suggestedTechnique = 'box';
  }

  // Periodic reminder (only if monitoring is active and we have data)
  if (!shouldRemind && minSinceReminder >= bs.reminderIntervalMin && (_monitoringActive || _simulatorActive)) {
    shouldRemind = true;
    reason = 'Han pasado ' + Math.round(minSinceReminder) + ' minutos desde tu última respiración';
  }

  // Auto-detect: high HR + low HRV = breathing needed
  if (!shouldRemind && bs.autoDetectNeed && _lastReading.heartRate > 90 && hrv.valid && hrv.rmssd < 25 && minSinceReminder > 10) {
    shouldRemind = true;
    reason = 'Tu ritmo cardíaco está elevado y tu HRV es bajo';
    suggestedTechnique = 'coherent';
  }

  if (shouldRemind) {
    _triggerBreathingReminder(reason, suggestedTechnique);
  }
}

function _triggerBreathingReminder(reason, technique) {
  _breathLastReminder = Date.now();
  _breathReminderCount++;

  var st = _loadState();

  // Vibrate to get attention: gentle pattern
  if (st.settings.vibrationAlerts && navigator.vibrate) {
    navigator.vibrate([150, 100, 150, 100, 300]);
  }

  // Play gentle chime (lower frequency, softer than alert)
  _playBreathingChime();

  // Show notification banner
  _showBreathingNotification(reason, technique);
}

function _playBreathingChime() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 528; // Solfeggio frequency — "healing"
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.3);
    // Second harmonic
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 396;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.3);
    gain2.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.5);
    gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 1.6);
  } catch (_e) { /* no audio */ }
}

function _showBreathingNotification(reason, technique) {
  // Remove existing notification if any
  var existing = document.getElementById('breath-notify-banner');
  if (existing) existing.remove();

  var tech = BREATHING_TECHNIQUES[technique] || BREATHING_TECHNIQUES['4-7-8'];

  var banner = document.createElement('div');
  banner.id = 'breath-notify-banner';
  banner.className = 'fixed inset-x-0 top-0 z-[9999] animate-slide-down';
  banner.innerHTML =
    '<div class="mx-4 mt-14 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 rounded-2xl shadow-2xl shadow-emerald-500/30 p-4">' +
      '<div class="flex items-start gap-3">' +
        '<div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">' +
          '<span class="text-2xl">🧘</span>' +
        '</div>' +
        '<div class="flex-1">' +
          '<p class="text-white font-bold text-sm">Momento de Respirar</p>' +
          '<p class="text-white/80 text-[11px] mt-0.5">' + reason + '</p>' +
          '<p class="text-white/60 text-[10px] mt-1">Técnica sugerida: <strong class="text-white/90">' + tech.name + '</strong></p>' +
        '</div>' +
        '<button id="breath-notify-close" class="text-white/60 hover:text-white p-1">' +
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
        '<button id="breath-notify-start" class="flex-1 py-2.5 rounded-xl bg-white text-emerald-700 text-xs font-bold shadow-lg">🫁 Empezar Ahora</button>' +
        '<button id="breath-notify-later" class="px-4 py-2.5 rounded-xl bg-white/20 text-white text-xs font-semibold">Después</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(banner);

  // Auto-dismiss after 15s
  var autoDismiss = setTimeout(function () {
    if (banner.parentNode) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-100%)';
      banner.style.transition = 'all 0.4s ease-out';
      setTimeout(function () { if (banner.parentNode) banner.remove(); }, 400);
    }
  }, 15000);

  banner.querySelector('#breath-notify-close').onclick = function () {
    clearTimeout(autoDismiss);
    banner.remove();
  };

  banner.querySelector('#breath-notify-later').onclick = function () {
    clearTimeout(autoDismiss);
    banner.remove();
    // Push next reminder back 15 min
    _breathLastReminder = Date.now() + 10 * 60000;
    showToast('⏰ Te recordaremos en 15 minutos');
  };

  banner.querySelector('#breath-notify-start').onclick = function () {
    clearTimeout(autoDismiss);
    banner.remove();
    launchBreathingSession(technique);
  };
}

/**
 * Launch a full-screen guided breathing session with haptic feedback
 */
export function launchBreathingSession(technique) {
  if (_breathSessionActive) return;

  var tech = BREATHING_TECHNIQUES[technique] || BREATHING_TECHNIQUES['4-7-8'];
  _breathSessionActive = true;
  _breathSessionTick = 0;
  _breathPhaseIdx = 0;
  _breathPhaseTick = 0;
  _breathTotalCycles = 0;

  var st = _loadState();
  var bs = _getBreathSettings(st);

  // Create full-screen overlay
  var overlay = document.createElement('div');
  overlay.id = 'breath-session-overlay';
  overlay.className = 'fixed inset-0 z-[10000]';
  overlay.style.cssText = 'background:linear-gradient(135deg,#0f172a 0%,#064e3b 30%,#065f46 60%,#047857 100%);transition:background 1s ease';

  overlay.innerHTML =
    '<div class="flex flex-col items-center justify-center h-full px-6 relative">' +
      // Close button
      '<button id="breath-close" class="absolute top-12 right-5 text-white/40 hover:text-white transition">' +
        '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
      '</button>' +
      // Title
      '<p class="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Sesión de Respiración</p>' +
      '<p class="text-white font-bold text-lg mb-8" id="breath-tech-name">' + tech.name + '</p>' +
      // Main breathing circle
      '<div class="relative mb-8">' +
        // Outer ring (animated)
        '<div id="breath-outer-ring" class="w-52 h-52 rounded-full border-4 border-white/10 flex items-center justify-center transition-all duration-1000" style="transform:scale(1)">' +
          // Inner circle (animated)
          '<div id="breath-inner-circle" class="w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-1000" style="background:rgba(16,185,129,0.2);box-shadow:0 0 60px rgba(16,185,129,0.15)">' +
            '<span id="breath-phase-icon" class="text-4xl mb-1">' + tech.phases[0].icon + '</span>' +
            '<p id="breath-phase-name" class="text-white font-bold text-xl">' + tech.phases[0].name + '</p>' +
            '<p id="breath-phase-countdown" class="text-white/60 text-3xl font-black mt-1">' + tech.phases[0].duration + '</p>' +
          '</div>' +
        '</div>' +
        // Progress dots around the circle
        '<div id="breath-cycle-dots" class="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">' +
          Array.from({ length: tech.cycles }, function (_, i) {
            return '<div class="w-2.5 h-2.5 rounded-full bg-white/20 transition-all duration-300" id="breath-dot-' + i + '"></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      // Stats row
      '<div class="flex gap-8 mb-8 text-center">' +
        '<div><p class="text-white/40 text-[10px] uppercase">Ciclo</p><p id="breath-cycle-num" class="text-white font-bold text-lg">1/' + tech.cycles + '</p></div>' +
        '<div><p class="text-white/40 text-[10px] uppercase">Tiempo</p><p id="breath-session-time" class="text-white font-bold text-lg">0:00</p></div>' +
        '<div><p class="text-white/40 text-[10px] uppercase">FC</p><p id="breath-hr-live" class="text-emerald-400 font-bold text-lg">' + (_lastReading.heartRate || '--') + '</p></div>' +
      '</div>' +
      // Instruction text
      '<p id="breath-instruction" class="text-white/50 text-xs text-center max-w-xs leading-relaxed">' + tech.description + '</p>' +
      // Control buttons
      '<div class="flex gap-3 mt-6">' +
        '<button id="breath-pause" class="px-6 py-3 rounded-full bg-white/10 text-white text-sm font-semibold backdrop-blur">⏸️ Pausar</button>' +
        '<button id="breath-stop" class="px-6 py-3 rounded-full bg-red-500/20 text-red-300 text-sm font-semibold">⏹️ Terminar</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // Bind controls
  var paused = false;
  overlay.querySelector('#breath-close').onclick = function () { _endBreathingSession(overlay, technique); };
  overlay.querySelector('#breath-stop').onclick = function () { _endBreathingSession(overlay, technique); };
  overlay.querySelector('#breath-pause').onclick = function () {
    paused = !paused;
    overlay.querySelector('#breath-pause').innerHTML = paused ? '▶️ Reanudar' : '⏸️ Pausar';
    if (paused && navigator.vibrate) navigator.vibrate(0); // Stop vibration
  };

  // Initial vibration for inhale
  if (bs.vibrationGuide && navigator.vibrate) {
    navigator.vibrate(tech.phases[0].vibPattern);
  }

  // Main breathing loop — 1 tick per second
  _breathSessionTimer = setInterval(function () {
    if (paused) return;

    _breathSessionTick++;
    _breathPhaseTick++;

    var phase = tech.phases[_breathPhaseIdx];

    // Phase transition
    if (_breathPhaseTick > phase.duration) {
      _breathPhaseTick = 1;
      _breathPhaseIdx++;

      // Cycle complete
      if (_breathPhaseIdx >= tech.phases.length) {
        _breathPhaseIdx = 0;
        _breathTotalCycles++;

        // Mark completed cycle dot
        var dot = document.getElementById('breath-dot-' + (_breathTotalCycles - 1));
        if (dot) {
          dot.style.background = '#10B981';
          dot.style.boxShadow = '0 0 8px rgba(16,185,129,0.5)';
          dot.style.transform = 'scale(1.3)';
        }

        // All cycles done?
        if (_breathTotalCycles >= tech.cycles) {
          _endBreathingSession(overlay, technique);
          return;
        }
      }

      phase = tech.phases[_breathPhaseIdx];

      // Haptic feedback for phase change
      if (bs.vibrationGuide && navigator.vibrate) {
        navigator.vibrate(phase.vibPattern);
      }
    }

    // Update UI
    var innerCircle = document.getElementById('breath-inner-circle');
    var outerRing = document.getElementById('breath-outer-ring');
    var phaseIcon = document.getElementById('breath-phase-icon');
    var phaseName = document.getElementById('breath-phase-name');
    var countdown = document.getElementById('breath-phase-countdown');
    var cycleNum = document.getElementById('breath-cycle-num');
    var sessionTime = document.getElementById('breath-session-time');
    var hrLive = document.getElementById('breath-hr-live');
    var instruction = document.getElementById('breath-instruction');

    if (phaseName) phaseName.textContent = phase.name;
    if (phaseIcon) phaseIcon.textContent = phase.icon;
    if (countdown) countdown.textContent = phase.duration - _breathPhaseTick + 1;
    if (cycleNum) cycleNum.textContent = (_breathTotalCycles + 1) + '/' + tech.cycles;

    // Format session time
    if (sessionTime) {
      var m = Math.floor(_breathSessionTick / 60);
      var s = _breathSessionTick % 60;
      sessionTime.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Live HR
    if (hrLive) hrLive.textContent = _lastReading.heartRate || '--';

    // Animate circle based on phase
    if (innerCircle && outerRing) {
      var progress = _breathPhaseTick / phase.duration;

      if (phase.name === 'Inhala') {
        var scale = 1 + progress * 0.4;
        innerCircle.style.transform = 'scale(' + scale + ')';
        innerCircle.style.background = 'rgba(59,130,246,' + (0.15 + progress * 0.2) + ')';
        innerCircle.style.boxShadow = '0 0 ' + (40 + progress * 40) + 'px rgba(59,130,246,' + (0.1 + progress * 0.15) + ')';
        outerRing.style.borderColor = 'rgba(59,130,246,' + (0.1 + progress * 0.3) + ')';
        outerRing.style.transform = 'scale(' + (1 + progress * 0.1) + ')';
      } else if (phase.name === 'Exhala') {
        var scaleE = 1.4 - progress * 0.4;
        innerCircle.style.transform = 'scale(' + scaleE + ')';
        innerCircle.style.background = 'rgba(16,185,129,' + (0.35 - progress * 0.2) + ')';
        innerCircle.style.boxShadow = '0 0 ' + (80 - progress * 40) + 'px rgba(16,185,129,' + (0.25 - progress * 0.15) + ')';
        outerRing.style.borderColor = 'rgba(16,185,129,' + (0.4 - progress * 0.3) + ')';
        outerRing.style.transform = 'scale(' + (1.1 - progress * 0.1) + ')';
      } else {
        // Hold phases
        innerCircle.style.background = 'rgba(139,92,246,0.2)';
        innerCircle.style.boxShadow = '0 0 60px rgba(139,92,246,0.15)';
        outerRing.style.borderColor = 'rgba(139,92,246,0.2)';
        // Subtle pulse during hold
        var pulse = 1.3 + Math.sin(_breathPhaseTick * Math.PI / phase.duration) * 0.05;
        innerCircle.style.transform = 'scale(' + pulse + ')';
      }
    }

    // Gentle vibration pulse for inhale progression (every 2 seconds during inhale)
    if (bs.vibrationGuide && navigator.vibrate && phase.name === 'Inhala' && _breathPhaseTick % 2 === 0) {
      navigator.vibrate([80]);
    }

    // Contextual instruction
    if (instruction) {
      if (phase.name === 'Inhala') instruction.textContent = 'Llena tus pulmones lentamente por la nariz...';
      else if (phase.name === 'Exhala') instruction.textContent = 'Libera el aire suavemente por la boca...';
      else instruction.textContent = 'Sostén el aire con calma, relaja los hombros...';
    }

  }, 1000);
}

function _endBreathingSession(overlay, technique) {
  _breathSessionActive = false;
  if (_breathSessionTimer) {
    clearInterval(_breathSessionTimer);
    _breathSessionTimer = null;
  }

  // Stop any ongoing vibration
  if (navigator.vibrate) navigator.vibrate(0);

  var durationSec = _breathSessionTick;
  var cycles = _breathTotalCycles;

  // Save session stats
  var st = _loadState();
  var bs = _getBreathSettings(st);
  var today = new Date().toISOString().slice(0, 10);
  if (bs.lastSessionDate !== today) {
    bs.sessionsToday = 0;
  }
  bs.sessionsToday++;
  bs.lastSessionDate = today;
  bs.totalSessions++;
  bs.totalMinutes += Math.round(durationSec / 60);
  _saveBreathSettings(st, bs);

  // Update last reminder timestamp
  _breathLastReminder = Date.now();

  // Show completion screen
  if (overlay && overlay.parentNode) {
    var tech = BREATHING_TECHNIQUES[technique] || BREATHING_TECHNIQUES['4-7-8'];
    var mins = Math.floor(durationSec / 60);
    var secs = durationSec % 60;

    // Success vibration
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    overlay.querySelector('.flex.flex-col').innerHTML =
      '<div class="text-center animate-fade-in">' +
        '<div class="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">' +
          '<span class="text-5xl">✨</span>' +
        '</div>' +
        '<p class="text-white font-black text-2xl mb-2">¡Excelente!</p>' +
        '<p class="text-white/60 text-sm mb-8">Sesión de ' + tech.name + ' completada</p>' +
        '<div class="flex justify-center gap-8 mb-8">' +
          '<div class="text-center">' +
            '<p class="text-3xl font-black text-emerald-400">' + cycles + '</p>' +
            '<p class="text-white/40 text-[10px] uppercase">Ciclos</p>' +
          '</div>' +
          '<div class="text-center">' +
            '<p class="text-3xl font-black text-blue-400">' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</p>' +
            '<p class="text-white/40 text-[10px] uppercase">Duración</p>' +
          '</div>' +
          '<div class="text-center">' +
            '<p class="text-3xl font-black text-purple-400">' + bs.totalSessions + '</p>' +
            '<p class="text-white/40 text-[10px] uppercase">Total sesiones</p>' +
          '</div>' +
        '</div>' +
        (_lastReading.heartRate > 0 ? '<div class="bg-white/10 rounded-2xl p-4 mb-8 max-w-xs mx-auto">' +
          '<p class="text-white/60 text-[10px] uppercase mb-2">Tu estado actual</p>' +
          '<div class="flex justify-around">' +
            '<div><p class="text-emerald-400 font-bold text-lg">' + _lastReading.heartRate + ' bpm</p><p class="text-white/40 text-[9px]">Frecuencia</p></div>' +
            '<div><p class="text-blue-400 font-bold text-lg">' + (_lastReading.spo2 || '--') + '%</p><p class="text-white/40 text-[9px]">SpO2</p></div>' +
          '</div>' +
        '</div>' : '') +
        '<button id="breath-done" class="px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30">Listo</button>' +
      '</div>';

    overlay.querySelector('#breath-done').onclick = function () {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease-out';
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 500);
    };

    // Auto close after 10s
    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease-out';
        setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 500);
      }
    }, 10000);
  }

  showToast('🧘 Sesión de respiración completada: ' + cycles + ' ciclos');
}

/* ═══════════════════════════════════════════════════════════════════════
   PATIENT MONITORING UI — Exercise Mode, Mode Selector, Active Card
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Exercise Mode Fullscreen View ─────────────────────────────────── */
function _renderExerciseMode(container, exerciseType) {
  var modeKey = 'exercise_' + exerciseType;
  var modeInfo = typeof MONITORING_MODES !== 'undefined' ? MONITORING_MODES[modeKey] : null;
  var modeLabel = modeInfo ? modeInfo.label : exerciseType;
  var modeIcon = modeInfo ? modeInfo.icon : '\u{1F3C3}';

  container.innerHTML =
    '<div style="min-height:100vh;background:linear-gradient(180deg,#0f172a 0%,#1e293b 100%);color:white;padding:0;position:relative;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:50px 20px 16px;">' +
        '<button id="exm-back" style="background:rgba(255,255,255,0.1);border:none;border-radius:12px;padding:10px 14px;color:white;font-size:13px;font-weight:600;cursor:pointer;">\u2190 Salir</button>' +
        '<div style="text-align:center;">' +
          '<span style="font-size:20px;">' + modeIcon + '</span>' +
          '<p style="font-size:12px;font-weight:700;margin:2px 0 0;">' + modeLabel + '</p>' +
        '</div>' +
        '<button id="exm-pause" style="background:rgba(255,255,255,0.1);border:none;border-radius:12px;padding:10px 14px;color:white;font-size:13px;font-weight:600;cursor:pointer;">\u23F8 Pausa</button>' +
      '</div>' +
      '<div style="text-align:center;padding:20px 0;">' +
        '<p style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;">Frecuencia Cardiaca</p>' +
        '<p id="exm-hr" style="font-size:80px;font-weight:900;line-height:1;margin:8px 0;">--</p>' +
        '<p style="font-size:14px;color:rgba(255,255,255,0.5);">BPM</p>' +
      '</div>' +
      '<div style="padding:0 20px;margin-bottom:20px;">' +
        '<div style="display:flex;gap:3px;border-radius:10px;overflow:hidden;height:8px;">' +
          '<div id="exm-z1" style="flex:1;background:#3B82F6;opacity:0.3;transition:opacity 0.3s;border-radius:4px;"></div>' +
          '<div id="exm-z2" style="flex:1;background:#10B981;opacity:0.3;transition:opacity 0.3s;border-radius:4px;"></div>' +
          '<div id="exm-z3" style="flex:1;background:#F59E0B;opacity:0.3;transition:opacity 0.3s;border-radius:4px;"></div>' +
          '<div id="exm-z4" style="flex:1;background:#EF4444;opacity:0.3;transition:opacity 0.3s;border-radius:4px;"></div>' +
          '<div id="exm-z5" style="flex:1;background:#DC2626;opacity:0.3;transition:opacity 0.3s;border-radius:4px;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:4px;">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.4);">Z1</span>' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.4);">Z2</span>' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.4);">Z3</span>' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.4);">Z4</span>' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.4);">Z5</span>' +
        '</div>' +
        '<p id="exm-zone-label" style="text-align:center;font-size:14px;font-weight:700;color:#6B7280;margin-top:8px;">Esperando datos...</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 20px;margin-bottom:20px;">' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:16px 12px;text-align:center;">' +
          '<p id="exm-timer" style="font-size:24px;font-weight:800;">00:00</p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">Tiempo</p>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:16px 12px;text-align:center;">' +
          '<p id="exm-calories" style="font-size:24px;font-weight:800;">0</p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">Calorias</p>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:16px 12px;text-align:center;">' +
          '<p id="exm-avg-hr" style="font-size:24px;font-weight:800;">--</p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">HR Prom</p>' +
        '</div>' +
      '</div>' +
      '<div style="padding:0 20px;margin-bottom:20px;">' +
        '<p style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:8px;">Tiempo en Zonas</p>' +
        '<div id="exm-zone-bars" style="display:flex;flex-direction:column;gap:6px;"></div>' +
      '</div>' +
      '<div style="padding:0 20px;margin-bottom:20px;">' +
        '<p style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:8px;">Ritmo Cardiaco</p>' +
        '<div id="exm-hr-chart" style="display:flex;align-items:flex-end;gap:1px;height:60px;background:rgba(255,255,255,0.03);border-radius:12px;padding:8px;overflow:hidden;"></div>' +
      '</div>' +
      '<div style="padding:20px;padding-bottom:40px;">' +
        '<button id="exm-stop" style="width:100%;padding:18px;border-radius:16px;background:linear-gradient(135deg,#EF4444,#DC2626);color:white;font-size:16px;font-weight:800;border:none;cursor:pointer;box-shadow:0 8px 25px rgba(239,68,68,0.3);">\u23F9 Detener Sesion</button>' +
      '</div>' +
      '<div style="padding:0 20px 30px;text-align:center;">' +
        '<p style="font-size:9px;color:rgba(255,255,255,0.25);line-height:1.4;">\u26A0\uFE0F Herramienta de bienestar \u2014 No es dispositivo medico</p>' +
      '</div>' +
    '</div>';

  var _exmInterval = setInterval(function() {
    var hr = _lastReading.heartRate || 0;
    var hrEl = document.getElementById('exm-hr');
    if (!hrEl) { clearInterval(_exmInterval); return; }
    hrEl.textContent = hr || '--';

    if (_exerciseZones && hr > 0) {
      var zone = getCurrentHRZone(hr, _exerciseZones);
      if (zone) {
        hrEl.style.color = zone.color;
        var zoneLabel = document.getElementById('exm-zone-label');
        if (zoneLabel) { zoneLabel.textContent = 'Zona ' + zone.zone + ' \u2014 ' + zone.label; zoneLabel.style.color = zone.color; }
        for (var z = 1; z <= 5; z++) {
          var zBar = document.getElementById('exm-z' + z);
          if (zBar) zBar.style.opacity = (z === zone.zone) ? '1' : '0.3';
        }
      }
    }

    var session = _exerciseSession;
    if (session) {
      var elapsed = Date.now() - session.startTime - (session.totalPausedTime || 0);
      if (session.paused && session.pausedAt) elapsed = session.pausedAt - session.startTime - (session.totalPausedTime || 0);
      var mins = Math.floor(elapsed / 60000);
      var secs = Math.floor((elapsed % 60000) / 1000);
      var timerEl = document.getElementById('exm-timer');
      if (timerEl) timerEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

      var calEl = document.getElementById('exm-calories');
      if (calEl) calEl.textContent = session.calories || Math.round(elapsed / 60000 * 8);

      var avgEl = document.getElementById('exm-avg-hr');
      if (avgEl) avgEl.textContent = session.readingCount > 0 ? Math.round(session.totalHR / session.readingCount) : '--';

      var zoneBars = document.getElementById('exm-zone-bars');
      if (zoneBars && session.zoneTime) {
        var totalZoneTime = 0;
        for (var zk in session.zoneTime) totalZoneTime += session.zoneTime[zk] || 0;
        if (totalZoneTime > 0) {
          var colors = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#DC2626'];
          var labels = ['Reposo', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
          var barsHtml = '';
          for (var zi = 1; zi <= 5; zi++) {
            var zt = session.zoneTime['z' + zi] || 0;
            var pct = Math.round((zt / totalZoneTime) * 100);
            barsHtml += '<div style="display:flex;align-items:center;gap:8px;">' +
              '<span style="font-size:10px;color:' + colors[zi] + ';width:24px;font-weight:700;">' + labels[zi] + '</span>' +
              '<div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + pct + '%;height:100%;background:' + colors[zi] + ';border-radius:3px;transition:width 0.5s;"></div>' +
              '</div>' +
              '<span style="font-size:10px;color:rgba(255,255,255,0.4);width:36px;text-align:right;">' + Math.round(zt) + 's</span>' +
            '</div>';
          }
          zoneBars.innerHTML = barsHtml;
        }
      }
    }

    var chartEl = document.getElementById('exm-hr-chart');
    if (chartEl && _hrBuffer.length > 0) {
      var recent = _hrBuffer.slice(-60);
      var maxHR = 0, minHR = 999;
      recent.forEach(function(r) { if (r.v > maxHR) maxHR = r.v; if (r.v < minHR) minHR = r.v; });
      var range = Math.max(maxHR - minHR, 20);
      var barsStr = '';
      recent.forEach(function(r) {
        var pctH = Math.max(5, ((r.v - minHR) / range) * 100);
        var barColor = r.v > 160 ? '#EF4444' : r.v > 130 ? '#F59E0B' : r.v > 100 ? '#10B981' : '#3B82F6';
        barsStr += '<div style="flex:1;min-width:2px;height:' + pctH + '%;background:' + barColor + ';border-radius:1px;"></div>';
      });
      chartEl.innerHTML = barsStr;
    }
  }, 1000);

  document.getElementById('exm-back').onclick = function() {
    clearInterval(_exmInterval);
    if (typeof stopExerciseSession === 'function') stopExerciseSession();
    renderWearables(container);
  };

  document.getElementById('exm-pause').onclick = function() {
    var btn = document.getElementById('exm-pause');
    if (_exerciseSession && !_exerciseSession.paused) {
      pauseExerciseSession();
      btn.textContent = '\u25B6 Reanudar';
    } else {
      resumeExerciseSession();
      btn.textContent = '\u23F8 Pausa';
    }
  };

  document.getElementById('exm-stop').onclick = function() {
    clearInterval(_exmInterval);
    var result = stopExerciseSession();
    _renderExerciseSummary(container, result);
  };
}

/* ── Exercise Summary View ─────────────────────────────────────────── */
function _renderExerciseSummary(container, session) {
  if (!session) { renderWearables(container); return; }

  var durationMs = (session.endTime || Date.now()) - session.startTime - (session.totalPausedTime || 0);
  var durationMin = Math.floor(durationMs / 60000);
  var durationSec = Math.floor((durationMs % 60000) / 1000);
  var durationStr = String(durationMin).padStart(2, '0') + ':' + String(durationSec).padStart(2, '0');
  var avgHR = session.readingCount > 0 ? Math.round(session.totalHR / session.readingCount) : 0;
  var maxHR = session.maxHR || 0;
  var minHR = session.minHR === 999 ? 0 : (session.minHR || 0);
  var calories = session.calories || Math.round(durationMs / 60000 * 8);
  var recoveryHR = session.recoveryHR || _lastReading.heartRate || 0;

  var modeKey = session.mode || '';
  var modeInfo = typeof MONITORING_MODES !== 'undefined' ? MONITORING_MODES[modeKey] : null;
  var modeLabel = modeInfo ? modeInfo.label : modeKey;
  var modeIcon = modeInfo ? modeInfo.icon : '\u{1F3C3}';

  var zoneHtml = '';
  var totalZT = 0;
  var zColors = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#DC2626'];
  var zLabels = ['Reposo', 'Calentamiento', 'Quema grasa', 'Aerobico', 'Anaerobico', 'VO2max'];
  if (session.zoneTime) {
    for (var zk in session.zoneTime) totalZT += session.zoneTime[zk] || 0;
    for (var zi = 1; zi <= 5; zi++) {
      var zt = session.zoneTime['z' + zi] || 0;
      var pct = totalZT > 0 ? Math.round((zt / totalZT) * 100) : 0;
      zoneHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
        '<span style="font-size:10px;color:' + zColors[zi] + ';width:80px;font-weight:700;">Z' + zi + ' ' + zLabels[zi] + '</span>' +
        '<div style="flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;height:100%;background:' + zColors[zi] + ';border-radius:4px;"></div>' +
        '</div>' +
        '<span style="font-size:10px;color:rgba(255,255,255,0.5);width:40px;text-align:right;">' + pct + '%</span>' +
      '</div>';
    }
  }

  container.innerHTML =
    '<div style="min-height:100vh;background:linear-gradient(180deg,#0f172a 0%,#1e293b 100%);color:white;padding:0;">' +
      '<div style="text-align:center;padding:60px 20px 20px;">' +
        '<span style="font-size:48px;">' + modeIcon + '</span>' +
        '<h2 style="font-size:22px;font-weight:900;margin:8px 0 4px;">Sesion Completada</h2>' +
        '<p style="font-size:14px;color:rgba(255,255,255,0.5);">' + modeLabel + '</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px;margin-bottom:20px;">' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:18px;text-align:center;">' +
          '<p style="font-size:32px;font-weight:900;">' + durationStr + '</p>' +
          '<p style="font-size:11px;color:rgba(255,255,255,0.4);">Duracion</p>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:18px;text-align:center;">' +
          '<p style="font-size:32px;font-weight:900;color:#F59E0B;">' + calories + '</p>' +
          '<p style="font-size:11px;color:rgba(255,255,255,0.4);">Calorias</p>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 20px;margin-bottom:20px;">' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:14px;text-align:center;">' +
          '<p style="font-size:24px;font-weight:800;color:#10B981;">' + avgHR + '</p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">HR Prom</p>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:14px;text-align:center;">' +
          '<p style="font-size:24px;font-weight:800;color:#EF4444;">' + maxHR + '</p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">HR Max</p>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:14px;text-align:center;">' +
          '<p style="font-size:24px;font-weight:800;color:#3B82F6;">' + minHR + '</p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">HR Min</p>' +
        '</div>' +
      '</div>' +
      (recoveryHR > 0 ? '<div style="padding:0 20px;margin-bottom:20px;">' +
        '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:16px;padding:16px;text-align:center;">' +
          '<p style="font-size:11px;color:#10B981;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Recuperacion</p>' +
          '<p style="font-size:36px;font-weight:900;color:#10B981;">' + recoveryHR + ' <span style="font-size:14px;">bpm</span></p>' +
          '<p style="font-size:10px;color:rgba(255,255,255,0.4);">FC al detener la sesion</p>' +
        '</div>' +
      '</div>' : '') +
      (zoneHtml ? '<div style="padding:0 20px;margin-bottom:20px;">' +
        '<p style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:10px;">Distribucion por Zonas</p>' +
        zoneHtml +
      '</div>' : '') +
      '<div style="padding:20px;padding-bottom:40px;">' +
        '<button id="exs-save" style="width:100%;padding:18px;border-radius:16px;background:linear-gradient(135deg,#10B981,#059669);color:white;font-size:16px;font-weight:800;border:none;cursor:pointer;box-shadow:0 8px 25px rgba(16,185,129,0.3);">\u2705 Guardar y Volver</button>' +
      '</div>' +
      '<div style="padding:0 20px 30px;text-align:center;">' +
        '<p style="font-size:9px;color:rgba(255,255,255,0.25);line-height:1.4;">\u26A0\uFE0F Herramienta de bienestar \u2014 No es dispositivo medico</p>' +
      '</div>' +
    '</div>';

  document.getElementById('exs-save').onclick = function() {
    renderWearables(container);
  };
}

/* ── Mode Selector Card ────────────────────────────────────────────── */
function _renderModeSelector(container, st) {
  var exerciseTypes = [
    { key: 'walking', icon: '\u{1F6B6}', label: 'Caminata' },
    { key: 'running', icon: '\u{1F3C3}', label: 'Carrera' },
    { key: 'hiit', icon: '\u26A1', label: 'HIIT' },
    { key: 'strength', icon: '\u{1F3CB}\uFE0F', label: 'Fuerza' },
    { key: 'cycling', icon: '\u{1F6B4}', label: 'Ciclismo' },
    { key: 'swimming', icon: '\u{1F3CA}', label: 'Natacion' }
  ];

  var modes = [
    { key: 'rest', icon: '\u{1F319}', label: 'Reposo', desc: 'Bajo consumo', gradient: 'from-slate-600 to-slate-700', needsConsent: false },
    { key: 'exercise', icon: '\u26A1', label: 'Ejercicio', desc: 'Selecciona tipo', gradient: 'from-orange-500 to-red-500', needsConsent: false, isExercise: true },
    { key: 'pre_surgery', icon: '\u{1F3E5}', label: 'Pre-Cirugia', desc: 'Baseline pre-quirurgico', gradient: 'from-blue-600 to-indigo-600', needsConsent: true },
    { key: 'post_surgery', icon: '\u{1FA7A}', label: 'Post-Cirugia', desc: 'Seguimiento post-op', gradient: 'from-purple-600 to-violet-600', needsConsent: true },
    { key: 'rehab', icon: '\u{1F4AA}', label: 'Rehabilitacion', desc: 'Rehab cardiaca', gradient: 'from-emerald-600 to-teal-600', needsConsent: false },
    { key: 'continuous_24h', icon: '\u23F1\uFE0F', label: 'Continuo 24h', desc: 'Monitoreo completo', gradient: 'from-rose-600 to-pink-600', needsConsent: true }
  ];

  var prescribedModes = (st && st.prescribedModes) ? st.prescribedModes : {};
  var consentedModes = (st && st.consentedModes) ? st.consentedModes : {};
  var assignedDoctor = (st && st.assignedDoctor) ? st.assignedDoctor : '';

  var html = '<div class="mb-4">' +
    '<p class="text-sm font-bold text-gray-700 mb-3">\u{1F3AF} Modos de Monitoreo</p>' +
    '<div class="grid grid-cols-2 gap-2">';

  modes.forEach(function(mode) {
    var isPrescribed = prescribedModes[mode.key];
    var isConsented = consentedModes[mode.key];
    var needsUnlock = mode.needsConsent && !isConsented;
    var lockIcon = needsUnlock ? ' \u{1F512}' : '';
    var prescBadge = isPrescribed ? '<p class="text-[8px] text-white/70 mt-1">\u{1F468}\u200D\u2695\uFE0F Dr. ' + assignedDoctor + '</p>' : '';

    html += '<button class="pmu-mode-btn bg-gradient-to-br ' + mode.gradient + ' rounded-2xl p-3 text-left shadow-sm transition-transform active:scale-95" ' +
      'data-mode="' + mode.key + '" data-needs-consent="' + (needsUnlock ? '1' : '0') + '" data-is-exercise="' + (mode.isExercise ? '1' : '0') + '">' +
      '<div class="flex items-center gap-2 mb-1">' +
        '<span class="text-xl">' + mode.icon + '</span>' +
        '<span class="text-[10px] text-white/50">' + lockIcon + '</span>' +
      '</div>' +
      '<p class="text-xs font-bold text-white">' + mode.label + '</p>' +
      '<p class="text-[9px] text-white/60">' + mode.desc + '</p>' +
      prescBadge +
    '</button>';
  });

  html += '</div></div>';

  html += '<div id="pmu-exercise-picker" style="display:none;" class="mb-4">' +
    '<p class="text-sm font-bold text-gray-700 mb-3">\u{1F3C3} Tipo de Ejercicio</p>' +
    '<div class="grid grid-cols-3 gap-2">';

  exerciseTypes.forEach(function(et) {
    html += '<button class="pmu-exercise-type bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-3 text-center shadow-sm transition-transform active:scale-95" data-etype="' + et.key + '">' +
      '<span class="text-2xl block mb-1">' + et.icon + '</span>' +
      '<p class="text-[10px] font-bold text-white">' + et.label + '</p>' +
    '</button>';
  });

  html += '</div>' +
    '<button id="pmu-exercise-cancel" class="w-full mt-2 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold">Cancelar</button>' +
  '</div>';

  container.insertAdjacentHTML('beforeend', html);

  function _showConsentModal(modeKey, callback) {
    var mInfo = MONITORING_MODES[modeKey];
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="background:white;border-radius:20px;padding:24px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<p style="font-size:24px;text-align:center;">' + (mInfo ? mInfo.icon : '\u26A0\uFE0F') + '</p>' +
        '<h3 style="font-size:16px;font-weight:800;text-align:center;margin:8px 0;">' + (mInfo ? mInfo.label : modeKey) + '</h3>' +
        '<p style="font-size:12px;color:#6B7280;text-align:center;margin-bottom:16px;">' + (mInfo ? mInfo.description : '') + '</p>' +
        '<div style="background:#FEF3C7;border-radius:12px;padding:12px;margin-bottom:16px;">' +
          '<p style="font-size:10px;color:#92400E;line-height:1.4;">\u26A0\uFE0F <strong>Consentimiento requerido:</strong> Este modo recopila datos de salud continuamente. Los datos se almacenan localmente y pueden compartirse con tu medico. Esta herramienta NO es un dispositivo medico.</p>' +
        '</div>' +
        '<button id="pmu-consent-accept" style="width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#10B981,#059669);color:white;font-size:14px;font-weight:700;border:none;cursor:pointer;margin-bottom:8px;">Acepto y Continuar</button>' +
        '<button id="pmu-consent-cancel" style="width:100%;padding:12px;border-radius:12px;background:#F3F4F6;color:#6B7280;font-size:13px;font-weight:600;border:none;cursor:pointer;">Cancelar</button>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('pmu-consent-accept').onclick = function() {
      document.body.removeChild(overlay);
      var cst = _loadState();
      if (!cst.consentedModes) cst.consentedModes = {};
      cst.consentedModes[modeKey] = { timestamp: Date.now(), date: new Date().toISOString() };
      _saveState(cst);
      if (callback) callback();
    };
    document.getElementById('pmu-consent-cancel').onclick = function() {
      document.body.removeChild(overlay);
    };
  }

  container.querySelectorAll('.pmu-mode-btn').forEach(function(btn) {
    btn.onclick = function() {
      var modeKey = btn.dataset.mode;
      var needsConsent = btn.dataset.needsConsent === '1';
      var isExercise = btn.dataset.isExercise === '1';

      if (isExercise) {
        var picker = document.getElementById('pmu-exercise-picker');
        if (picker) picker.style.display = 'block';
        return;
      }

      if (needsConsent) {
        _showConsentModal(modeKey, function() {
          startMonitoring(modeKey);
          _renderDashboard(container, _loadState());
        });
        return;
      }

      startMonitoring(modeKey);
      _renderDashboard(container, _loadState());
    };
  });

  container.querySelectorAll('.pmu-exercise-type').forEach(function(btn) {
    btn.onclick = function() {
      var etype = btn.dataset.etype;
      startExerciseSession(etype);
      _renderExerciseMode(container, etype);
    };
  });

  var cancelBtn = document.getElementById('pmu-exercise-cancel');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      var picker = document.getElementById('pmu-exercise-picker');
      if (picker) picker.style.display = 'none';
    };
  }
}

/* ── Active Monitoring Status Card ─────────────────────────────────── */
function _renderActiveMonitoringCard() {
  if (!_monitoringActive && !_exerciseSession) return '';

  var currentMode = _exerciseSession ? _exerciseSession.mode : (_loadState().monitoringMode || 'normal');
  var modeInfo = typeof MONITORING_MODES !== 'undefined' ? MONITORING_MODES[currentMode] : null;
  var modeLabel = modeInfo ? modeInfo.label : currentMode;
  var modeIcon = modeInfo ? modeInfo.icon : '\u{1F4CA}';

  var hr = _lastReading.heartRate || 0;
  var hrColor = '#10B981';
  var zoneText = '';
  if (_exerciseSession && _exerciseZones && hr > 0) {
    var zone = getCurrentHRZone(hr, _exerciseZones);
    if (zone) { hrColor = zone.color; zoneText = 'Z' + zone.zone + ' ' + zone.label; }
  } else if (hr > 160) { hrColor = '#EF4444'; }
  else if (hr > 130) { hrColor = '#F59E0B'; }
  else if (hr > 100) { hrColor = '#10B981'; }
  else { hrColor = '#3B82F6'; }

  var timeText = '';
  if (_exerciseSession) {
    var elapsed = Date.now() - _exerciseSession.startTime - (_exerciseSession.totalPausedTime || 0);
    if (_exerciseSession.paused && _exerciseSession.pausedAt) elapsed = _exerciseSession.pausedAt - _exerciseSession.startTime - (_exerciseSession.totalPausedTime || 0);
    var emins = Math.floor(elapsed / 60000);
    var esecs = Math.floor((elapsed % 60000) / 1000);
    timeText = String(emins).padStart(2, '0') + ':' + String(esecs).padStart(2, '0');
  }

  return '<div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 mb-3 shadow-lg shadow-indigo-500/20">' +
    '<div class="flex items-center justify-between">' +
      '<div class="flex items-center gap-3">' +
        '<div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">' + modeIcon + '</div>' +
        '<div>' +
          '<p class="text-white font-bold text-sm">' + modeLabel + '</p>' +
          '<p class="text-white/50 text-[10px]">' + (timeText ? timeText + ' activo' : 'Monitoreando...') + '</p>' +
          (zoneText ? '<p class="text-[10px] font-bold" style="color:' + hrColor + ';">' + zoneText + '</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="text-right">' +
        (hr > 0 ? '<p class="text-2xl font-black" style="color:' + hrColor + ';">' + hr + '</p><p class="text-white/40 text-[9px]">bpm</p>' : '<p class="text-white/40 text-xs">--</p>') +
      '</div>' +
    '</div>' +
    '<div class="flex items-center justify-between mt-3 pt-3 border-t border-white/10">' +
      '<p class="text-[8px] text-white/30 italic">Herramienta de bienestar \u2014 No es dispositivo medico</p>' +
      '<button class="pmu-stop-quick bg-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white/80 font-bold">\u23F9 Detener</button>' +
    '</div>' +
  '</div>';
}

/* ── Exercise History Section ──────────────────────────────────────── */
function _renderExerciseHistorySection() {
  var history = getExerciseHistory(30);
  if (!history || history.length === 0) return '';

  var recent = history.slice(0, 5);
  var html = '<div class="mb-4">' +
    '<p class="text-sm font-bold text-gray-700 mb-3">\u{1F3C6} Sesiones Recientes</p>';

  recent.forEach(function(s) {
    var d = new Date(s.startTime);
    var dateStr = d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    var mInfo = MONITORING_MODES[s.mode];
    var icon = mInfo ? mInfo.icon : '\u{1F3C3}';
    var label = mInfo ? mInfo.label : s.mode;
    var durMin = Math.round(((s.endTime || s.startTime) - s.startTime) / 60000);
    var avgHR = s.readingCount > 0 ? Math.round(s.totalHR / s.readingCount) : 0;

    html += '<div class="bg-white rounded-xl border border-gray-100 p-3 mb-2 shadow-sm flex items-center gap-3">' +
      '<span class="text-xl">' + icon + '</span>' +
      '<div class="flex-1">' +
        '<p class="text-xs font-bold text-gray-800">' + label + '</p>' +
        '<p class="text-[9px] text-gray-400">' + dateStr + ' \u2022 ' + durMin + ' min</p>' +
      '</div>' +
      '<div class="text-right">' +
        (avgHR > 0 ? '<p class="text-sm font-black text-red-500">' + avgHR + ' bpm</p>' : '') +
        '<p class="text-[9px] text-gray-400">' + (s.calories || 0) + ' cal</p>' +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  return html;
}

/* ── END PATIENT MONITORING UI ─────────────────────────────────────── */

/* ── BREATHING VIEW (new tab in wearables) ───────────────────────── */
function _renderBreathing(el, st) {
  var bs = _getBreathSettings(st);
  var hrv = analyzeHeartRateVariability(_rrBuffer);
  var stressData = analyzeStressLevel(hrv, _lastReading.heartRate);
  var currentStress = stressData.level;
  var today = new Date().toISOString().slice(0, 10);
  var todaySessions = bs.lastSessionDate === today ? bs.sessionsToday : 0;

  // Recommend technique based on current state
  var recommended = bs.preferredTechnique;
  if (currentStress >= 75) recommended = 'calm';
  else if (currentStress >= 60) recommended = '4-7-8';
  else if (currentStress >= 40) recommended = 'box';
  else if (currentStress < 25) recommended = 'energizing';
  else recommended = 'coherent';

  el.innerHTML =
    // Stress-aware hero
    '<div class="rounded-2xl p-5 mb-3 shadow-lg text-center relative overflow-hidden" style="background:linear-gradient(135deg,' + _stressGradient(currentStress) + ')">' +
      '<div class="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5"></div>' +
      '<p class="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Coach de Respiración</p>' +
      '<div class="flex items-center justify-center gap-3 mb-3">' +
        '<div class="text-center">' +
          '<p class="text-5xl font-black text-white">' + currentStress + '</p>' +
          '<p class="text-white/60 text-xs">Nivel de Estrés</p>' +
        '</div>' +
        '<div class="w-px h-12 bg-white/20"></div>' +
        '<div class="text-center">' +
          '<p class="text-4xl font-black text-white">' + todaySessions + '</p>' +
          '<p class="text-white/60 text-xs">Sesiones Hoy</p>' +
        '</div>' +
      '</div>' +
      '<p class="text-white/70 text-xs">' + _stressAdvice(currentStress) + '</p>' +
    '</div>' +

    // Quick start — recommended technique
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<div class="flex items-center gap-3 mb-3">' +
        '<div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl">🎯</div>' +
        '<div>' +
          '<p class="text-xs font-bold text-gray-800">Recomendada para ti ahora</p>' +
          '<p class="text-[10px] text-gray-400">' + (BREATHING_TECHNIQUES[recommended] || {}).bestFor + '</p>' +
        '</div>' +
      '</div>' +
      '<button class="breath-start-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2" data-tech="' + recommended + '">' +
        '🫁 ' + (BREATHING_TECHNIQUES[recommended] || {}).name + ' — Empezar' +
      '</button>' +
    '</div>' +

    // All techniques
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">🌬️ Técnicas Disponibles</p>' +
      '<div class="space-y-2">' +
        Object.keys(BREATHING_TECHNIQUES).map(function (key) {
          var tech = BREATHING_TECHNIQUES[key];
          var totalDuration = tech.phases.reduce(function (s, p) { return s + p.duration; }, 0) * tech.cycles;
          var isRec = key === recommended;
          return '<div class="flex items-center gap-3 p-3 rounded-xl border ' + (isRec ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50') + '">' +
            '<div class="flex-1">' +
              '<div class="flex items-center gap-2">' +
                '<p class="text-sm font-bold text-gray-800">' + tech.name + '</p>' +
                (isRec ? '<span class="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">RECOMENDADA</span>' : '') +
              '</div>' +
              '<p class="text-[10px] text-gray-400 mt-0.5">' + tech.description + '</p>' +
              '<div class="flex gap-2 mt-1">' +
                '<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">~' + Math.round(totalDuration / 60) + ' min</span>' +
                '<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">' + tech.cycles + ' ciclos</span>' +
                tech.phases.map(function (p) {
                  return '<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">' + p.name.charAt(0) + ':' + p.duration + 's</span>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<button class="breath-start-btn px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold flex-shrink-0" data-tech="' + key + '">Iniciar</button>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +

    // Coach settings
    '<div class="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">⚙️ Configuración del Coach</p>' +
      '<div class="space-y-3">' +
        _toggleSetting('breath-enabled', 'Recordatorios automáticos', 'Notifica cuando necesites respirar', bs.enabled) +
        _toggleSetting('breath-stress-trigger', 'Por nivel de estrés', 'Sugiere respiración cuando el estrés sube', bs.stressTriggered) +
        _toggleSetting('breath-vibration', 'Guía por vibración', 'El dispositivo vibra al ritmo de la respiración', bs.vibrationGuide) +
        _toggleSetting('breath-autodetect', 'Detección inteligente', 'Usa FC+HRV para detectar cuándo respirar', bs.autoDetectNeed) +
        '<div class="flex items-center gap-3">' +
          '<label class="flex-1 text-[11px] text-gray-600">Umbral de estrés</label>' +
          '<input type="number" id="breath-stress-th" value="' + bs.stressThreshold + '" min="20" max="90" class="w-20 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-center">' +
          '<span class="text-[10px] text-gray-400 w-10">/100</span>' +
        '</div>' +
        '<div class="flex items-center gap-3">' +
          '<label class="flex-1 text-[11px] text-gray-600">Recordar cada</label>' +
          '<input type="number" id="breath-interval" value="' + bs.reminderIntervalMin + '" min="15" max="240" class="w-20 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-center">' +
          '<span class="text-[10px] text-gray-400 w-10">min</span>' +
        '</div>' +
      '</div>' +
      '<button id="breath-save-settings" class="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold">Guardar Configuración</button>' +
    '</div>' +

    // Stats
    '<div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4 shadow-sm">' +
      '<p class="text-xs font-bold text-gray-700 mb-3">📊 Tus Estadísticas</p>' +
      '<div class="grid grid-cols-3 gap-3 text-center">' +
        '<div><p class="text-2xl font-black text-indigo-600">' + bs.totalSessions + '</p><p class="text-[9px] text-gray-400">Sesiones totales</p></div>' +
        '<div><p class="text-2xl font-black text-purple-600">' + bs.totalMinutes + '</p><p class="text-[9px] text-gray-400">Minutos totales</p></div>' +
        '<div><p class="text-2xl font-black text-emerald-600">' + todaySessions + '</p><p class="text-[9px] text-gray-400">Sesiones hoy</p></div>' +
      '</div>' +
    '</div>';

  // Bind start buttons
  el.querySelectorAll('.breath-start-btn').forEach(function (btn) {
    btn.onclick = function () {
      launchBreathingSession(btn.dataset.tech);
    };
  });

  // Bind save settings
  var saveBtn = el.querySelector('#breath-save-settings');
  if (saveBtn) {
    saveBtn.onclick = function () {
      var s = _loadState();
      var newBs = _getBreathSettings(s);
      newBs.enabled = el.querySelector('#breath-enabled').checked;
      newBs.stressTriggered = el.querySelector('#breath-stress-trigger').checked;
      newBs.vibrationGuide = el.querySelector('#breath-vibration').checked;
      newBs.autoDetectNeed = el.querySelector('#breath-autodetect').checked;
      newBs.stressThreshold = parseInt(el.querySelector('#breath-stress-th').value) || 65;
      newBs.reminderIntervalMin = parseInt(el.querySelector('#breath-interval').value) || 60;
      _saveBreathSettings(s, newBs);

      // Start/stop coach based on enabled state
      if (newBs.enabled && !_breathCoachActive) startBreathingCoach();
      if (!newBs.enabled && _breathCoachActive) stopBreathingCoach();

      showToast('⚙️ Configuración del coach guardada');
    };
  }
}

function _stressGradient(stress) {
  if (stress < 30) return '#065f46 0%,#047857 50%,#10B981 100%';
  if (stress < 50) return '#1e3a5f 0%,#1e40af 50%,#3B82F6 100%';
  if (stress < 70) return '#78350f 0%,#b45309 50%,#F59E0B 100%';
  if (stress < 85) return '#7f1d1d 0%,#b91c1c 50%,#EF4444 100%';
  return '#450a0a 0%,#991b1b 50%,#DC2626 100%';
}

function _stressAdvice(stress) {
  if (stress < 30) return '🌿 Estás muy relajado. Buen momento para una respiración de mantenimiento.';
  if (stress < 50) return '😊 Tu estrés es normal. Una sesión corta ayudará a mantener el equilibrio.';
  if (stress < 70) return '⚡ Estrés moderado detectado. Te recomendamos una sesión de respiración.';
  if (stress < 85) return '🔥 Estrés alto. Una técnica de relajación te ayudará significativamente.';
  return '🚨 Estrés muy alto. Es importante que tomes unos minutos para respirar ahora.';
}
