/* ============================================================
   TASKFLOW — app.js
   Lógica principal: CRUD de proyectos, router de vistas, UI
   Depende de: auth.js (cargado antes)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════════
     DB — Capa de persistencia para Proyectos
  ══════════════════════════════════════════════════════ */
  const DB = (() => {
    const PREFIX = 'tf_projects_';

    function getKey() {
      const session = Auth.getSession();
      return session ? PREFIX + session.userId : null;
    }

    function getAll() {
      const key = getKey();
      if (!key) return [];
      try { return JSON.parse(localStorage.getItem(key)) || []; }
      catch { return []; }
    }

    function save(projects) {
      const key = getKey();
      if (!key) return;
      localStorage.setItem(key, JSON.stringify(projects));
    }

    function create(data) {
      const projects = getAll();
      const project = {
        id:          'prj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name:        data.name.trim(),
        client:      data.client.trim(),
        status:      data.status || 'active',
        priority:    data.priority || 'medium',
        progress:    parseInt(data.progress) || 0,
        budget:      parseFloat(data.budget) || 0,
        deadline:    data.deadline || '',
        description: (data.description || '').trim(),
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      };
      projects.unshift(project);
      save(projects);
      return project;
    }

    function update(id, data) {
      const projects = getAll();
      const idx = projects.findIndex(p => p.id === id);
      if (idx === -1) return null;
      projects[idx] = {
        ...projects[idx],
        name:        data.name.trim(),
        client:      data.client.trim(),
        status:      data.status,
        priority:    data.priority,
        progress:    parseInt(data.progress) || 0,
        budget:      parseFloat(data.budget) || 0,
        deadline:    data.deadline || '',
        description: (data.description || '').trim(),
        updatedAt:   new Date().toISOString(),
      };
      save(projects);
      return projects[idx];
    }

    function remove(id) {
      const projects = getAll();
      const filtered = projects.filter(p => p.id !== id);
      save(filtered);
      return filtered.length < projects.length;
    }

    function getById(id) {
      return getAll().find(p => p.id === id) || null;
    }

    function seedDemo(userId) {
      const key = PREFIX + userId;
      if (localStorage.getItem(key)) return; // ya tiene datos
      const demo = [
        { id:'prj_demo1', name:'Rediseño E-commerce', client:'MegaShop SA', status:'active', priority:'high', progress:72, budget:8500, deadline:'2025-08-15', description:'Rediseño completo de la plataforma de ventas con nuevo checkout.', createdAt: new Date(Date.now()-15*864e5).toISOString(), updatedAt: new Date().toISOString() },
        { id:'prj_demo2', name:'App Móvil Delivery', client:'QuickBite', status:'active', priority:'high', progress:45, budget:12000, deadline:'2025-09-30', description:'App iOS y Android para delivery de comidas con tracking en tiempo real.', createdAt: new Date(Date.now()-8*864e5).toISOString(), updatedAt: new Date().toISOString() },
        { id:'prj_demo3', name:'Dashboard Analytics', client:'DataCorp', status:'completed', priority:'medium', progress:100, budget:5200, deadline:'2025-06-01', description:'Panel de métricas con gráficos en tiempo real.', createdAt: new Date(Date.now()-45*864e5).toISOString(), updatedAt: new Date().toISOString() },
        { id:'prj_demo4', name:'Portal de RRHH', client:'Grupo Andino', status:'pending', priority:'low', progress:10, budget:3800, deadline:'2025-11-01', description:'Sistema de gestión de empleados y vacaciones.', createdAt: new Date(Date.now()-2*864e5).toISOString(), updatedAt: new Date().toISOString() },
        { id:'prj_demo5', name:'Plataforma LMS', client:'EduTech', status:'paused', priority:'medium', progress:33, budget:9600, deadline:'2025-10-15', description:'Plataforma de cursos online con video streaming y evaluaciones.', createdAt: new Date(Date.now()-20*864e5).toISOString(), updatedAt: new Date().toISOString() },
      ];
      localStorage.setItem(key, JSON.stringify(demo));
    }

    return { getAll, create, update, remove, getById, seedDemo };
  })();

  /* ══════════════════════════════════════════════════════
     TOAST NOTIFICATIONS
  ══════════════════════════════════════════════════════ */
  const Toast = (() => {
    const container = document.getElementById('toastContainer');

    const icons = {
      success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
      error:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
      info:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
      warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    };

    function show(message, type = 'info', duration = 3500) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 280);
      }, duration);
    }

    return { show, success: m => show(m,'success'), error: m => show(m,'error'), info: m => show(m,'info'), warning: m => show(m,'warning') };
  })();

  /* ══════════════════════════════════════════════════════
     ROUTER — control de vistas
  ══════════════════════════════════════════════════════ */
  const Router = (() => {
    let currentView = null;

    function showAuthView() {
      document.getElementById('auth-view').classList.remove('hidden');
      document.getElementById('app-view').classList.add('hidden');
    }

    function showAppView() {
      document.getElementById('auth-view').classList.add('hidden');
      document.getElementById('app-view').classList.remove('hidden');
    }

    function navigate(viewId) {
      // Desactivar paneles
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

      const panel = document.getElementById(`view-${viewId}`);
      if (panel) panel.classList.add('active');

      const navItem = document.querySelector(`[data-view="${viewId}"]`);
      if (navItem) navItem.classList.add('active');

      // Actualizar topbar
      const titles = { dashboard:'Dashboard', projects:'Proyectos', profile:'Mi Perfil' };
      const el = document.getElementById('topbarTitle');
      if (el) el.textContent = titles[viewId] || viewId;

      currentView = viewId;

      // Hooks por vista
      if (viewId === 'dashboard') renderDashboard();
      if (viewId === 'projects')  renderProjectsTable();
    }

    return { showAuthView, showAppView, navigate, getCurrent: () => currentView };
  })();

  /* ══════════════════════════════════════════════════════
     HELPERS UI
  ══════════════════════════════════════════════════════ */
  function setLoading(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner show"></div> Procesando...`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
  }

  function showAlert(id, message, type = 'error') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type} show`;
    el.innerHTML = `<span>${message}</span>`;
  }
  function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) { el.className = 'alert'; el.textContent = ''; }
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' });
  }
  function formatCurrency(n) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }

  const STATUS_MAP = {
    active:    { label:'Activo',    class:'badge-active' },
    pending:   { label:'Pendiente', class:'badge-pending' },
    paused:    { label:'Pausado',   class:'badge-paused' },
    completed: { label:'Completado',class:'badge-completed' },
  };
  const PRIORITY_MAP = {
    high:   { label:'Alta',  class:'priority-high' },
    medium: { label:'Media', class:'priority-medium' },
    low:    { label:'Baja',  class:'priority-low' },
  };

  /* ══════════════════════════════════════════════════════
     AUTH FORMS
  ══════════════════════════════════════════════════════ */

  // Tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.auth-form-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`form-${target}`).classList.remove('hidden');
      hideAlert('loginAlert');
      hideAlert('registerAlert');
    });
  });

  // LOGIN
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    hideAlert('loginAlert');
    setLoading(btn, true);

    await new Promise(r => setTimeout(r, 600)); // Simular latencia

    const result = Auth.login({
      email:    document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    });

    setLoading(btn, false);

    if (!result.ok) {
      showAlert('loginAlert', result.error, 'error');
      return;
    }

    // Cargar datos demo si es primer login
    DB.seedDemo(result.session.userId);
    bootApp(result.session);
    Toast.success(`¡Bienvenido de vuelta, ${result.user.firstName}!`);
  });

  // REGISTER
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    hideAlert('registerAlert');

    const pwd  = document.getElementById('regPassword').value;
    const pwd2 = document.getElementById('regPassword2').value;
    if (pwd !== pwd2) {
      showAlert('registerAlert', 'Las contraseñas no coinciden.', 'error');
      return;
    }

    setLoading(btn, true);
    await new Promise(r => setTimeout(r, 800));

    const result = Auth.register({
      firstName: document.getElementById('regFirstName').value,
      lastName:  document.getElementById('regLastName').value,
      email:     document.getElementById('regEmail').value,
      password:  pwd,
    });

    setLoading(btn, false);

    if (!result.ok) {
      showAlert('registerAlert', result.error, 'error');
      return;
    }

    DB.seedDemo(result.session.userId);
    bootApp(result.session);
    Toast.success(`¡Cuenta creada! Bienvenido, ${result.user.firstName} 🎉`);
  });

  /* ══════════════════════════════════════════════════════
     BOOT APP — inicializa el dashboard tras login
  ══════════════════════════════════════════════════════ */
  function bootApp(session) {
    Router.showAppView();

    // Llenar info de usuario en sidebar
    document.getElementById('sidebarUserName').textContent  = `${session.firstName} ${session.lastName}`;
    document.getElementById('sidebarUserRole').textContent  = session.plan === 'free' ? 'Free Plan' : 'Pro Plan';
    document.getElementById('sidebarUserAvatar').textContent = session.firstName[0] + session.lastName[0];

    Router.navigate('dashboard');
  }

  /* ══════════════════════════════════════════════════════
     DASHBOARD — métricas y widgets
  ══════════════════════════════════════════════════════ */
  function renderDashboard() {
    const projects = DB.getAll();
    const session  = Auth.getSession();

    // Stats
    const active    = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0;

    document.getElementById('stat-total').textContent     = projects.length;
    document.getElementById('stat-active').textContent    = active;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-budget').textContent    = formatCurrency(totalBudget);
    document.getElementById('stat-progress').textContent  = avgProgress + '%';

    // Actividad reciente
    const activityList = document.getElementById('activityList');
    const recent = [...projects].sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,5);
    activityList.innerHTML = recent.length
      ? recent.map(p => `
          <div class="activity-item">
            <div class="activity-dot"></div>
            <div>
              <div class="activity-text">Proyecto <strong>${p.name}</strong> — ${STATUS_MAP[p.status]?.label}</div>
              <div class="activity-time">${formatDate(p.updatedAt)}</div>
            </div>
          </div>`).join('')
      : `<div class="activity-item"><div class="activity-text" style="color:var(--text3)">Sin actividad aún.</div></div>`;

    // Nombre en bienvenida
    const wEl = document.getElementById('dashWelcome');
    if (wEl) wEl.textContent = `Bienvenido, ${session?.firstName || ''} 👋`;
  }

  /* ══════════════════════════════════════════════════════
     PROYECTOS — CRUD
  ══════════════════════════════════════════════════════ */
  let projectFilter = { search:'', status:'all', priority:'all' };
  let editingProjectId = null;

  function renderProjectsTable() {
    const projects = DB.getAll();
    let filtered = projects;

    // Filtrar
    if (projectFilter.search) {
      const q = projectFilter.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q)
      );
    }
    if (projectFilter.status !== 'all') {
      filtered = filtered.filter(p => p.status === projectFilter.status);
    }
    if (projectFilter.priority !== 'all') {
      filtered = filtered.filter(p => p.priority === projectFilter.priority);
    }

    const tbody = document.getElementById('projectsTbody');
    const countEl = document.getElementById('projectsCount');

    if (countEl) countEl.textContent = `${filtered.length} proyecto${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr><td colspan="7" class="table-empty">
          <span class="table-empty-icon">📂</span>
          <p>${projects.length ? 'No hay proyectos que coincidan con el filtro.' : 'Aún no creaste ningún proyecto.'}</p>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const status   = STATUS_MAP[p.status]   || { label: p.status,   class: '' };
      const priority = PRIORITY_MAP[p.priority] || { label: p.priority, class: '' };
      return `
        <tr data-id="${p.id}">
          <td>
            <div class="td-name">${escHtml(p.name)}</div>
            <div class="td-id">${p.id}</div>
          </td>
          <td>${escHtml(p.client)}</td>
          <td><span class="badge ${status.class}">${status.label}</span></td>
          <td>
            <span class="priority ${priority.class}">
              ${p.priority === 'high' ? '▲' : p.priority === 'medium' ? '■' : '▼'} ${priority.label}
            </span>
          </td>
          <td>
            <div class="progress-wrap">
              <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div>
              <span class="progress-pct">${p.progress}%</span>
            </div>
          </td>
          <td>${formatDate(p.deadline)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-icon btn-sm" title="Editar" onclick="editProject('${p.id}')">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
              </button>
              <button class="btn btn-icon btn-sm" title="Eliminar" onclick="deleteProject('${p.id}')">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" style="color:var(--danger)"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Abrir modal CREAR
  window.openCreateProject = function() {
    editingProjectId = null;
    document.getElementById('projectModalTitle').textContent = 'Nuevo Proyecto';
    document.getElementById('projectForm').reset();
    hideAlert('projectModalAlert');
    openModal('projectModal');
  };

  // Abrir modal EDITAR
  window.editProject = function(id) {
    const p = DB.getById(id);
    if (!p) return;
    editingProjectId = id;

    document.getElementById('projectModalTitle').textContent = 'Editar Proyecto';
    document.getElementById('pmName').value        = p.name;
    document.getElementById('pmClient').value      = p.client;
    document.getElementById('pmStatus').value      = p.status;
    document.getElementById('pmPriority').value    = p.priority;
    document.getElementById('pmProgress').value    = p.progress;
    document.getElementById('pmProgressVal').textContent = p.progress + '%';
    document.getElementById('pmBudget').value      = p.budget;
    document.getElementById('pmDeadline').value    = p.deadline;
    document.getElementById('pmDescription').value = p.description;
    hideAlert('projectModalAlert');
    openModal('projectModal');
  };

  // ELIMINAR
  window.deleteProject = function(id) {
    const p = DB.getById(id);
    if (!p) return;
    if (!confirm(`¿Eliminar el proyecto "${p.name}"? Esta acción no se puede deshacer.`)) return;
    DB.remove(id);
    renderProjectsTable();
    renderDashboard();
    Toast.success('Proyecto eliminado correctamente.');
  };

  // GUARDAR (crear o editar)
  document.getElementById('projectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    hideAlert('projectModalAlert');

    const data = {
      name:        document.getElementById('pmName').value,
      client:      document.getElementById('pmClient').value,
      status:      document.getElementById('pmStatus').value,
      priority:    document.getElementById('pmPriority').value,
      progress:    document.getElementById('pmProgress').value,
      budget:      document.getElementById('pmBudget').value,
      deadline:    document.getElementById('pmDeadline').value,
      description: document.getElementById('pmDescription').value,
    };

    if (!data.name || !data.client) {
      showAlert('projectModalAlert', 'Nombre y cliente son obligatorios.', 'error');
      return;
    }
    if (data.progress < 0 || data.progress > 100) {
      showAlert('projectModalAlert', 'El progreso debe estar entre 0 y 100.', 'error');
      return;
    }

    if (editingProjectId) {
      DB.update(editingProjectId, data);
      Toast.success('Proyecto actualizado.');
    } else {
      DB.create(data);
      Toast.success('Proyecto creado exitosamente.');
    }

    closeModal('projectModal');
    renderProjectsTable();
    renderDashboard();
  });

  // Slider progreso
  document.getElementById('pmProgress').addEventListener('input', function() {
    document.getElementById('pmProgressVal').textContent = this.value + '%';
  });

  // Filtros tabla
  document.getElementById('projectSearch').addEventListener('input', (e) => {
    projectFilter.search = e.target.value;
    renderProjectsTable();
  });
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    projectFilter.status = e.target.value;
    renderProjectsTable();
  });
  document.getElementById('priorityFilter').addEventListener('change', (e) => {
    projectFilter.priority = e.target.value;
    renderProjectsTable();
  });

  /* ══════════════════════════════════════════════════════
     PERFIL
  ══════════════════════════════════════════════════════ */
  function loadProfile() {
    const session = Auth.getSession();
    if (!session) return;
    document.getElementById('profileFirstName').value = session.firstName;
    document.getElementById('profileLastName').value  = session.lastName;
    document.getElementById('profileEmail').value     = session.email;
    document.getElementById('profileAvatar').textContent = session.firstName[0] + session.lastName[0];
    document.getElementById('profileFullName').textContent = `${session.firstName} ${session.lastName}`;
    document.getElementById('profileEmailDisplay').textContent = session.email;
  }

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('profileAlert');
    const btn = e.target.querySelector('[type=submit]');
    setLoading(btn, true);
    await new Promise(r => setTimeout(r, 500));

    const result = Auth.updateProfile({
      firstName: document.getElementById('profileFirstName').value,
      lastName:  document.getElementById('profileLastName').value,
    });

    setLoading(btn, false);
    if (!result.ok) { showAlert('profileAlert', result.error, 'error'); return; }

    // Actualizar sidebar
    const s = Auth.getSession();
    document.getElementById('sidebarUserName').textContent   = `${s.firstName} ${s.lastName}`;
    document.getElementById('sidebarUserAvatar').textContent = s.firstName[0] + s.lastName[0];
    loadProfile();
    Toast.success('Perfil actualizado correctamente.');
  });

  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('passwordAlert');
    const btn = e.target.querySelector('[type=submit]');

    const np  = document.getElementById('newPassword').value;
    const np2 = document.getElementById('newPassword2').value;
    if (np !== np2) { showAlert('passwordAlert', 'Las contraseñas no coinciden.', 'error'); return; }

    setLoading(btn, true);
    await new Promise(r => setTimeout(r, 500));

    const result = Auth.changePassword({
      currentPassword: document.getElementById('currentPassword').value,
      newPassword: np,
    });

    setLoading(btn, false);
    if (!result.ok) { showAlert('passwordAlert', result.error, 'error'); return; }

    e.target.reset();
    Toast.success('Contraseña cambiada correctamente.');
  });

  /* ══════════════════════════════════════════════════════
     NAVEGACIÓN
  ══════════════════════════════════════════════════════ */
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      Router.navigate(view);
      if (view === 'profile') loadProfile();
      // Cerrar sidebar móvil
      document.querySelector('.sidebar').classList.remove('open');
      document.getElementById('sidebarBackdrop').classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Quick actions del dashboard
  document.getElementById('qaNewProject')?.addEventListener('click', () => {
    Router.navigate('projects');
    setTimeout(window.openCreateProject, 150);
  });
  document.getElementById('qaViewAll')?.addEventListener('click', () => Router.navigate('projects'));
  document.getElementById('qaProfile')?.addEventListener('click', () => { Router.navigate('profile'); loadProfile(); });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout();
    Router.showAuthView();
    // Limpiar formularios
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    Toast.info('Sesión cerrada correctamente.');
  });

  // Cerrar modales
  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => closeModal(m.id));
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });

  /* ──── Sidebar móvil ──── */
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
      sidebarBackdrop.classList.toggle('open');
      document.body.style.overflow = document.querySelector('.sidebar').classList.contains('open') ? 'hidden' : '';
    });
  }
  sidebarBackdrop?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('open');
    sidebarBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  });

  /* ──── Topbar search global ──── */
  document.getElementById('topbarSearch')?.addEventListener('input', (e) => {
    const q = e.target.value;
    if (q && Router.getCurrent() !== 'projects') Router.navigate('projects');
    projectFilter.search = q;
    if (document.getElementById('projectSearch')) document.getElementById('projectSearch').value = q;
    renderProjectsTable();
  });

  /* ══════════════════════════════════════════════════════
     INIT — verificar sesión activa
  ══════════════════════════════════════════════════════ */
  const existingSession = Auth.getSession();
  if (existingSession) {
    DB.seedDemo(existingSession.userId);
    bootApp(existingSession);
  } else {
    Router.showAuthView();
  }

});
