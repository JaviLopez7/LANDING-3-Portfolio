/* ============================================================
   TASKFLOW — auth.js
   Módulo de autenticación: register, login, logout, session
   Persistencia: localStorage
   ============================================================ */

const Auth = (() => {

  /* ─── CLAVES localStorage ─── */
  const KEYS = {
    USERS:   'tf_users',
    SESSION: 'tf_session',
  };

  /* ─── HELPERS ─── */

  // Obtiene todos los usuarios registrados
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
    } catch { return []; }
  }

  // Guarda el array de usuarios
  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  // Hash muy básico (no criptográfico — suficiente para demo)
  function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const chr = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `hashed_${Math.abs(hash)}_${password.length}`;
  }

  // Genera un ID único
  function generateId() {
    return 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ─── REGISTER ─── */
  function register({ firstName, lastName, email, password }) {
    const users = getUsers();

    // Validaciones
    if (!firstName || !lastName || !email || !password) {
      return { ok: false, error: 'Todos los campos son requeridos.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'El email no es válido.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Ya existe una cuenta con ese email.' };
    }

    const newUser = {
      id:        generateId(),
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.toLowerCase().trim(),
      password:  hashPassword(password),
      role:      'user',
      plan:      'free',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    // Auto-login tras registro
    const session = createSession(newUser);
    return { ok: true, user: sanitize(newUser), session };
  }

  /* ─── LOGIN ─── */
  function login({ email, password }) {
    if (!email || !password) {
      return { ok: false, error: 'Email y contraseña son requeridos.' };
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return { ok: false, error: 'No encontramos una cuenta con ese email.' };
    }
    if (user.password !== hashPassword(password)) {
      return { ok: false, error: 'Contraseña incorrecta. Intentá de nuevo.' };
    }

    const session = createSession(user);
    return { ok: true, user: sanitize(user), session };
  }

  /* ─── LOGOUT ─── */
  function logout() {
    localStorage.removeItem(KEYS.SESSION);
  }

  /* ─── SESSION ─── */
  function createSession(user) {
    const session = {
      userId:    user.id,
      email:     user.email,
      firstName: user.firstName,
      lastName:  user.lastName,
      role:      user.role,
      plan:      user.plan,
      token:     'tok_' + Math.random().toString(36).slice(2),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
    };
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      const session = JSON.parse(localStorage.getItem(KEYS.SESSION));
      if (!session) return null;
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(KEYS.SESSION);
        return null;
      }
      return session;
    } catch { return null; }
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  /* ─── UPDATE PROFILE ─── */
  function updateProfile({ firstName, lastName }) {
    const session = getSession();
    if (!session) return { ok: false, error: 'Sesión inválida.' };

    const users = getUsers();
    const idx = users.findIndex(u => u.id === session.userId);
    if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };

    if (!firstName || !lastName) return { ok: false, error: 'Nombre y apellido son requeridos.' };

    users[idx].firstName = firstName.trim();
    users[idx].lastName  = lastName.trim();
    saveUsers(users);

    // Actualizar sesión
    const updated = { ...session, firstName: firstName.trim(), lastName: lastName.trim() };
    localStorage.setItem(KEYS.SESSION, JSON.stringify(updated));

    return { ok: true, user: sanitize(users[idx]) };
  }

  /* ─── CHANGE PASSWORD ─── */
  function changePassword({ currentPassword, newPassword }) {
    const session = getSession();
    if (!session) return { ok: false, error: 'Sesión inválida.' };

    const users = getUsers();
    const idx = users.findIndex(u => u.id === session.userId);
    if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };

    if (users[idx].password !== hashPassword(currentPassword)) {
      return { ok: false, error: 'La contraseña actual es incorrecta.' };
    }
    if (newPassword.length < 6) {
      return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    users[idx].password = hashPassword(newPassword);
    saveUsers(users);
    return { ok: true };
  }

  /* ─── SANITIZE (no exponer password hash) ─── */
  function sanitize(user) {
    const { password, ...safe } = user;
    return safe;
  }

  /* ─── PUBLIC API ─── */
  return { register, login, logout, getSession, isLoggedIn, updateProfile, changePassword };

})();
