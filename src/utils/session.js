// ============================================================
// Session utility — prototype access gate (no real backend)
// Keys : authSession, userRole, lastActiveAt, activePage
// Rule : reload < 5 minutes  -> stay signed in, restore page
//        reload >= 5 minutes -> require re-login
// ============================================================

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const KEYS = {
  auth: 'authSession',
  role: 'userRole',
  lastActive: 'lastActiveAt',
  page: 'activePage',
};

export const ROLES = {
  admin: { id: 'admin', label: 'Admin ISE', short: 'Admin' },
  staff: { id: 'staff', label: 'Staff ISE', short: 'Staff' },
  viewer: { id: 'viewer', label: 'Viewer / Atasan', short: 'Viewer' },
};

// NOTE (Tahap 2): startSession akan dipanggil setelah validasi
// kredensial ke /api/auth (Vercel Postgres). Untuk Tahap 1 gate
// tetap client-side agar navigasi & build berjalan.

const safeGet = (k) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k, v) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* storage unavailable — prototype continues in memory */
  }
};
const safeRemove = (k) => {
  try {
    window.localStorage.removeItem(k);
  } catch {
    /* noop */
  }
};

export function startSession(roleId, defaultPage = 'overview') {
  const now = Date.now();
  safeSet(KEYS.auth, 'active');
  safeSet(KEYS.role, roleId);
  safeSet(KEYS.lastActive, String(now));
  if (!safeGet(KEYS.page)) safeSet(KEYS.page, defaultPage);
}

export function touchSession() {
  if (safeGet(KEYS.auth) === 'active') {
    safeSet(KEYS.lastActive, String(Date.now()));
  }
}

export function setActivePage(pageId) {
  safeSet(KEYS.page, pageId);
  touchSession();
}

export function getActivePage(fallback = 'overview') {
  return safeGet(KEYS.page) || fallback;
}

export function getRole() {
  const id = safeGet(KEYS.role);
  return ROLES[id] || null;
}

/**
 * Returns a valid session { role, page } if the last activity
 * happened less than 5 minutes ago; otherwise clears and returns null.
 */
export function restoreSession() {
  const auth = safeGet(KEYS.auth);
  const last = Number(safeGet(KEYS.lastActive) || 0);
  const role = safeGet(KEYS.role);

  if (auth !== 'active' || !role || !ROLES[role]) return null;

  const elapsed = Date.now() - last;
  if (elapsed >= SESSION_TIMEOUT_MS) {
    // Session expired — force re-login, keep nothing.
    clearSession();
    return null;
  }
  touchSession();
  return { role: ROLES[role], page: getActivePage() };
}

export function clearSession() {
  Object.values(KEYS).forEach(safeRemove);
}

export const SESSION_TIMEOUT_MINUTES = 5;
