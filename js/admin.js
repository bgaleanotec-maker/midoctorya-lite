/* ── Admin Panel — MiDoctorYa Lite ────────────────────────────────── */
import { showToast } from './app.js';

const ADMIN_PIN = '2835'; // Simple PIN for admin access

function _getUsers() {
  // In a real app this would be server-side. For now, simulate with localStorage
  return JSON.parse(localStorage.getItem('dya_admin_users') || '[]');
}
function _saveUsers(users) { localStorage.setItem('dya_admin_users', JSON.stringify(users)); }

// Track user activity
export function trackUserActivity() {
  const user = JSON.parse(localStorage.getItem('dya_user') || '{}');
  if (!user.email) return;
  const users = _getUsers();
  const existing = users.find(u => u.email === user.email);
  const now = new Date().toISOString();
  if (existing) {
    existing.lastActive = now;
    existing.name = user.name;
    existing.phone = user.phone || localStorage.getItem('dya_phone') || '';
    existing.birthdate = user.birthdate || '';
    existing.sessions = (existing.sessions || 0) + 1;
  } else {
    users.push({
      email: user.email, name: user.name, phone: user.phone || localStorage.getItem('dya_phone') || '',
      birthdate: user.birthdate || '', registeredAt: now, lastActive: now,
      sessions: 1, status: 'active'
    });
  }
  _saveUsers(users);
}

export function renderAdmin(container) {
  // First show PIN entry
  container.innerHTML = `
    <div class="gradient-navy text-white px-5 pt-12 pb-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <p class="text-xs text-white/40 mb-1">MiDoctorYa</p>
      <h1 class="text-2xl font-bold">Panel de Administraci&oacute;n</h1>
      <p class="text-sm text-white/50 mt-1">Gesti&oacute;n de usuarios y configuraci&oacute;n</p>
    </div>
    <div class="px-4 -mt-4">
      <div id="admin-auth" class="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">&#x1F510;</div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">Acceso Restringido</h3>
        <p class="text-sm text-gray-400 mb-4">Ingresa el PIN de administrador</p>
        <input type="password" id="admin-pin" maxlength="4" class="w-32 mx-auto block text-center text-2xl tracking-[0.5em] bg-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-300 border border-gray-200" placeholder="····">
        <button id="admin-login" class="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm shadow-lg active:scale-[0.98] transition">Acceder</button>
        <p id="admin-error" class="text-red-500 text-xs mt-2 hidden">PIN incorrecto</p>
      </div>
    </div>
  `;

  container.querySelector('#admin-login').onclick = () => {
    const pin = container.querySelector('#admin-pin').value;
    if (pin === ADMIN_PIN) {
      _renderDashboard(container);
    } else {
      container.querySelector('#admin-error').classList.remove('hidden');
      container.querySelector('#admin-pin').value = '';
    }
  };
  container.querySelector('#admin-pin').onkeydown = (e) => {
    if (e.key === 'Enter') container.querySelector('#admin-login').click();
  };
}

function _renderDashboard(container) {
  const users = _getUsers();
  const active = users.filter(u => u.status === 'active');
  const inactive = users.filter(u => u.status !== 'active');
  const today = new Date().toISOString().split('T')[0];
  const todayActive = users.filter(u => u.lastActive && u.lastActive.startsWith(today));

  container.innerHTML = `
    <div class="gradient-navy text-white px-5 pt-12 pb-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-white/40 mb-1">MiDoctorYa Admin</p>
          <h1 class="text-xl font-bold">Dashboard</h1>
        </div>
        <button id="admin-logout" class="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs font-semibold">Salir</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="px-4 -mt-4 mb-4">
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
          <p class="text-2xl font-black text-indigo-600">${users.length}</p>
          <p class="text-[9px] text-gray-400 uppercase font-semibold">Total Usuarios</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
          <p class="text-2xl font-black text-emerald-600">${active.length}</p>
          <p class="text-[9px] text-gray-400 uppercase font-semibold">Activos</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
          <p class="text-2xl font-black text-amber-600">${todayActive.length}</p>
          <p class="text-[9px] text-gray-400 uppercase font-semibold">Hoy</p>
        </div>
      </div>
    </div>

    <!-- Users List -->
    <div class="px-4 mb-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">Usuarios Registrados</h3>
        <span class="text-xs text-gray-400">${users.length} total</span>
      </div>
    </div>
    <div class="px-4 space-y-2 pb-8" id="users-list">
      ${users.length === 0 ? '<p class="text-center py-8 text-gray-300 text-sm">No hay usuarios registrados a\u00FAn</p>' :
        users.map((u, i) => `
          <div class="bg-white rounded-xl shadow-sm border ${u.status === 'active' ? 'border-gray-100' : 'border-red-100 bg-red-50/30'} p-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl ${u.status === 'active' ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gray-300'} flex items-center justify-center text-white font-bold text-sm">
                ${(u.name || 'U')[0].toUpperCase()}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-800">${u.name || 'Sin nombre'}</p>
                <p class="text-[10px] text-gray-400">${u.email}</p>
                <div class="flex gap-3 mt-1">
                  ${u.phone ? `<span class="text-[9px] text-gray-400">&#x1F4F1; ${u.phone}</span>` : ''}
                  <span class="text-[9px] text-gray-400">&#x1F4CA; ${u.sessions || 0} sesiones</span>
                  ${u.lastActive ? `<span class="text-[9px] text-gray-400">&#x1F550; ${u.lastActive.split('T')[0]}</span>` : ''}
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <button class="toggle-user text-[9px] px-2 py-1 rounded-lg font-bold ${u.status === 'active' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}" data-i="${i}">
                  ${u.status === 'active' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
    </div>
  `;

  container.querySelector('#admin-logout').onclick = () => renderAdmin(container);
  container.querySelectorAll('.toggle-user').forEach(btn => {
    btn.onclick = () => {
      const users = _getUsers();
      const i = parseInt(btn.dataset.i);
      users[i].status = users[i].status === 'active' ? 'suspended' : 'active';
      _saveUsers(users);
      showToast(users[i].status === 'active' ? 'Usuario activado' : 'Usuario desactivado');
      _renderDashboard(container);
    };
  });
}
