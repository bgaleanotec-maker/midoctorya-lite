/* ── Subscription Management Engine — MiDoctorYa Lite PWA ─────────── */
import { getCountry } from './i18n.js';

// ── Config Helpers ───────────────────────────────────────────────────
function _getAdminConfig() {
  try { return JSON.parse(localStorage.getItem('dya_admin_config') || '{}'); } catch(e) { return {}; }
}

function _getMPConfig() {
  try { return JSON.parse(localStorage.getItem('dya_config_mercadopago') || '{}'); } catch(e) { return {}; }
}

function _getSubConfig() {
  var mp = _getMPConfig();
  return {
    trialDays: mp.trialDays || 7,
    graceDays: mp.graceDays || 5,
    deletionDays: mp.deletionDays || 30,
    discountTrimestral: mp.discountTrimestral || 10,
    discountAnual: mp.discountAnual || 25,
    emailReminders: mp.emailReminders !== false,
    whatsappReminders: mp.whatsappReminders !== false
  };
}

function _getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('dya_user') || '{}'); } catch(e) { return {}; }
}

function _getServerBase() {
  return window.location.origin;
}

// ── Pricing ─────────────────────────────────────────────────────────
function getPlanPrices() {
  var mp = _getMPConfig();
  var baseCOP = mp.priceCOP || 50000;
  var baseUSD = mp.priceUSD || 30;
  var cfg = _getSubConfig();
  var dTri = (100 - cfg.discountTrimestral) / 100;
  var dAn = (100 - cfg.discountAnual) / 100;

  return {
    mensual: { COP: baseCOP, USD: baseUSD },
    trimestral: { COP: Math.round(baseCOP * 3 * dTri), USD: Math.round(baseUSD * 3 * dTri * 100) / 100 },
    anual: { COP: Math.round(baseCOP * 12 * dAn), USD: Math.round(baseUSD * 12 * dAn * 100) / 100 }
  };
}

function _getPlanDurationDays(plan) {
  if (plan === 'trimestral') return 90;
  if (plan === 'anual') return 365;
  return 30; // mensual
}

function _addDays(dateStr, days) {
  var d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function _daysBetween(dateStrA, dateStrB) {
  var a = new Date(dateStrA);
  var b = new Date(dateStrB);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ── Subscription CRUD ───────────────────────────────────────────────
function _subKey(email) {
  return 'dya_subscription_' + email;
}

function _createDefaultSub(email) {
  var cfg = _getSubConfig();
  var now = new Date().toISOString();
  var trialEnd = _addDays(now, cfg.trialDays);
  return {
    email: email,
    plan: 'mensual',
    status: 'trial',
    startDate: now,
    expiresAt: trialEnd,
    trialEndsAt: trialEnd,
    lastPaymentDate: '',
    lastPaymentId: '',
    nextPaymentDue: trialEnd,
    gracePeriodEndsAt: '',
    deletionDate: '',
    reminders: {
      day7: false, day3: false, day2: false, day1: false,
      expired: false, grace5: false, grace3: false, grace1: false,
      deleteWarning7: false, deleteWarning3: false, deleteWarning1: false
    },
    paymentHistory: []
  };
}

export function initSubscription(email) {
  if (!email) return null;
  var key = _subKey(email);
  var existing = localStorage.getItem(key);
  if (existing) {
    try { return JSON.parse(existing); } catch(e) { /* recreate */ }
  }
  var sub = _createDefaultSub(email);
  localStorage.setItem(key, JSON.stringify(sub));
  return sub;
}

export function getSubscription(email) {
  if (!email) return null;
  try {
    var raw = localStorage.getItem(_subKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function _saveSub(sub) {
  if (!sub || !sub.email) return;
  localStorage.setItem(_subKey(sub.email), JSON.stringify(sub));
}

// ── Main Status Check (fast, localStorage only) ─────────────────────
export function checkSubscriptionStatus() {
  var user = _getCurrentUser();
  if (!user.email) return { allowed: true, status: 'no_user', daysLeft: 999, message: '' };

  var sub = getSubscription(user.email);
  if (!sub) {
    sub = initSubscription(user.email);
  }

  var now = new Date().toISOString();
  var cfg = _getSubConfig();

  // Active subscription
  if (sub.status === 'active') {
    var daysLeft = _daysBetween(now, sub.expiresAt);
    if (daysLeft > 0) {
      return { allowed: true, status: 'active', daysLeft: daysLeft, message: '' };
    }
    // Expired, transition to grace
    sub.status = 'expired';
    sub.gracePeriodEndsAt = _addDays(sub.expiresAt, cfg.graceDays);
    _saveSub(sub);
  }

  // Trial
  if (sub.status === 'trial') {
    var trialDaysLeft = _daysBetween(now, sub.trialEndsAt);
    if (trialDaysLeft > 0) {
      return { allowed: true, status: 'trial', daysLeft: trialDaysLeft, message: 'Periodo de prueba: ' + trialDaysLeft + ' dias restantes' };
    }
    // Trial expired, move to expired
    sub.status = 'expired';
    sub.gracePeriodEndsAt = _addDays(sub.trialEndsAt, cfg.graceDays);
    _saveSub(sub);
  }

  // Expired (in grace period)
  if (sub.status === 'expired' || sub.status === 'grace') {
    var graceEnd = sub.gracePeriodEndsAt || _addDays(sub.expiresAt || sub.trialEndsAt, cfg.graceDays);
    if (!sub.gracePeriodEndsAt) {
      sub.gracePeriodEndsAt = graceEnd;
      _saveSub(sub);
    }
    var graceDaysLeft = _daysBetween(now, graceEnd);
    if (graceDaysLeft > 0) {
      sub.status = 'grace';
      _saveSub(sub);
      return { allowed: true, status: 'grace', daysLeft: graceDaysLeft, message: 'Tu suscripcion ha vencido. Tienes ' + graceDaysLeft + ' dias de gracia.' };
    }
    // Grace period over, block
    sub.status = 'blocked';
    sub.deletionDate = _addDays(graceEnd, cfg.deletionDays - cfg.graceDays);
    _saveSub(sub);
  }

  // Blocked
  if (sub.status === 'blocked') {
    var expireRef = sub.expiresAt || sub.trialEndsAt;
    if (!sub.deletionDate) {
      sub.deletionDate = _addDays(expireRef, cfg.deletionDays);
      _saveSub(sub);
    }
    var daysUntilDeletion = _daysBetween(now, sub.deletionDate);
    var daysSinceExpiry = _daysBetween(expireRef, now);
    if (daysUntilDeletion <= 0) {
      sub.status = 'deleted';
      _saveSub(sub);
      return { allowed: false, status: 'deleted', daysLeft: 0, message: 'Tu cuenta ha sido eliminada.' };
    }
    return {
      allowed: false,
      status: 'blocked',
      daysLeft: daysUntilDeletion,
      daysSinceExpiry: daysSinceExpiry,
      message: 'Tu suscripcion ha vencido. Renueva para seguir usando MiDoctorYa.'
    };
  }

  // Deleted
  if (sub.status === 'deleted') {
    return { allowed: false, status: 'deleted', daysLeft: 0, message: 'Tu cuenta ha sido eliminada.' };
  }

  // Fallback
  return { allowed: true, status: sub.status, daysLeft: 999, message: '' };
}

// ── Activate / Renew ────────────────────────────────────────────────
export function activateSubscription(email, plan, paymentData) {
  var sub = getSubscription(email) || _createDefaultSub(email);
  var now = new Date().toISOString();
  var durationDays = _getPlanDurationDays(plan);

  sub.plan = plan;
  sub.status = 'active';
  sub.startDate = now;
  sub.expiresAt = _addDays(now, durationDays);
  sub.lastPaymentDate = now;
  sub.lastPaymentId = paymentData.mpPaymentId || '';
  sub.nextPaymentDue = sub.expiresAt;
  sub.gracePeriodEndsAt = '';
  sub.deletionDate = '';
  // Reset reminders
  sub.reminders = {
    day7: false, day3: false, day2: false, day1: false,
    expired: false, grace5: false, grace3: false, grace1: false,
    deleteWarning7: false, deleteWarning3: false, deleteWarning1: false
  };
  // Add to payment history
  sub.paymentHistory.push({
    date: now,
    amount: paymentData.amount || 0,
    currency: paymentData.currency || '',
    mpPaymentId: paymentData.mpPaymentId || '',
    method: paymentData.method || 'mercadopago'
  });

  _saveSub(sub);
  return sub;
}

export function renewSubscription(email, paymentData) {
  var sub = getSubscription(email);
  if (!sub) return null;
  var plan = paymentData.plan || sub.plan || 'mensual';
  return activateSubscription(email, plan, paymentData);
}

// ── Payment Link Generation ─────────────────────────────────────────
export async function generatePaymentLink(email, plan) {
  plan = plan || 'mensual';
  var adminCfg = _getAdminConfig();
  var mpCfg = _getMPConfig();
  var accessToken = adminCfg.MP_ACCESS_TOKEN || '';
  if (!accessToken) throw new Error('No hay token de Mercado Pago configurado');

  var prices = getPlanPrices();
  var country = getCountry();
  var currency = country === 'CO' ? 'COP' : 'USD';
  var price = country === 'CO' ? prices[plan].COP : prices[plan].USD;

  var planLabels = { mensual: 'Mensual', trimestral: 'Trimestral (3 meses)', anual: 'Anual (12 meses)' };
  var sandbox = mpCfg.sandbox !== false;

  var body = {
    access_token: accessToken,
    title: 'MiDoctorYa - Suscripcion ' + planLabels[plan],
    description: 'Suscripcion ' + planLabels[plan] + ' a MiDoctorYa',
    price: price,
    currency: currency,
    payer_email: email,
    external_reference: 'sub_' + email + '_' + plan + '_' + Date.now(),
    sandbox: sandbox,
    success_url: window.location.origin + '/?payment=success&plan=' + plan,
    failure_url: window.location.origin + '/?payment=failure',
    pending_url: window.location.origin + '/?payment=pending'
  };

  var resp = await fetch(_getServerBase() + '/api/mp/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  var data = await resp.json();
  if (data.error) throw new Error(data.error);

  var link = sandbox ? (data.sandbox_init_point || data.init_point) : data.init_point;
  return { link: link, preferenceId: data.id, externalReference: data.external_reference };
}

// ── Email Reminders via SendGrid ────────────────────────────────────
async function _sendEmailReminder(email, subject, body) {
  var cfg = _getAdminConfig();
  var apiKey = cfg.SENDGRID_API_KEY;
  if (!apiKey) return;

  var fromEmail = cfg.SENDGRID_FROM_EMAIL || 'noreply@midoctorya.com';

  var htmlBody = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;">' +
    '<div style="background:linear-gradient(135deg,#6366F1,#4F46E5);border-radius:16px;padding:30px;text-align:center;margin-bottom:20px;">' +
      '<h1 style="color:white;font-size:24px;margin:0;">MiDoctor<span style="color:#A5B4FC;">Ya</span></h1>' +
      '<p style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;">Tu bienestar, en tus manos</p>' +
    '</div>' +
    '<div style="background:white;border-radius:16px;padding:24px;border:1px solid #e2e8f0;">' +
      body +
    '</div>' +
    '<p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">MiDoctorYa - Este es un mensaje automatico</p>' +
  '</div>';

  try {
    await fetch(_getServerBase() + '/api/sendgrid/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        from_email: fromEmail,
        to_email: email,
        subject: subject,
        html_body: htmlBody
      })
    });
  } catch(e) {
    console.warn('[Subscription] Email send failed:', e.message);
  }
}

// ── WhatsApp Reminders via UltraMSG ─────────────────────────────────
async function _sendWhatsAppReminder(phone, message) {
  if (!phone) return;
  var cfg = _getAdminConfig();
  var instanceId = cfg.ULTRAMSG_INSTANCE_ID;
  var token = cfg.ULTRAMSG_TOKEN;
  if (!instanceId || !token) return;

  try {
    await fetch(_getServerBase() + '/api/ultramsg/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_id: instanceId,
        token: token,
        to: phone,
        body: message
      })
    });
  } catch(e) {
    console.warn('[Subscription] WhatsApp send failed:', e.message);
  }
}

// ── Send Reminder (both channels) ───────────────────────────────────
async function _sendReminder(email, phone, subject, emailBody, waMessage, paymentLink) {
  var cfg = _getSubConfig();

  if (paymentLink) {
    emailBody += '<div style="text-align:center;margin-top:20px;">' +
      '<a href="' + paymentLink + '" style="display:inline-block;background:linear-gradient(135deg,#6366F1,#4F46E5);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">Renovar Suscripcion</a>' +
    '</div>';
    waMessage += '\n\nRenueva aqui: ' + paymentLink;
  }

  if (cfg.emailReminders) {
    await _sendEmailReminder(email, subject, emailBody);
  }
  if (cfg.whatsappReminders) {
    await _sendWhatsAppReminder(phone, waMessage);
  }
}

// ── Process Reminders ───────────────────────────────────────────────
export async function processReminders() {
  var user = _getCurrentUser();
  if (!user.email) return;
  var sub = getSubscription(user.email);
  if (!sub) return;
  if (sub.status === 'deleted') return;

  var now = new Date().toISOString();
  var cfg = _getSubConfig();
  var phone = user.phone || localStorage.getItem('dya_phone') || '';
  var paymentLink = null;

  // Helper to generate link only once per processReminders call
  async function _getPaymentLink() {
    if (paymentLink === null) {
      try {
        var result = await generatePaymentLink(user.email, sub.plan);
        paymentLink = result.link || '';
      } catch(e) {
        paymentLink = '';
      }
    }
    return paymentLink;
  }

  var expiresAt = sub.expiresAt || sub.trialEndsAt;
  if (!expiresAt) return;

  var daysToExpiry = _daysBetween(now, expiresAt);

  // Pre-expiry reminders
  if (sub.status === 'active' || sub.status === 'trial') {
    if (daysToExpiry <= 7 && daysToExpiry > 3 && !sub.reminders.day7) {
      sub.reminders.day7 = true;
      _saveSub(sub);
      await _sendReminder(user.email, phone,
        'Tu suscripcion vence en 7 dias - MiDoctorYa',
        '<h2 style="color:#1e293b;font-size:18px;">Tu suscripcion vence pronto</h2>' +
        '<p style="color:#64748b;">Tu suscripcion a MiDoctorYa vence en <strong>7 dias</strong>. Renueva para seguir disfrutando de todos los beneficios.</p>',
        'MiDoctorYa: Tu suscripcion vence en 7 dias. Renueva para seguir usando la app.',
        null
      );
    }
    if (daysToExpiry <= 3 && daysToExpiry > 2 && !sub.reminders.day3) {
      sub.reminders.day3 = true;
      _saveSub(sub);
      await _sendReminder(user.email, phone,
        'Tu suscripcion vence en 3 dias - MiDoctorYa',
        '<h2 style="color:#1e293b;font-size:18px;">Quedan 3 dias</h2>' +
        '<p style="color:#64748b;">Tu suscripcion a MiDoctorYa vence en <strong>3 dias</strong>. Renueva ahora para no perder acceso.</p>',
        'MiDoctorYa: Tu suscripcion vence en 3 dias, renueva ahora.',
        null
      );
    }
    if (daysToExpiry <= 2 && daysToExpiry > 1 && !sub.reminders.day2) {
      sub.reminders.day2 = true;
      _saveSub(sub);
      var link2 = await _getPaymentLink();
      await _sendReminder(user.email, phone,
        'Tu suscripcion vence en 2 dias - MiDoctorYa',
        '<h2 style="color:#1e293b;font-size:18px;">Quedan solo 2 dias</h2>' +
        '<p style="color:#64748b;">Tu suscripcion vence en <strong>2 dias</strong>. Renueva ahora para mantener tu acceso.</p>',
        'MiDoctorYa: Tu suscripcion vence en 2 dias.',
        link2
      );
    }
    if (daysToExpiry <= 1 && daysToExpiry > 0 && !sub.reminders.day1) {
      sub.reminders.day1 = true;
      _saveSub(sub);
      var link1 = await _getPaymentLink();
      await _sendReminder(user.email, phone,
        'Manana vence tu suscripcion - MiDoctorYa',
        '<h2 style="color:#ea580c;font-size:18px;">Manana vence tu suscripcion</h2>' +
        '<p style="color:#64748b;">Tu acceso a MiDoctorYa se suspende manana. Renueva ahora para no interrumpir tu uso.</p>',
        'MiDoctorYa: Manana vence tu suscripcion. Renueva ahora.',
        link1
      );
    }
  }

  // Day of expiry
  if (daysToExpiry <= 0 && !sub.reminders.expired && (sub.status === 'expired' || sub.status === 'grace')) {
    sub.reminders.expired = true;
    _saveSub(sub);
    var linkExp = await _getPaymentLink();
    await _sendReminder(user.email, phone,
      'Tu suscripcion ha vencido - MiDoctorYa',
      '<h2 style="color:#dc2626;font-size:18px;">Tu suscripcion ha vencido</h2>' +
      '<p style="color:#64748b;">Tu suscripcion a MiDoctorYa ha vencido. Renueva para seguir usando todas las funcionalidades.</p>',
      'MiDoctorYa: Tu suscripcion ha vencido. Renueva para seguir usando MiDoctorYa.',
      linkExp
    );
  }

  // Grace period reminders
  if (sub.status === 'grace' || sub.status === 'expired') {
    var graceEnd = sub.gracePeriodEndsAt;
    if (graceEnd) {
      var graceDaysLeft = _daysBetween(now, graceEnd);
      if (graceDaysLeft <= 5 && graceDaysLeft > 3 && !sub.reminders.grace5) {
        sub.reminders.grace5 = true;
        _saveSub(sub);
        var linkG5 = await _getPaymentLink();
        await _sendReminder(user.email, phone,
          'Periodo de gracia: quedan 5 dias - MiDoctorYa',
          '<h2 style="color:#ea580c;font-size:18px;">Periodo de gracia</h2>' +
          '<p style="color:#64748b;">Tienes <strong>5 dias</strong> de gracia restantes. Despues de eso se bloqueara tu acceso.</p>',
          'MiDoctorYa: Periodo de gracia, quedan 5 dias. Renueva para no perder acceso.',
          linkG5
        );
      }
      if (graceDaysLeft <= 3 && graceDaysLeft > 1 && !sub.reminders.grace3) {
        sub.reminders.grace3 = true;
        _saveSub(sub);
        var linkG3 = await _getPaymentLink();
        await _sendReminder(user.email, phone,
          'URGENTE: quedan 3 dias de gracia - MiDoctorYa',
          '<h2 style="color:#dc2626;font-size:18px;">Solo quedan 3 dias</h2>' +
          '<p style="color:#64748b;">Tu periodo de gracia termina en <strong>3 dias</strong>. Renueva ahora o perderas acceso.</p>',
          'URGENTE MiDoctorYa: Solo quedan 3 dias de gracia. Renueva ahora!',
          linkG3
        );
      }
      if (graceDaysLeft <= 1 && graceDaysLeft > 0 && !sub.reminders.grace1) {
        sub.reminders.grace1 = true;
        _saveSub(sub);
        var linkG1 = await _getPaymentLink();
        await _sendReminder(user.email, phone,
          'ULTIMO DIA de gracia - MiDoctorYa',
          '<h2 style="color:#dc2626;font-size:18px;">Ultimo dia de gracia</h2>' +
          '<p style="color:#64748b;">Hoy es tu <strong>ultimo dia</strong> de gracia. Manana se bloqueara tu cuenta.</p>',
          'ULTIMO DIA MiDoctorYa: Manana se bloquea tu cuenta. Renueva ahora!',
          linkG1
        );
      }
    }
  }

  // Deletion warnings
  if (sub.status === 'blocked' && sub.deletionDate) {
    var daysUntilDeletion = _daysBetween(now, sub.deletionDate);
    if (daysUntilDeletion <= 7 && daysUntilDeletion > 3 && !sub.reminders.deleteWarning7) {
      sub.reminders.deleteWarning7 = true;
      _saveSub(sub);
      var linkD7 = await _getPaymentLink();
      await _sendReminder(user.email, phone,
        'Tu cuenta sera eliminada en 7 dias - MiDoctorYa',
        '<h2 style="color:#dc2626;font-size:18px;">Cuenta en riesgo de eliminacion</h2>' +
        '<p style="color:#64748b;">Tu cuenta y todos tus datos seran eliminados permanentemente en <strong>7 dias</strong>. Renueva ahora para conservar tu informacion.</p>',
        'MiDoctorYa: Tu cuenta sera eliminada en 7 dias. Renueva para conservar tus datos.',
        linkD7
      );
    }
    if (daysUntilDeletion <= 3 && daysUntilDeletion > 1 && !sub.reminders.deleteWarning3) {
      sub.reminders.deleteWarning3 = true;
      _saveSub(sub);
      var linkD3 = await _getPaymentLink();
      await _sendReminder(user.email, phone,
        'URGENTE: Tu cuenta se elimina en 3 dias - MiDoctorYa',
        '<h2 style="color:#dc2626;font-size:18px;">3 dias para eliminacion</h2>' +
        '<p style="color:#64748b;">En <strong>3 dias</strong> tu cuenta y todos tus datos de salud seran eliminados permanentemente.</p>',
        'URGENTE MiDoctorYa: Tu cuenta se elimina en 3 dias! Renueva ahora.',
        linkD3
      );
    }
    if (daysUntilDeletion <= 1 && daysUntilDeletion > 0 && !sub.reminders.deleteWarning1) {
      sub.reminders.deleteWarning1 = true;
      _saveSub(sub);
      var linkD1 = await _getPaymentLink();
      await _sendReminder(user.email, phone,
        'ULTIMO DIA - Tu cuenta sera eliminada manana - MiDoctorYa',
        '<h2 style="color:#dc2626;font-size:18px;">ULTIMO DIA</h2>' +
        '<p style="color:#64748b;">Tu cuenta sera eliminada <strong>manana</strong>. Esta es tu ultima oportunidad para renovar y conservar tus datos.</p>',
        'ULTIMO DIA MiDoctorYa: Tu cuenta sera eliminada MANANA. Renueva ahora o perderas todo.',
        linkD1
      );
    }
  }
}

// ── Cleanup Expired Accounts ────────────────────────────────────────
export function cleanupExpiredAccounts() {
  var user = _getCurrentUser();
  if (!user.email) return;
  var sub = getSubscription(user.email);
  if (!sub) return;
  if (sub.status !== 'blocked' && sub.status !== 'deleted') return;

  if (sub.deletionDate) {
    var daysUntilDeletion = _daysBetween(new Date().toISOString(), sub.deletionDate);
    if (daysUntilDeletion <= 0) {
      // Delete user data
      var email = sub.email;
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.includes(email) && k !== _subKey(email)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

      sub.status = 'deleted';
      _saveSub(sub);

      // Remove from admin users list
      try {
        var users = JSON.parse(localStorage.getItem('dya_admin_users') || '[]');
        users = users.filter(function(u) { return u.email !== email; });
        localStorage.setItem('dya_admin_users', JSON.stringify(users));
      } catch(e) { /* ignore */ }
    }
  }
}

// ── Block Screen ────────────────────────────────────────────────────
export function renderBlockScreen(container) {
  var user = _getCurrentUser();
  var sub = getSubscription(user.email);
  if (!sub) return;

  var status = checkSubscriptionStatus();
  var prices = getPlanPrices();
  var country = getCountry();
  var isCO = country === 'CO';
  var currSymbol = isCO ? 'COP $' : 'USD $';

  var daysUntilDeletion = status.daysLeft || 0;
  var daysSinceExpiry = status.daysSinceExpiry || 0;

  function _formatPrice(n) {
    return n.toLocaleString('es-CO');
  }

  var html = '<div id="subscription-block-overlay" style="position:fixed;inset:0;z-index:180;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;overflow-y:auto;">' +
    '<div style="max-width:400px;width:100%;text-align:center;">' +
      // Logo
      '<div style="width:72px;height:72px;margin:0 auto 16px;border-radius:20px;background:linear-gradient(135deg,#6366F1,#4F46E5);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(99,102,241,0.4);">' +
        '<svg style="width:36px;height:36px;color:white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' +
      '</div>' +
      '<h1 style="color:white;font-size:24px;font-weight:800;margin:0;">MiDoctor<span style="color:#A5B4FC;">Ya</span></h1>' +
      '<div style="margin-top:24px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:20px;">' +
        '<p style="color:#fca5a5;font-size:18px;font-weight:700;margin:0 0 8px;">Tu suscripcion ha vencido</p>' +
        '<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">Hace ' + daysSinceExpiry + ' dias que tu suscripcion expiro.</p>' +
      '</div>' +
      // Warning
      '<div style="margin-top:16px;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:12px;padding:14px;">' +
        '<p style="color:#fbbf24;font-size:12px;margin:0;font-weight:600;">Si no renuevas en ' + daysUntilDeletion + ' dias, tu cuenta y datos seran eliminados permanentemente.</p>' +
      '</div>' +
      // Plan selection
      '<div style="margin-top:24px;text-align:left;">' +
        '<p style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:12px;font-weight:600;">Selecciona tu plan:</p>' +
        '<div id="sub-plan-options" style="display:flex;flex-direction:column;gap:8px;">' +
          _planOptionHTML('mensual', 'Mensual', currSymbol + _formatPrice(isCO ? prices.mensual.COP : prices.mensual.USD), '', true) +
          _planOptionHTML('trimestral', 'Trimestral', currSymbol + _formatPrice(isCO ? prices.trimestral.COP : prices.trimestral.USD), 'Ahorra ' + _getSubConfig().discountTrimestral + '%', false) +
          _planOptionHTML('anual', 'Anual', currSymbol + _formatPrice(isCO ? prices.anual.COP : prices.anual.USD), 'Ahorra ' + _getSubConfig().discountAnual + '%', false) +
        '</div>' +
      '</div>' +
      // Promo code input
      '<div style="margin-top:16px;">' +
        '<p style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:6px;">Tienes un codigo promocional?</p>' +
        '<div style="display:flex;gap:8px;">' +
          '<input type="text" id="sub-promo-input" placeholder="Ej: MEDICO30" style="flex:1;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:white;font-size:14px;text-transform:uppercase;" maxlength="20">' +
          '<button id="sub-promo-apply" style="padding:12px 18px;border-radius:12px;background:#10B981;color:white;font-weight:700;font-size:13px;border:none;cursor:pointer;">Aplicar</button>' +
        '</div>' +
        '<p id="sub-promo-message" style="font-size:11px;margin-top:6px;color:rgba(255,255,255,0.4);"></p>' +
      '</div>' +
      // Pay button
      '<button id="sub-block-pay-btn" style="margin-top:20px;width:100%;padding:16px;border-radius:14px;background:linear-gradient(135deg,#6366F1,#4F46E5);color:white;font-weight:700;font-size:15px;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(99,102,241,0.4);">Renovar Suscripcion</button>' +
      '<p id="sub-block-loading" style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:8px;display:none;">Generando enlace de pago...</p>' +
      // WhatsApp support
      '<a href="https://wa.me/573001234567?text=Hola%20necesito%20ayuda%20con%20mi%20suscripcion%20MiDoctorYa" target="_blank" style="display:inline-block;margin-top:16px;color:#22c55e;font-size:13px;text-decoration:none;font-weight:600;">Necesitas ayuda? Escribenos por WhatsApp</a>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;
  document.body.appendChild(container);

  // Plan selection
  var selectedPlan = 'mensual';
  container.querySelectorAll('.sub-plan-radio').forEach(function(radio) {
    radio.onclick = function() {
      selectedPlan = radio.dataset.plan;
      container.querySelectorAll('.sub-plan-card').forEach(function(card) {
        card.style.border = card.dataset.plan === selectedPlan ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)';
        card.style.background = card.dataset.plan === selectedPlan ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)';
      });
    };
  });

  // Pay button
  container.querySelector('#sub-block-pay-btn').onclick = async function() {
    var loadEl = container.querySelector('#sub-block-loading');
    loadEl.style.display = 'block';
    loadEl.textContent = 'Generando enlace de pago...';
    try {
      var result = await generatePaymentLink(user.email, selectedPlan);
      if (result.link) {
        window.open(result.link, '_blank');
        loadEl.textContent = 'Redirigiendo a Mercado Pago...';
      } else {
        loadEl.textContent = 'Error: no se pudo generar el enlace.';
      }
    } catch(e) {
      loadEl.textContent = 'Error: ' + e.message;
    }
  };

  // Promo code apply button
  var promoBtn = document.getElementById('sub-promo-apply');
  if (promoBtn) {
    promoBtn.onclick = function() {
      var input = document.getElementById('sub-promo-input');
      var msgEl = document.getElementById('sub-promo-message');
      if (!input || !input.value.trim()) return;
      var result = redeemPromoCode(user.email, input.value.trim());
      if (result.valid) {
        msgEl.style.color = '#22c55e';
        msgEl.textContent = result.message;
        setTimeout(function() { window.location.reload(); }, 1500);
      } else {
        msgEl.style.color = '#ef4444';
        msgEl.textContent = result.error;
      }
    };
  }

  // Anti-tampering: re-render if removed
  var _antiTamperInterval = setInterval(function() {
    var overlay = document.getElementById('subscription-block-overlay');
    if (!overlay) {
      // Re-check status
      var st = checkSubscriptionStatus();
      if (!st.allowed) {
        renderBlockScreen(container);
      } else {
        clearInterval(_antiTamperInterval);
      }
    }
  }, 1000);
}

function _planOptionHTML(planId, label, priceText, discount, selected) {
  var border = selected ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)';
  var bg = selected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)';
  return '<div class="sub-plan-card sub-plan-radio" data-plan="' + planId + '" style="border:' + border + ';background:' + bg + ';border-radius:12px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
    '<div>' +
      '<p style="color:white;font-size:14px;font-weight:700;margin:0;">' + label + (discount ? ' <span style="color:#22c55e;font-size:11px;font-weight:600;">' + discount + '</span>' : '') + '</p>' +
    '</div>' +
    '<p style="color:#A5B4FC;font-size:14px;font-weight:700;margin:0;">' + priceText + '</p>' +
  '</div>';
}

// ── Promo Codes ────────────────────────────────────────────────────
function _getPromoCodes() {
  try { return JSON.parse(localStorage.getItem('dya_promo_codes') || '[]'); } catch(e) { return []; }
}

function _savePromoCodes(codes) {
  localStorage.setItem('dya_promo_codes', JSON.stringify(codes));
}

export function createPromoCode(code, config) {
  // config: { trialDays, discountPercent, maxUses, expiresAt, createdBy, createdByType, description }
  var codes = _getPromoCodes();
  // Check if code already exists
  var existing = codes.find(function(c) { return c.code.toUpperCase() === code.toUpperCase(); });
  if (existing) return { error: 'Codigo ya existe' };

  codes.push({
    code: code.toUpperCase(),
    trialDays: config.trialDays || 7,
    discountPercent: config.discountPercent || 0,
    maxUses: config.maxUses || 100,
    currentUses: 0,
    expiresAt: config.expiresAt || null,
    createdBy: config.createdBy || 'admin',
    createdByType: config.createdByType || 'admin',
    description: config.description || '',
    active: true,
    createdAt: new Date().toISOString()
  });
  _savePromoCodes(codes);
  return { success: true };
}

export function validatePromoCode(code) {
  if (!code) return { valid: false, error: 'Codigo vacio' };
  var codes = _getPromoCodes();
  var found = codes.find(function(c) { return c.code.toUpperCase() === code.toUpperCase() && c.active; });
  if (!found) return { valid: false, error: 'Codigo invalido o inactivo' };
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) return { valid: false, error: 'Codigo expirado' };
  if (found.currentUses >= found.maxUses) return { valid: false, error: 'Codigo agotado' };
  return { valid: true, code: found };
}

export function redeemPromoCode(email, code) {
  var validation = validatePromoCode(code);
  if (!validation.valid) return validation;

  var promoCode = validation.code;
  var sub = getSubscription(email);
  if (!sub) sub = initSubscription(email);

  // Check if user already used this code
  var usedCodes = sub.usedPromoCodes || [];
  if (usedCodes.indexOf(promoCode.code) !== -1) return { valid: false, error: 'Ya usaste este codigo' };

  // Apply promo
  if (promoCode.trialDays && promoCode.trialDays > 0) {
    var now = new Date().toISOString();
    if (sub.status === 'trial') {
      // Extend existing trial
      sub.trialEndsAt = _addDays(now, promoCode.trialDays);
      sub.expiresAt = sub.trialEndsAt;
      sub.nextPaymentDue = sub.trialEndsAt;
    } else if (sub.status === 'blocked' || sub.status === 'expired' || sub.status === 'grace') {
      // Reactivate with new trial
      sub.status = 'trial';
      sub.startDate = now;
      sub.trialEndsAt = _addDays(now, promoCode.trialDays);
      sub.expiresAt = sub.trialEndsAt;
      sub.nextPaymentDue = sub.trialEndsAt;
      sub.gracePeriodEndsAt = '';
      sub.deletionDate = '';
      sub.reminders = {
        day7: false, day3: false, day2: false, day1: false,
        expired: false, grace5: false, grace3: false, grace1: false,
        deleteWarning7: false, deleteWarning3: false, deleteWarning1: false
      };
    } else {
      // New trial or other state
      sub.status = 'trial';
      sub.startDate = now;
      sub.trialEndsAt = _addDays(now, promoCode.trialDays);
      sub.expiresAt = sub.trialEndsAt;
    }
  }

  // Track usage
  if (!sub.usedPromoCodes) sub.usedPromoCodes = [];
  sub.usedPromoCodes.push(promoCode.code);
  sub.promoDiscount = promoCode.discountPercent || 0;
  _saveSub(sub);

  // Increment usage count
  var codes = _getPromoCodes();
  var idx = codes.findIndex(function(c) { return c.code === promoCode.code; });
  if (idx !== -1) {
    codes[idx].currentUses++;
    _savePromoCodes(codes);
  }

  return { valid: true, message: 'Codigo aplicado! ' + (promoCode.trialDays ? promoCode.trialDays + ' dias de prueba activados.' : promoCode.discountPercent + '% de descuento aplicado.') };
}

export function deactivatePromoCode(code) {
  var codes = _getPromoCodes();
  var idx = codes.findIndex(function(c) { return c.code.toUpperCase() === code.toUpperCase(); });
  if (idx === -1) return false;
  codes[idx].active = false;
  _savePromoCodes(codes);
  return true;
}

export function listPromoCodes() {
  return _getPromoCodes();
}

// ── One-Time Payment Generation ────────────────────────────────────
export async function generateOneTimePayment(email, amount, description, currency) {
  var adminCfg = _getAdminConfig();
  var mpCfg = _getMPConfig();
  var accessToken = adminCfg.MP_ACCESS_TOKEN || '';
  if (!accessToken) throw new Error('No hay token de Mercado Pago configurado');

  currency = currency || (getCountry() === 'CO' ? 'COP' : 'USD');
  description = description || 'Cobro MiDoctorYa';
  var sandbox = mpCfg.sandbox !== false;

  var body = {
    access_token: accessToken,
    title: description,
    description: description,
    price: amount,
    currency: currency,
    payer_email: email,
    external_reference: 'otp_' + email + '_' + Date.now(),
    sandbox: sandbox,
    success_url: window.location.origin + '/?payment=success&type=onetime',
    failure_url: window.location.origin + '/?payment=failure&type=onetime',
    pending_url: window.location.origin + '/?payment=pending&type=onetime'
  };

  var resp = await fetch(_getServerBase() + '/api/mp/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  var data = await resp.json();
  if (data.error) throw new Error(data.error);

  var link = sandbox ? (data.sandbox_init_point || data.init_point) : data.init_point;
  return { link: link, preferenceId: data.id, externalReference: data.external_reference };
}

// ── Subscription Info Card ──────────────────────────────────────────
export function renderSubscriptionInfo() {
  var user = _getCurrentUser();
  var sub = getSubscription(user.email);
  if (!sub) return '';

  var statusLabels = {
    active: 'Activa',
    trial: 'Periodo de Prueba',
    expired: 'Vencida',
    grace: 'Periodo de Gracia',
    blocked: 'Bloqueada',
    deleted: 'Eliminada'
  };
  var statusColors = {
    active: 'bg-emerald-100 text-emerald-700',
    trial: 'bg-blue-100 text-blue-700',
    expired: 'bg-amber-100 text-amber-700',
    grace: 'bg-orange-100 text-orange-700',
    blocked: 'bg-red-100 text-red-700',
    deleted: 'bg-gray-100 text-gray-500'
  };

  var planLabels = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };
  var stLabel = statusLabels[sub.status] || sub.status;
  var stColor = statusColors[sub.status] || 'bg-gray-100 text-gray-500';
  var planLabel = planLabels[sub.plan] || sub.plan;

  var expiresDate = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('es-CO') : '-';

  var renewBtnHtml = '';
  if (sub.status !== 'active' || _daysBetween(new Date().toISOString(), sub.expiresAt) <= 7) {
    renewBtnHtml = '<button id="sub-info-renew-btn" class="mt-3 w-full py-2.5 rounded-xl gradient-primary text-white text-xs font-bold shadow-lg shadow-primary/30">Renovar Suscripcion</button>';
  }

  return '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style="animation-delay:20ms">' +
    '<div class="flex items-center justify-between mb-3">' +
      '<h3 class="font-bold text-sm text-gray-800">Suscripcion</h3>' +
      '<span class="text-[10px] px-2.5 py-1 rounded-full font-bold ' + stColor + '">' + stLabel + '</span>' +
    '</div>' +
    '<div class="space-y-2">' +
      '<div class="flex justify-between"><span class="text-xs text-gray-400">Plan</span><span class="text-xs font-semibold text-gray-700">' + planLabel + '</span></div>' +
      '<div class="flex justify-between"><span class="text-xs text-gray-400">Vence</span><span class="text-xs font-semibold text-gray-700">' + expiresDate + '</span></div>' +
      (sub.lastPaymentDate ? '<div class="flex justify-between"><span class="text-xs text-gray-400">Ultimo pago</span><span class="text-xs font-semibold text-gray-700">' + new Date(sub.lastPaymentDate).toLocaleDateString('es-CO') + '</span></div>' : '') +
    '</div>' +
    renewBtnHtml +
  '</div>';
}
