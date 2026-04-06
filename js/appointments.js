/* ── Appointments Module — MiDoctorYa Lite (Virtual Telemedicine) ──── */
import { t, getCountry } from './i18n.js';
import { showToast } from './app.js';

/* ── Constants ────────────────────────────────────────────────────── */
const LS_APPOINTMENTS = 'dya_appointments';
const LS_DOCTORS      = 'dya_doctors_list';
const LS_USER         = 'dya_user';

const SEED_DOCTORS = [
  { name: 'Dra. Maria Gonzalez',  email: 'maria.gonzalez@gmail.com',  specialty: 'Acompanamiento Fitness', available: true },
  { name: 'Dr. Carlos Ramirez',   email: 'carlos.ramirez@gmail.com',  specialty: 'Acompanamiento Fitness', available: true },
  { name: 'Dr. Ana Martinez',     email: 'ana.martinez@gmail.com',    specialty: 'Acompanamiento Fitness', available: true },
];

const DEFAULT_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','14:00','14:30','15:00','15:30','16:00',
];

/* ── State ────────────────────────────────────────────────────────── */
let _step       = 1;   // wizard: 1=doctor, 2=time, 3=confirm
let _view       = 'book'; // 'book' | 'my' | 'recs'
let _doctors    = [];
let _selDoctor  = null;
let _selDate    = '';
let _selTime    = '';
let _container  = null;

/* ── Helpers ──────────────────────────────────────────────────────── */

function _uid(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function _getUser() {
  return JSON.parse(localStorage.getItem(LS_USER) || '{}');
}

function _getAppointments() {
  return JSON.parse(localStorage.getItem(LS_APPOINTMENTS) || '[]');
}

function _saveAppointments(arr) {
  localStorage.setItem(LS_APPOINTMENTS, JSON.stringify(arr));
}

function _getDoctors() {
  let docs = JSON.parse(localStorage.getItem(LS_DOCTORS) || '[]');
  if (!docs.length) {
    docs = SEED_DOCTORS;
    localStorage.setItem(LS_DOCTORS, JSON.stringify(docs));
  }
  return docs;
}

function _getDoctorSlots(email, date) {
  const key = 'dya_doctor_slots_' + email;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  if (stored[date] && stored[date].length) return stored[date];
  // fallback: generate default slots, mark some randomly unavailable
  return DEFAULT_SLOTS.map(function (time) {
    return { time: time, available: Math.random() > 0.25 };
  });
}

function _getMPConfig() {
  var adminCfg = JSON.parse(localStorage.getItem('dya_admin_config') || '{}');
  var mpCfg = JSON.parse(localStorage.getItem('dya_config_mercadopago') || '{}');
  return {
    publicKey: adminCfg.MP_PUBLIC_KEY || '',
    accessToken: adminCfg.MP_ACCESS_TOKEN || '',
    sandbox: mpCfg.sandbox !== undefined ? mpCfg.sandbox : (adminCfg.MP_SANDBOX === 'true' || adminCfg.MP_SANDBOX === true),
    priceCOP: mpCfg.priceCOP || 50000,
    priceUSD: mpCfg.priceUSD || 30
  };
}

function _getPrice() {
  var mpCfg = _getMPConfig();
  if (getCountry() === 'CO') return { amount: mpCfg.priceCOP, currency: 'COP', display: '$' + mpCfg.priceCOP.toLocaleString() + ' COP' };
  return { amount: mpCfg.priceUSD, currency: 'USD', display: '$' + mpCfg.priceUSD + ' USD' };
}

function _loadMPScript() {
  return new Promise(function (resolve, reject) {
    if (window.MercadoPago) { resolve(window.MercadoPago); return; }
    var script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = function () { resolve(window.MercadoPago); };
    script.onerror = function () { reject(new Error('No se pudo cargar el SDK de Mercado Pago')); };
    document.head.appendChild(script);
  });
}

function _createMPPreference(data) {
  return fetch('/api/mp/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function (r) {
    if (!r.ok) throw new Error('Error creando preferencia: ' + r.status);
    return r.json();
  });
}

function _autoAssignDoctor() {
  var docs = _getDoctors().filter(function (d) { return d.available !== false; });
  if (!docs.length) return null;

  // Try to find a doctor with open slots today
  var today = new Date().toISOString().split('T')[0];
  for (var i = 0; i < docs.length; i++) {
    var slots = _getDoctorSlots(docs[i].email, today);
    var open = slots.filter(function (s) { return s.available !== false; });
    if (open.length) return docs[i];
  }

  // Fallback: least-busy doctor
  var appts = _getAppointments().filter(function (a) { return a.status === 'scheduled'; });
  var counts = {};
  docs.forEach(function (d) { counts[d.email] = 0; });
  appts.forEach(function (a) {
    if (typeof counts[a.doctorEmail] === 'number') counts[a.doctorEmail]++;
  });
  docs.sort(function (a, b) { return (counts[a.email] || 0) - (counts[b.email] || 0); });
  return docs[0];
}

function _getPatientRecs(userEmail) {
  var key = 'dya_patient_recs_' + userEmail;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function _nextDates(n) {
  var dates = [];
  for (var i = 0; i < n; i++) {
    var d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/* ── Main render ──────────────────────────────────────────────────── */

export function renderAppointments(container) {
  _container = container;
  _view = 'book';
  _step = 1;
  _doctors = _getDoctors();
  _selDoctor = null;
  _selDate = '';
  _selTime = '';
  _render();
}

function _render() {
  var c = _container;
  c.innerHTML = '';

  // Header
  c.innerHTML = '<div class="gradient-primary text-white px-5 pt-12 pb-10 relative overflow-hidden">'
    + '<div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>'
    + '<p class="text-xs text-white/50 mb-1">MiDoctorYa</p>'
    + '<h1 class="text-2xl font-bold mb-1 flex items-center gap-2">'
    +   '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
    +   'Consultas Virtuales'
    + '</h1>'
    + '<p class="text-xs text-white/60">Telemedicina por videollamada</p>'
    + '<div class="flex gap-2 mt-3" id="apt-tabs">'
    +   '<button id="tab-book" class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all '
    +     (_view === 'book' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60') + '">Agendar</button>'
    +   '<button id="tab-my" class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all '
    +     (_view === 'my' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60') + '">Mis Citas</button>'
    +   '<button id="tab-recs" class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all '
    +     (_view === 'recs' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60') + '">Recomendaciones</button>'
    + '</div>'
    + '</div>'
    + '<div id="apt-content" class="px-4 -mt-4 pb-6"></div>';

  c.querySelector('#tab-book').onclick = function () { _view = 'book'; _step = 1; _render(); };
  c.querySelector('#tab-my').onclick   = function () { _view = 'my'; _render(); };
  c.querySelector('#tab-recs').onclick = function () { _view = 'recs'; _render(); };

  var content = c.querySelector('#apt-content');

  if (_view === 'book')  _renderBooking(content);
  else if (_view === 'my') _renderMyAppointments(content);
  else _renderRecommendations(content);
}

/* ── Booking Wizard ───────────────────────────────────────────────── */

function _renderBooking(el) {
  // Step indicator
  var steps = [
    { n: 1, label: 'Doctor' },
    { n: 2, label: 'Horario' },
    { n: 3, label: 'Confirmar' },
  ];
  var indicator = '<div class="flex items-center justify-center gap-1 my-4">';
  steps.forEach(function (s, i) {
    var active = s.n <= _step;
    indicator += '<div class="flex items-center gap-1">';
    indicator += '<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold '
      + (active ? 'gradient-primary text-white shadow-lg' : 'bg-gray-200 text-gray-400') + '">' + s.n + '</div>';
    indicator += '<span class="text-[10px] font-semibold ' + (active ? 'text-gray-700' : 'text-gray-400') + '">' + s.label + '</span>';
    if (i < steps.length - 1) indicator += '<div class="w-6 h-0.5 mx-1 ' + (s.n < _step ? 'bg-primary' : 'bg-gray-200') + '"></div>';
    indicator += '</div>';
  });
  indicator += '</div>';

  el.innerHTML = indicator + '<div id="wizard-body"></div>';
  var body = el.querySelector('#wizard-body');

  if (_step === 1) _renderStep1(body);
  else if (_step === 2) _renderStep2(body);
  else _renderStep3(body);
}

/* ── Step 1: Select Doctor ────────────────────────────────────────── */

function _renderStep1(el) {
  var price = _getPrice();
  var html = '<div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-4 border border-blue-100">'
    + '<div class="flex items-center gap-2 mb-1">'
    + '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    + '<span class="text-sm font-bold text-gray-800">Consulta Virtual</span>'
    + '</div>'
    + '<p class="text-xs text-gray-500 mb-2">Todas las consultas son por videollamada (Jitsi Meet)</p>'
    + '<div class="text-lg font-black text-primary">' + price.display + '</div>'
    + '</div>';

  html += '<h3 class="font-bold text-sm text-gray-700 mb-3">' + t('apt_doctors') + '</h3>';

  _doctors.forEach(function (doc, i) {
    var initial = (doc.name || 'D')[0];
    var avail = doc.available !== false;
    html += '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 card-hover animate-slide-up" style="animation-delay:' + (i * 80) + 'ms">'
      + '<div class="flex items-center gap-3">'
      +   '<div class="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">' + initial + '</div>'
      +   '<div class="flex-1 min-w-0">'
      +     '<h3 class="font-bold text-sm text-gray-800">' + doc.name + '</h3>'
      +     '<p class="text-xs text-primary font-medium">' + doc.specialty + '</p>'
      +     '<div class="flex items-center gap-1 mt-1">'
      +       '<span class="text-amber-400 text-xs">&#9733;&#9733;&#9733;&#9733;</span><span class="text-gray-300 text-xs">&#9733;</span>'
      +       '<span class="text-[10px] text-gray-400 ml-1">4.0</span>'
      +     '</div>'
      +   '</div>'
      +   '<div class="flex flex-col items-end gap-1">'
      +     '<span class="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ' + (avail ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500') + '">'
      +       (avail ? t('apt_available') : 'No disponible')
      +     '</span>'
      +     (avail ? '<button class="sel-doc-btn px-4 py-2 rounded-xl gradient-primary text-white text-xs font-semibold shadow-lg shadow-primary/20" data-idx="' + i + '">Seleccionar</button>' : '')
      +   '</div>'
      + '</div>'
      + '</div>';
  });

  // Auto-assign button
  html += '<button id="auto-assign-btn" class="w-full py-3 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-all mb-3">'
    + 'Asignar doctor automaticamente'
    + '</button>';

  el.innerHTML = html;

  el.querySelectorAll('.sel-doc-btn').forEach(function (btn) {
    btn.onclick = function () {
      _selDoctor = _doctors[parseInt(btn.dataset.idx)];
      _step = 2;
      _render();
    };
  });

  var autoBtn = el.querySelector('#auto-assign-btn');
  if (autoBtn) {
    autoBtn.onclick = function () {
      var doc = _autoAssignDoctor();
      if (!doc) { showToast('No hay doctores disponibles'); return; }
      _selDoctor = doc;
      _step = 2;
      _render();
    };
  }
}

/* ── Step 2: Select Date & Time ───────────────────────────────────── */

function _renderStep2(el) {
  var dates = _nextDates(7);
  _selDate = _selDate || dates[0];

  var html = '<button id="back-to-1" class="flex items-center gap-2 text-sm text-gray-500 mb-3">'
    + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>'
    + t('fit_back')
    + '</button>';

  // Doctor info
  html += '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">'
    + '<div class="flex items-center gap-3 mb-4">'
    +   '<div class="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white text-lg font-bold">' + (_selDoctor.name || 'D')[0] + '</div>'
    +   '<div>'
    +     '<h3 class="font-bold text-sm">' + _selDoctor.name + '</h3>'
    +     '<p class="text-xs text-primary">' + _selDoctor.specialty + '</p>'
    +   '</div>'
    + '</div>';

  // Date pills
  html += '<h4 class="font-semibold text-xs text-gray-600 mb-2">' + t('apt_date') + '</h4>'
    + '<div class="flex gap-2 overflow-x-auto hide-scroll pb-2" id="date-pills">';
  dates.forEach(function (d, i) {
    var dt = new Date(d + 'T12:00:00');
    var dayName = dt.toLocaleDateString(undefined, { weekday: 'short' });
    var dayNum = dt.getDate();
    var active = d === _selDate;
    html += '<button data-date="' + d + '" class="date-pill flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all '
      + (active ? 'pill-active' : 'bg-gray-100 text-gray-600') + '">'
      + '<span class="text-[10px]">' + dayName + '</span><span class="text-sm">' + dayNum + '</span></button>';
  });
  html += '</div></div>';

  // Slots
  html += '<h4 class="font-semibold text-xs text-gray-600 mb-2">' + t('apt_select_slot') + '</h4>'
    + '<div id="slots-grid" class="grid grid-cols-3 gap-2 mb-4"></div>';

  el.innerHTML = html;

  el.querySelector('#back-to-1').onclick = function () { _step = 1; _render(); };

  // Date pill clicks
  el.querySelectorAll('.date-pill').forEach(function (pill) {
    pill.onclick = function () {
      el.querySelectorAll('.date-pill').forEach(function (p) {
        p.className = p.className.replace('pill-active', '').trim();
        if (!p.classList.contains('bg-gray-100')) p.classList.add('bg-gray-100', 'text-gray-600');
      });
      pill.classList.add('pill-active');
      pill.classList.remove('bg-gray-100', 'text-gray-600');
      _selDate = pill.dataset.date;
      _loadSlots(el.querySelector('#slots-grid'));
    };
  });

  _loadSlots(el.querySelector('#slots-grid'));
}

function _loadSlots(grid) {
  if (!grid) return;
  var slots = _getDoctorSlots(_selDoctor.email, _selDate);
  grid.innerHTML = slots.map(function (s) {
    var avail = s.available !== false;
    return '<button class="slot-btn py-2.5 rounded-xl text-xs font-semibold transition-all '
      + (avail
        ? 'bg-white border border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
        : 'bg-gray-100 text-gray-300 cursor-not-allowed')
      + '" data-time="' + s.time + '"' + (avail ? '' : ' disabled') + '>'
      + s.time + '</button>';
  }).join('');

  grid.querySelectorAll('.slot-btn:not([disabled])').forEach(function (btn) {
    btn.onclick = function () {
      _selTime = btn.dataset.time;
      _step = 3;
      _render();
    };
  });
}

/* ── Step 3: Confirm & Pay ────────────────────────────────────────── */

function _renderStep3(el) {
  var price = _getPrice();
  var mpCfg = _getMPConfig();
  var jitsiId = _uid(8);
  var jitsiLink = 'https://meet.jit.si/MiDoctorYa-' + jitsiId;
  var user = _getUser();
  var hasMPKeys = mpCfg.publicKey && mpCfg.accessToken;

  var html = '<button id="back-to-2" class="flex items-center gap-2 text-sm text-gray-500 mb-3">'
    + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>'
    + t('fit_back')
    + '</button>';

  html += '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">'
    + '<h3 class="font-bold text-base text-gray-800 mb-4 text-center">Resumen de tu consulta</h3>'
    + '<div class="space-y-3">'
    +   _summaryRow('Doctor', _selDoctor.name)
    +   _summaryRow('Tipo', 'Acompanamiento Fitness')
    +   _summaryRow('Modalidad', 'Videollamada (Jitsi Meet)')
    +   _summaryRow('Fecha', _formatDateNice(_selDate))
    +   _summaryRow('Hora', _selTime)
    + '</div>'
    + '<div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">'
    +   '<span class="text-sm font-semibold text-gray-600">Total a pagar</span>'
    +   '<span class="text-xl font-black text-primary">' + price.display + '</span>'
    + '</div>'
    + '</div>';

  if (mpCfg.sandbox) {
    html += '<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-center">'
      + '<span class="text-[10px] font-bold text-amber-700">MODO SANDBOX (PRUEBAS)</span>'
      + '</div>';
  }

  // Mercado Pago branded button
  html += '<button id="pay-btn" class="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 '
    + (hasMPKeys ? 'bg-[#009EE3] hover:bg-[#007EB5]' : 'gradient-primary shadow-primary/20') + '">';
  if (hasMPKeys) {
    html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 15.06l-3.54-3.54 1.41-1.41 2.12 2.12 5.66-5.66 1.41 1.41-7.06 7.08z"/></svg>'
      + 'Pagar con Mercado Pago ' + price.display;
  } else {
    html += 'Confirmar y Pagar ' + price.display;
  }
  html += '</button>';

  // MP checkout container
  html += '<div id="mp-checkout-container" class="mt-4"></div>';
  html += '<div id="mp-status-msg" class="text-center text-xs mt-3 hidden"></div>';

  el.innerHTML = html;

  el.querySelector('#back-to-2').onclick = function () { _step = 2; _render(); };

  el.querySelector('#pay-btn').onclick = function () {
    var payBtn = el.querySelector('#pay-btn');
    var statusMsg = el.querySelector('#mp-status-msg');

    if (!hasMPKeys) {
      // Fallback: simulate payment if no MP keys configured
      _saveAppointmentAndConfirm(el, user, price, jitsiLink, null);
      return;
    }

    // Disable button & show loading
    payBtn.disabled = true;
    payBtn.innerHTML = '<svg class="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>'
      + ' Procesando...';

    // Create preference on server
    var prefData = {
      title: 'Consulta Virtual - ' + _selDoctor.name,
      description: 'Consulta de Acompanamiento Fitness con ' + _selDoctor.name + ' el ' + _selDate + ' a las ' + _selTime,
      price: price.amount,
      currency: price.currency === 'COP' ? 'COP' : 'USD',
      access_token: mpCfg.accessToken,
      sandbox: mpCfg.sandbox,
      payer_email: user.email || '',
      external_reference: 'apt_' + _uid(8)
    };

    _createMPPreference(prefData).then(function (resp) {
      if (resp.error) {
        throw new Error(resp.error);
      }

      var initPoint = mpCfg.sandbox ? resp.sandbox_init_point : resp.init_point;
      var preferenceId = resp.id;

      // Try to open checkout with the JS SDK
      _loadMPScript().then(function (MercadoPago) {
        var mp = new MercadoPago(mpCfg.publicKey, { locale: 'es-CO' });
        var checkoutContainer = el.querySelector('#mp-checkout-container');

        // Create wallet/checkout button via the SDK
        mp.checkout({
          preference: { id: preferenceId },
          render: {
            container: '#mp-checkout-container',
            label: 'Pagar con Mercado Pago'
          },
          callbacks: {
            onReady: function () {
              payBtn.style.display = 'none';
            }
          }
        });

        // Also provide direct link as fallback
        statusMsg.classList.remove('hidden');
        statusMsg.className = 'text-center text-xs mt-3 text-blue-600';
        statusMsg.innerHTML = '<a href="' + initPoint + '" target="_blank" class="underline font-semibold">O haz clic aqui para pagar en Mercado Pago</a>';

        // Save pending appointment
        var apptId = prefData.external_reference;
        var apt = {
          id: apptId,
          patientEmail: user.email || '',
          patientName: user.name || '',
          patientPhone: user.phone || '',
          doctorEmail: _selDoctor.email,
          doctorName: _selDoctor.name,
          date: _selDate,
          time: _selTime,
          type: 'fitness',
          status: 'pending_payment',
          paid: false,
          price: { amount: price.amount, currency: price.currency },
          jitsiLink: jitsiLink,
          mpPreferenceId: preferenceId,
          mpStatus: 'pending',
          createdAt: new Date().toISOString()
        };

        var appts = _getAppointments();
        appts.push(apt);
        _saveAppointments(appts);

        // Poll for payment or listen for redirect
        _pollPaymentStatus(el, apt);

      }).catch(function (sdkErr) {
        // SDK failed to load — redirect to Mercado Pago directly
        statusMsg.classList.remove('hidden');
        statusMsg.className = 'text-center text-xs mt-3';

        // Save appointment as pending
        var apptId = prefData.external_reference;
        var apt = {
          id: apptId,
          patientEmail: user.email || '',
          patientName: user.name || '',
          patientPhone: user.phone || '',
          doctorEmail: _selDoctor.email,
          doctorName: _selDoctor.name,
          date: _selDate,
          time: _selTime,
          type: 'fitness',
          status: 'pending_payment',
          paid: false,
          price: { amount: price.amount, currency: price.currency },
          jitsiLink: jitsiLink,
          mpPreferenceId: preferenceId,
          mpStatus: 'pending',
          createdAt: new Date().toISOString()
        };

        var appts = _getAppointments();
        appts.push(apt);
        _saveAppointments(appts);

        // Redirect to MP checkout
        window.open(initPoint, '_blank');

        payBtn.disabled = false;
        payBtn.innerHTML = 'Verificar Pago';
        payBtn.onclick = function () { _pollPaymentStatus(el, apt); };

        statusMsg.innerHTML = '<span class="text-blue-600">Se abrio Mercado Pago en una nueva ventana. Completa el pago y vuelve aqui.</span>';
      });

    }).catch(function (err) {
      payBtn.disabled = false;
      payBtn.innerHTML = 'Reintentar Pago ' + price.display;
      statusMsg.classList.remove('hidden');
      statusMsg.className = 'text-center text-xs mt-3 text-red-500';
      statusMsg.textContent = 'Error: ' + err.message;
    });
  };
}

function _saveAppointmentAndConfirm(el, user, price, jitsiLink, mpData) {
  var apptId = (mpData && mpData.externalReference) ? mpData.externalReference : ('apt_' + _uid(8));
  var apt = {
    id: apptId,
    patientEmail: user.email || '',
    patientName: user.name || '',
    patientPhone: user.phone || '',
    doctorEmail: _selDoctor.email,
    doctorName: _selDoctor.name,
    date: _selDate,
    time: _selTime,
    type: 'fitness',
    status: 'scheduled',
    paid: true,
    price: { amount: price.amount, currency: price.currency },
    jitsiLink: jitsiLink,
    mpPaymentId: mpData ? mpData.paymentId : null,
    mpStatus: mpData ? mpData.status : 'simulated',
    mpPreferenceId: mpData ? mpData.preferenceId : null,
    createdAt: new Date().toISOString()
  };

  var appts = _getAppointments();
  // Check if already exists (update it)
  var existingIdx = appts.findIndex(function (a) { return a.id === apptId; });
  if (existingIdx !== -1) {
    appts[existingIdx] = apt;
  } else {
    appts.push(apt);
  }
  _saveAppointments(appts);

  showToast(t('apt_booked'));
  _renderConfirmation(el, apt);
}

function _pollPaymentStatus(el, apt) {
  var mpCfg = _getMPConfig();
  if (!apt.mpPreferenceId || !mpCfg.accessToken) return;

  var statusMsg = el.querySelector('#mp-status-msg');
  if (statusMsg) {
    statusMsg.classList.remove('hidden');
    statusMsg.className = 'text-center text-xs mt-3 text-blue-600';
    statusMsg.textContent = 'Verificando estado del pago...';
  }

  fetch('/api/mp/payment-status?preference_id=' + apt.mpPreferenceId + '&access_token=' + encodeURIComponent(mpCfg.accessToken))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.status === 'approved') {
        // Payment confirmed
        var appts = _getAppointments();
        var idx = appts.findIndex(function (a) { return a.id === apt.id; });
        if (idx !== -1) {
          appts[idx].status = 'scheduled';
          appts[idx].paid = true;
          appts[idx].mpStatus = 'approved';
          appts[idx].mpPaymentId = data.payment_id || '';
          _saveAppointments(appts);
          apt = appts[idx];
        }
        showToast(t('apt_booked'));
        _renderConfirmation(el, apt);
      } else if (data.status === 'pending' || data.status === 'in_process') {
        if (statusMsg) {
          statusMsg.className = 'text-center text-xs mt-3 text-amber-600';
          statusMsg.textContent = 'Pago pendiente. Completa el pago en Mercado Pago y presiona "Verificar Pago".';
        }
        var payBtn = el.querySelector('#pay-btn');
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = 'Verificar Pago';
          payBtn.onclick = function () { _pollPaymentStatus(el, apt); };
        }
      } else if (data.status === 'rejected') {
        if (statusMsg) {
          statusMsg.className = 'text-center text-xs mt-3 text-red-500';
          statusMsg.textContent = 'El pago fue rechazado. Intenta de nuevo con otro metodo de pago.';
        }
        var appts2 = _getAppointments();
        var idx2 = appts2.findIndex(function (a) { return a.id === apt.id; });
        if (idx2 !== -1) {
          appts2[idx2].mpStatus = 'rejected';
          _saveAppointments(appts2);
        }
      } else {
        // No payment found yet
        if (statusMsg) {
          statusMsg.className = 'text-center text-xs mt-3 text-gray-500';
          statusMsg.textContent = 'Aun no se detecta el pago. Completa el pago y vuelve a verificar.';
        }
        var payBtn2 = el.querySelector('#pay-btn');
        if (payBtn2) {
          payBtn2.disabled = false;
          payBtn2.textContent = 'Verificar Pago';
          payBtn2.onclick = function () { _pollPaymentStatus(el, apt); };
        }
      }
    }).catch(function () {
      if (statusMsg) {
        statusMsg.className = 'text-center text-xs mt-3 text-red-500';
        statusMsg.textContent = 'Error verificando pago. Intenta de nuevo.';
      }
    });
}

function _summaryRow(label, value) {
  return '<div class="flex justify-between items-center">'
    + '<span class="text-xs text-gray-500">' + label + '</span>'
    + '<span class="text-sm font-semibold text-gray-800">' + value + '</span>'
    + '</div>';
}

function _formatDateNice(dateStr) {
  var d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── Confirmation Screen ──────────────────────────────────────────── */

function _renderConfirmation(el, apt) {
  el.innerHTML = '<div class="text-center animate-fade-in">'
    + '<div class="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">'
    +   '<svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
    + '</div>'
    + '<h2 class="text-xl font-bold text-gray-800 mb-1">Cita Confirmada</h2>'
    + '<p class="text-xs text-gray-400 mb-6">Tu pago ha sido procesado exitosamente</p>'
    + '</div>'
    + '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-3">'
    +   _summaryRow('Doctor', apt.doctorName)
    +   _summaryRow('Fecha', _formatDateNice(apt.date))
    +   _summaryRow('Hora', apt.time)
    +   _summaryRow('Pagado', apt.price.amount.toLocaleString() + ' ' + apt.price.currency)
    + '</div>'
    + '<div class="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">'
    +   '<p class="text-xs font-semibold text-blue-800 mb-1">Enlace de videollamada</p>'
    +   '<a href="' + apt.jitsiLink + '" target="_blank" class="text-sm text-blue-600 underline break-all">' + apt.jitsiLink + '</a>'
    +   '<p class="text-[10px] text-blue-400 mt-1">El enlace se activara 15 minutos antes de tu cita</p>'
    + '</div>'
    + '<button id="go-my" class="w-full py-3 rounded-2xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-all">'
    +   'Ver mis citas'
    + '</button>';

  el.querySelector('#go-my').onclick = function () { _view = 'my'; _render(); };
}

/* ── My Appointments ──────────────────────────────────────────────── */

function _renderMyAppointments(el) {
  var appts = _getAppointments();
  var user = _getUser();
  var mine = appts.filter(function (a) { return a.patientEmail === user.email; });

  if (!mine.length) {
    el.innerHTML = '<div class="text-center py-12 text-gray-400">'
      + '<div class="text-5xl mb-3">&#128197;</div>'
      + '<p class="text-sm">' + t('apt_no_appointments') + '</p>'
      + '</div>';
    return;
  }

  // Sort: upcoming first, then past
  var now = new Date();
  mine.sort(function (a, b) {
    return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
  });

  var html = '';
  mine.forEach(function (apt, i) {
    var aptDate = new Date(apt.date + 'T' + apt.time);
    var isPast = aptDate < now;
    var diffMs = aptDate - now;
    var diffH = diffMs / 3600000;
    var canJoin = diffMs > 0 && diffMs <= 15 * 60 * 1000; // 15 min before
    var canCancel = apt.status === 'scheduled' && diffH > 24;

    var statusLabel, statusClass;
    if (apt.status === 'cancelled') { statusLabel = 'Cancelada'; statusClass = 'bg-red-100 text-red-500'; }
    else if (apt.status === 'completed' || isPast) { statusLabel = 'Completada'; statusClass = 'bg-gray-100 text-gray-500'; }
    else { statusLabel = t('apt_scheduled'); statusClass = 'bg-emerald-100 text-emerald-600'; }

    var priceText = apt.price ? apt.price.amount.toLocaleString() + ' ' + apt.price.currency : '';

    html += '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 animate-slide-up" style="animation-delay:' + (i * 60) + 'ms">'
      + '<div class="flex items-start gap-3">'
      +   '<div class="w-2 rounded-full self-stretch flex-shrink-0 ' + (apt.status === 'cancelled' ? 'bg-red-300' : (isPast ? 'bg-gray-300' : 'bg-primary')) + '"></div>'
      +   '<div class="flex-1">'
      +     '<div class="flex items-start justify-between">'
      +       '<div>'
      +         '<h3 class="font-bold text-sm text-gray-800">' + apt.doctorName + '</h3>'
      +         '<p class="text-xs text-primary font-medium">Acompanamiento Fitness</p>'
      +       '</div>'
      +       '<span class="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ' + statusClass + '">' + statusLabel + '</span>'
      +     '</div>'
      +     '<div class="flex gap-3 mt-2">'
      +       '<span class="text-xs text-gray-500">&#128197; ' + apt.date + '</span>'
      +       '<span class="text-xs text-gray-500">&#128336; ' + apt.time + '</span>'
      +       (priceText ? '<span class="text-xs text-gray-500">&#128176; ' + priceText + '</span>' : '')
      +     '</div>'
      +     '<div class="flex gap-2 mt-3">';

    if (apt.status === 'scheduled' && !isPast) {
      html += '<a href="' + apt.jitsiLink + '" target="_blank" class="join-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all '
        + (canJoin
          ? 'gradient-primary text-white shadow-lg shadow-primary/20'
          : 'bg-gray-100 text-gray-400 pointer-events-none')
        + '">Unirse a consulta</a>';
    }

    if (canCancel) {
      html += '<button class="cancel-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 border border-red-200 hover:bg-red-50 transition-all" data-id="' + apt.id + '">Cancelar</button>';
    }

    html += '<button class="recs-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-500 border border-blue-200 hover:bg-blue-50 transition-all" data-email="' + (apt.doctorEmail || '') + '">Ver recomendaciones</button>';

    html += '</div></div></div></div>';
  });

  el.innerHTML = html;

  el.querySelectorAll('.cancel-btn').forEach(function (btn) {
    btn.onclick = function () {
      var appts = _getAppointments();
      var idx = appts.findIndex(function (a) { return a.id === btn.dataset.id; });
      if (idx !== -1) {
        appts[idx].status = 'cancelled';
        _saveAppointments(appts);
        showToast(t('apt_cancelled'));
        _render();
      }
    };
  });

  el.querySelectorAll('.recs-btn').forEach(function (btn) {
    btn.onclick = function () {
      _view = 'recs';
      _render();
    };
  });
}

/* ── Doctor Recommendations ───────────────────────────────────────── */

function _renderRecommendations(el) {
  var user = _getUser();
  var recs = _getPatientRecs(user.email || '');

  if (!recs.length) {
    el.innerHTML = '<div class="text-center py-12 text-gray-400">'
      + '<div class="text-5xl mb-3">&#128203;</div>'
      + '<p class="text-sm">No tienes recomendaciones medicas aun</p>'
      + '<p class="text-xs text-gray-300 mt-1">Tus doctores dejaran recomendaciones aqui despues de tu consulta</p>'
      + '</div>';
    return;
  }

  var categories = {
    'restricciones_alimenticias': { label: 'Restricciones alimenticias', icon: '&#127829;', items: [] },
    'habitos': { label: 'Habitos', icon: '&#128218;', items: [] },
    'restricciones_ejercicio': { label: 'Restricciones de ejercicio', icon: '&#127947;', items: [] },
    'condiciones': { label: 'Condiciones', icon: '&#129657;', items: [] },
  };

  recs.forEach(function (r) {
    var cat = r.type || 'habitos';
    if (categories[cat]) categories[cat].items.push(r);
    else categories['habitos'].items.push(r);
  });

  var html = '';
  Object.keys(categories).forEach(function (key) {
    var cat = categories[key];
    if (!cat.items.length) return;
    html += '<div class="mb-4">'
      + '<h3 class="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">'
      + '<span>' + cat.icon + '</span> ' + cat.label + '</h3>';

    cat.items.forEach(function (r, i) {
      var priorityClass = r.priority === 'high' ? 'bg-red-100 text-red-600'
        : r.priority === 'medium' ? 'bg-amber-100 text-amber-600'
        : 'bg-blue-100 text-blue-600';
      var priorityLabel = r.priority === 'high' ? 'Alta' : r.priority === 'medium' ? 'Media' : 'Normal';

      html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-2 animate-slide-up" style="animation-delay:' + (i * 50) + 'ms">'
        + '<div class="flex items-start justify-between">'
        +   '<div class="flex-1">'
        +     '<p class="text-sm text-gray-800">' + (r.text || r.description || '') + '</p>'
        +     (r.date ? '<p class="text-[10px] text-gray-400 mt-1">' + r.date + '</p>' : '')
        +   '</div>'
        +   '<span class="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0 ' + priorityClass + '">' + priorityLabel + '</span>'
        + '</div></div>';
    });

    html += '</div>';
  });

  el.innerHTML = html;
}
