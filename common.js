/* ==========================================================================
   NAWAH Verify — Shared utilities: API helpers, dynamic branding/theme,
   header/footer, auth, validation, uploads, toast
   ========================================================================== */

const NAWAH_IN_ADMIN = window.location.pathname.includes('/admin/');
const NAWAH_ASSET_BASE = NAWAH_IN_ADMIN ? '../' : '';

/* ---------------- Browser storage API ----------------
   The original export depended on Base44's private /tables API. Netlify only
   hosts static files, so the same CRUD interface is implemented with localStorage.
   It keeps the public pages and admin demo working after deployment. */
const NAWAH_STORAGE_KEY = 'nawah-verify-data-v1';
const NAWAH_DEFAULT_DATA = {
  certificates: [
    { id: 'cert-1', certificate_number: 'NMH-2026-000001', student_name: 'Ahmad Al-Hassan', student_name_ar: 'أحمد الحسن', course_name: 'Basic Life Support', course_name_ar: 'دعم الحياة الأساسي', instructor: 'Dr. Sarah Khalil', training_hours: 8, issue_date: '2026-01-15', expiry_date: '2028-01-15', status: 'active', revoke_reason: '' },
    { id: 'cert-4', certificate_number: 'NMH-2026-000004', student_name: 'Lina Saad', student_name_ar: 'لينا سعد', course_name: 'First Aid', course_name_ar: 'الإسعافات الأولية', instructor: 'Dr. Sarah Khalil', training_hours: 6, issue_date: '2025-03-01', expiry_date: '2027-03-01', status: 'revoked', revoke_reason: 'Certificate withdrawn for administrative review.' },
    { id: 'cert-5', certificate_number: 'NMH-2026-000005', student_name: 'Omar Nasser', student_name_ar: 'عمر ناصر', course_name: 'Infection Control', course_name_ar: 'مكافحة العدوى', instructor: 'Dr. Sarah Khalil', training_hours: 5, issue_date: '2023-01-10', expiry_date: '2025-01-10', status: 'active', revoke_reason: '' }
  ],
  students: [
    { id: 'student-1', full_name: 'Ahmad Al-Hassan', full_name_ar: 'أحمد الحسن', email: 'ahmad@example.com', phone: '', national_id: '', notes: '' }
  ],
  courses: [
    { id: 'course-1', course_name: 'Basic Life Support', course_name_ar: 'دعم الحياة الأساسي', description: 'Essential emergency response skills.', default_hours: 8, instructor: 'Dr. Sarah Khalil' },
    { id: 'course-2', course_name: 'First Aid', course_name_ar: 'الإسعافات الأولية', description: 'Practical first aid training.', default_hours: 6, instructor: 'Dr. Sarah Khalil' }
  ],
  verification_logs: [],
  admin_users: [
    { id: 'admin-1', username: 'admin', password: 'Nawah@2026', full_name: 'Administrator', role: 'administrator', email: 'admin@example.com' },
    { id: 'admin-2', username: 'instructor', password: 'Instr@2026', full_name: 'Instructor', role: 'instructor', email: 'instructor@example.com' },
    { id: 'admin-3', username: 'viewer', password: 'View@2026', full_name: 'Viewer', role: 'viewer', email: 'viewer@example.com' }
  ],
  academy_settings: [{ id: 'academy-1', academy_name: 'NAWAH Medical Academy', academy_name_ar: 'أكاديمية نواة الطبية', website: '', support_email: '' }],
  theme_settings: [{ id: 'theme-1', primary_color: '#0F3D7A', secondary_color: '#28A745' }],
  site_settings: [{ id: 'site-1', homepage_show_stats: true, homepage_show_courses: true, homepage_show_partners: true, homepage_show_testimonials: true, verification_log_enabled: true }],
  social_links: [], homepage_sections: [], homepage_stats: [], partners: [], testimonials: [], settings: []
};
function nawahReadData() {
  try {
    const saved = localStorage.getItem(NAWAH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.warn('Could not read saved NAWAH data', e); }
  const data = JSON.parse(JSON.stringify(NAWAH_DEFAULT_DATA));
  localStorage.setItem(NAWAH_STORAGE_KEY, JSON.stringify(data));
  return data;
}
function nawahWriteData(data) { localStorage.setItem(NAWAH_STORAGE_KEY, JSON.stringify(data)); }
function nawahTable(data, table) { return Array.isArray(data[table]) ? data[table] : (data[table] = []); }
function nawahNewId(table) { return `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
async function apiList(table, opts = {}) {
  let rows = nawahTable(nawahReadData(), table);
  if (opts.search) {
    const q = String(opts.search).toLowerCase();
    rows = rows.filter(row => JSON.stringify(row).toLowerCase().includes(q));
  }
  return { data: rows.slice(0, opts.limit || rows.length) };
}
async function apiGetAll(table) { return (await apiList(table, { limit: 500 })).data; }
async function apiGet(table, id) { return nawahTable(nawahReadData(), table).find(row => row.id === id) || null; }
async function apiCreate(table, payload) {
  const data = nawahReadData(); const row = { id: nawahNewId(table), ...payload };
  nawahTable(data, table).push(row); nawahWriteData(data); return row;
}
async function apiUpdate(table, id, payload) {
  const data = nawahReadData(); const rows = nawahTable(data, table); const i = rows.findIndex(row => row.id === id);
  if (i < 0) throw new Error('Record not found');
  rows[i] = { ...rows[i], ...payload, id }; nawahWriteData(data); return rows[i];
}
async function apiDelete(table, id) {
  const data = nawahReadData(); const rows = nawahTable(data, table); const i = rows.findIndex(row => row.id === id);
  if (i < 0) return false;
  rows.splice(i, 1); nawahWriteData(data); return true;
}
/* Singleton-row tables (one settings row per table) */
async function apiGetSingleton(table) {
  const all = await apiGetAll(table);
  return all[0] || null;
}
async function apiSaveSingleton(table, id, payload) {
  if (id) return apiUpdate(table, id, payload);
  return apiCreate(table, payload);
}
/* Prevent duplicate certificate numbers (case-insensitive) */
async function isCertificateNumberTaken(number, excludeId) {
  if (!number) return false;
  const clean = number.trim().toUpperCase();
  const all = await apiGetAll('certificates');
  return all.some(c => c.id !== excludeId && (c.certificate_number || '').toUpperCase() === clean);
}

/* ---------------- Certificate helpers ---------------- */
async function findCertificateByNumber(number) {
  if (!number) return null;
  const clean = number.trim().toUpperCase();
  const all = await apiGetAll('certificates');
  return all.find(c => (c.certificate_number || '').toUpperCase() === clean) || null;
}
function computeEffectiveStatus(cert) {
  if (!cert) return 'not_found';
  if (cert.status === 'revoked') return 'revoked';
  if (cert.expiry_date && new Date(cert.expiry_date).getTime() < Date.now()) return 'expired';
  if (cert.status === 'expired') return 'expired';
  return 'active';
}
async function logVerification(certificate_number, result) {
  try {
    const site = await getCachedSiteSettings();
    if (site && site.verification_log_enabled === false) return;
    await apiCreate('verification_logs', {
      certificate_number: certificate_number || '',
      verification_date: new Date().toISOString(),
      browser: detectBrowser(),
      device: detectDevice(),
      country: '',
      result: result
    });
  } catch (e) { /* silent */ }
}
function detectBrowser(){
  const ua = navigator.userAgent;
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}
function detectDevice(){
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}
function formatDate(iso, opts = {}) {
  if (!iso) return nawahT('none');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return nawahT('none');
  const lang = nawahGetLang();
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', ...opts });
}
function formatDateTime(iso) {
  if (!iso) return nawahT('none');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return nawahT('none');
  const lang = nawahGetLang();
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function statusBadgeHtml(status) {
  const map = {
    active: { cls: 'badge-active', icon: 'fa-circle-check', key: 'status_active' },
    revoked: { cls: 'badge-revoked', icon: 'fa-ban', key: 'status_revoked' },
    expired: { cls: 'badge-expired', icon: 'fa-clock', key: 'status_expired' }
  };
  const m = map[status] || map.active;
  return `<span class="badge ${m.cls}"><i class="fa-solid ${m.icon}"></i> ${nawahT(m.key)}</span>`;
}
function certificateVerifyUrl(certNumber) {
  return `${window.location.origin}/certificate/${encodeURIComponent(certNumber)}`;
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

/* ---------------- Toast ---------------- */
function showToast(message, type = 'info') {
  let toast = document.getElementById('nawah-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'nawah-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  const iconMap = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${iconMap[type] || iconMap.info}"></i><span>${message}</span>`;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ---------------- Form validation helpers ---------------- */
function markFieldError(inputEl, message) {
  if (!inputEl) return;
  inputEl.classList.add('field-invalid');
  let hint = inputEl.parentElement.querySelector('.field-error-msg');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'field-error-msg';
    inputEl.parentElement.appendChild(hint);
  }
  hint.textContent = message;
}
function clearFieldError(inputEl) {
  if (!inputEl) return;
  inputEl.classList.remove('field-invalid');
  const hint = inputEl.parentElement.querySelector('.field-error-msg');
  if (hint) hint.remove();
}
function clearAllFieldErrors(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll('.field-invalid').forEach(el => clearFieldError(el));
}
function validateRequired(inputEl) {
  const val = (inputEl.value || '').trim();
  if (!val) { markFieldError(inputEl, nawahT('validation_required')); return false; }
  clearFieldError(inputEl);
  return true;
}
function validateEmail(inputEl, required = false) {
  const val = (inputEl.value || '').trim();
  if (!val) {
    if (required) { markFieldError(inputEl, nawahT('validation_required')); return false; }
    clearFieldError(inputEl); return true;
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  if (!ok) { markFieldError(inputEl, nawahT('validation_invalid_email')); return false; }
  clearFieldError(inputEl);
  return true;
}
function validateUrl(inputEl, required = false) {
  const val = (inputEl.value || '').trim();
  if (!val) {
    if (required) { markFieldError(inputEl, nawahT('validation_required')); return false; }
    clearFieldError(inputEl); return true;
  }
  const ok = /^https?:\/\/.+/i.test(val) || /^www\..+/i.test(val);
  if (!ok) { markFieldError(inputEl, nawahT('validation_invalid_url')); return false; }
  clearFieldError(inputEl);
  return true;
}

/* Wrap a submit handler to prevent double-submission and show a loading state on the button */
function guardSubmit(button, handler) {
  return async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (button.disabled) return;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.dataset.origHtml = originalHtml;
    button.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${nawahT('saving')}`;
    try {
      await handler(e);
    } catch (err) {
      console.error(err);
      showToast(nawahT('validation_required') === err.message ? err.message : (err.message || 'Error'), 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = button.dataset.origHtml || originalHtml;
    }
  };
}

/* ---------------- File upload helpers (data-URL based, static-site friendly) ---------------- */
const NAWAH_MAX_UPLOAD_BYTES = 1.8 * 1024 * 1024; // ~1.8MB safety cap for table text fields
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('No file selected')); return; }
    if (file.size > NAWAH_MAX_UPLOAD_BYTES) {
      reject(new Error(nawahT('toast_upload_error')));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(nawahT('toast_upload_error')));
    reader.readAsDataURL(file);
  });
}
/* Wire a <input type=file> to preview into an <img>, and optionally store the resulting dataURL */
function wireFileInputPreview(inputEl, previewImgEl, onLoaded) {
  if (!inputEl) return;
  inputEl.addEventListener('change', async () => {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (previewImgEl) { previewImgEl.src = dataUrl; previewImgEl.style.display = ''; }
      if (onLoaded) onLoaded(dataUrl, file);
    } catch (err) {
      showToast(err.message || nawahT('toast_upload_error'), 'error');
      inputEl.value = '';
    }
  });
}

/* ---------------- Dynamic Academy / Theme / Site / Social settings (cached) ---------------- */
let _nawahAcademyPromise = null;
let _nawahThemePromise = null;
let _nawahSitePromise = null;
let _nawahSocialPromise = null;

function getCachedAcademySettings(force) {
  if (!_nawahAcademyPromise || force) {
    _nawahAcademyPromise = apiGetAll('academy_settings').then(a => a[0] || {}).catch(() => ({}));
  }
  return _nawahAcademyPromise;
}
function getCachedThemeSettings(force) {
  if (!_nawahThemePromise || force) {
    _nawahThemePromise = apiGetAll('theme_settings').then(a => a[0] || {}).catch(() => ({}));
  }
  return _nawahThemePromise;
}
function getCachedSiteSettings(force) {
  if (!_nawahSitePromise || force) {
    _nawahSitePromise = apiGetAll('site_settings').then(a => a[0] || {}).catch(() => ({}));
  }
  return _nawahSitePromise;
}
function getCachedSocialLinks(force) {
  if (!_nawahSocialPromise || force) {
    _nawahSocialPromise = apiGetAll('social_links').then(a => a.sort((x, y) => (x.display_order || 0) - (y.display_order || 0))).catch(() => []);
  }
  return _nawahSocialPromise;
}
function nawahInvalidateSettingsCache() {
  _nawahAcademyPromise = null; _nawahThemePromise = null; _nawahSitePromise = null; _nawahSocialPromise = null;
}

/* Resolve a stored asset value (data URL / absolute URL / relative site path) to a usable <img src> */
function resolveAssetUrl(url) {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return NAWAH_ASSET_BASE + url;
}
const NAWAH_SOCIAL_ICON_MAP = {
  facebook: 'fa-brands fa-facebook', instagram: 'fa-brands fa-instagram', linkedin: 'fa-brands fa-linkedin',
  telegram: 'fa-brands fa-telegram', youtube: 'fa-brands fa-youtube', twitter: 'fa-brands fa-x-twitter', other: 'fa-solid fa-link'
};

/* Apply logo / academy name / theme colors / dark-mode across the current page */
async function applyDynamicBranding() {
  try {
    const [academy, theme] = await Promise.all([getCachedAcademySettings(), getCachedThemeSettings()]);
    const lang = nawahGetLang();

    // Favicon
    const favUrl = resolveAssetUrl(academy.favicon_url || academy.logo_url) || (NAWAH_ASSET_BASE + 'images/logo.png');
    let favEl = document.querySelector('link[rel="icon"]');
    if (!favEl) { favEl = document.createElement('link'); favEl.rel = 'icon'; document.head.appendChild(favEl); }
    if (favUrl) favEl.href = favUrl;

    // Logos everywhere marked with .dyn-logo
    const logoSrc = resolveAssetUrl(academy.logo_url) || (NAWAH_ASSET_BASE + 'images/logo.png');
    document.querySelectorAll('.dyn-logo').forEach(img => { img.src = logoSrc; img.alt = academy.academy_name || 'Logo'; });

    // Academy name text everywhere marked with [data-dyn="academy_name"]
    const name = (lang === 'ar' && academy.academy_name_ar) ? academy.academy_name_ar : (academy.academy_name || nawahT('academy_name'));
    document.querySelectorAll('[data-dyn="academy_name"]').forEach(el => { el.textContent = name; });

    // Theme colors / typography / button style
    if (theme && Object.keys(theme).length) {
      const root = document.documentElement.style;
      if (theme.primary_color) { root.setProperty('--nawah-blue', theme.primary_color); root.setProperty('--nawah-blue-dark', shadeColor(theme.primary_color, -18)); root.setProperty('--nawah-blue-light', shadeColor(theme.primary_color, 88)); }
      if (theme.secondary_color) { root.setProperty('--nawah-green', theme.secondary_color); root.setProperty('--nawah-green-dark', shadeColor(theme.secondary_color, -18)); root.setProperty('--nawah-green-light', shadeColor(theme.secondary_color, 88)); }
      if (theme.background_color) root.setProperty('--nawah-gray', theme.background_color);
      if (theme.text_color) root.setProperty('--nawah-text', theme.text_color);
      if (theme.border_radius) { root.setProperty('--radius-sm', theme.border_radius); }
      document.body.classList.remove('btn-style-rounded', 'btn-style-pill', 'btn-style-square');
      document.body.classList.add('btn-style-' + (theme.button_style || 'rounded'));
      const fontMap = { inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", cairo: "'Cairo', 'Tajawal', sans-serif", poppins: "'Poppins', sans-serif", tajawal: "'Tajawal', sans-serif" };
      if (theme.font_family && fontMap[theme.font_family]) root.setProperty('--font-en', fontMap[theme.font_family]);

      document.querySelectorAll('.dark-mode-toggle-btn').forEach(b => { b.style.display = theme.dark_mode_enabled === false ? 'none' : ''; });
      if (!localStorage.getItem('nawah_color_mode') && theme.default_mode === 'dark') {
        document.body.classList.add('dark-mode');
      }
    }
    if (localStorage.getItem('nawah_color_mode') === 'dark') document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle-btn i').forEach(i => {
      i.className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  } catch (e) { console.error('applyDynamicBranding failed', e); }
}
/* small helper: lighten(+)/darken(-) a hex color by percent, used to derive shade variants */
function shadeColor(hex, percent) {
  try {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
    const amt = Math.round(2.55 * percent);
    r = Math.max(0, Math.min(255, r + amt));
    g = Math.max(0, Math.min(255, g + amt));
    b = Math.max(0, Math.min(255, b + amt));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  } catch (e) { return hex; }
}
function toggleColorMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('nawah_color_mode', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  document.querySelectorAll('.dark-mode-toggle-btn i').forEach(i => {
    i.className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}

/* ---------------- Auth / session (demo, client-side only) ---------------- */
const NAWAH_SESSION_KEY = 'nawah_session';
function setSession(user) {
  sessionStorage.setItem(NAWAH_SESSION_KEY, JSON.stringify(user));
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(NAWAH_SESSION_KEY)); } catch (e) { return null; }
}
function clearSession() {
  sessionStorage.removeItem(NAWAH_SESSION_KEY);
}
function requireAuth() {
  const session = getSession();
  if (!session) {
    // admin pages live under /admin/, public pages at root — detect which base to use
    window.location.href = NAWAH_IN_ADMIN ? '../login.html' : 'login.html';
    return null;
  }
  return session;
}
async function attemptLogin(username, password) {
  const users = await apiGetAll('admin_users');
  const found = users.find(u => u.username === username && u.password === password);
  return found || null;
}

/* ---------------- Header / Footer injection ---------------- */
const NAWAH_PUBLIC_NAV = [
  { key: 'nav_home', href: 'index.html' },
  { key: 'nav_verify', href: 'verify.html' },
  { key: 'nav_search', href: 'search.html' },
  { key: 'nav_admin', href: 'login.html' }
];

function renderSiteHeader(activeHref) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const navLinks = NAWAH_PUBLIC_NAV.map(n =>
    `<a href="${n.href}" data-i18n="${n.key}" class="${activeHref === n.href ? 'active' : ''}"></a>`
  ).join('');
  el.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="brand">
        <img src="${NAWAH_ASSET_BASE}images/logo.png" alt="NAWAH Medical Academy" class="logo dyn-logo">
        <span class="brand-text">
          <strong data-dyn="academy_name" data-i18n="academy_name"></strong>
          <span data-i18n="system_name"></span>
        </span>
      </a>
      <nav class="main-nav" id="main-nav">${navLinks}</nav>
      <div class="header-actions">
        <button class="icon-btn dark-mode-toggle-btn" id="dark-mode-toggle-btn" title="Dark Mode" style="display:none;"><i class="fa-solid fa-moon"></i></button>
        <div class="lang-switch">
          <button data-lang="en" onclick="nawahSetLang('en')">EN</button>
          <button data-lang="ar" onclick="nawahSetLang('ar')">AR</button>
        </div>
        <button class="mobile-toggle" id="mobile-toggle" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
      </div>
    </div>`;
  const toggle = document.getElementById('mobile-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
  const dm = document.getElementById('dark-mode-toggle-btn');
  if (dm) dm.addEventListener('click', toggleColorMode);
  nawahApplyLang();
  applyDynamicBranding();
}

async function renderSiteFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="footer-grid">
      <div class="f-brand">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${NAWAH_ASSET_BASE}images/logo.png" alt="logo" class="dyn-logo" style="width:42px;height:42px;object-fit:contain;border-radius:8px;background:#fff;padding:2px;">
          <strong data-dyn="academy_name" data-i18n="academy_name"></strong>
        </div>
        <p id="footer-about-text" data-i18n="footer_about" style="margin-top:12px;font-size:.85rem;"></p>
        <div class="footer-social" id="footer-social"></div>
      </div>
      <div>
        <h4 data-i18n="footer_links"></h4>
        <ul>
          <li><a href="index.html" data-i18n="nav_home"></a></li>
          <li><a href="verify.html" data-i18n="nav_verify"></a></li>
          <li><a href="search.html" data-i18n="nav_search"></a></li>
          <li><a href="login.html" data-i18n="nav_admin"></a></li>
        </ul>
      </div>
      <div>
        <h4 data-i18n="footer_contact"></h4>
        <ul id="footer-contact-list">
          <li><i class="fa-solid fa-globe"></i> nawa.base44.app</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom" id="footer-copyright">
      &copy; ${year} <span data-dyn="academy_name" data-i18n="academy_name"></span> — <span data-i18n="footer_rights"></span>
    </div>`;
  nawahApplyLang();
  applyDynamicBranding();

  try {
    const [academy, social] = await Promise.all([getCachedAcademySettings(), getCachedSocialLinks()]);
    const lang = nawahGetLang();

    // Contact list
    const contactItems = [];
    if (academy.email) contactItems.push(`<li><a href="mailto:${escapeHtml(academy.email)}"><i class="fa-solid fa-envelope"></i> ${escapeHtml(academy.email)}</a></li>`);
    if (academy.phone) contactItems.push(`<li><a href="tel:${escapeHtml(academy.phone)}"><i class="fa-solid fa-phone"></i> ${escapeHtml(academy.phone)}</a></li>`);
    if (academy.whatsapp) contactItems.push(`<li><a href="https://wa.me/${encodeURIComponent(academy.whatsapp.replace(/[^\d+]/g, ''))}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(academy.whatsapp)}</a></li>`);
    const address = (lang === 'ar' && academy.address_ar) ? academy.address_ar : academy.address;
    if (address) contactItems.push(`<li><i class="fa-solid fa-location-dot"></i> ${escapeHtml(address)}</li>`);
    if (academy.website) contactItems.push(`<li><a href="${escapeHtml(academy.website)}" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i> ${escapeHtml(academy.website.replace(/^https?:\/\//, ''))}</a></li>`);
    const contactList = document.getElementById('footer-contact-list');
    if (contactList && contactItems.length) contactList.innerHTML = contactItems.join('');

    // About text
    const aboutEl = document.getElementById('footer-about-text');
    const desc = (lang === 'ar' && academy.description_ar) ? academy.description_ar : academy.description;
    if (aboutEl && desc) { aboutEl.removeAttribute('data-i18n'); aboutEl.innerHTML = desc; }

    // Social icons
    const socialEl = document.getElementById('footer-social');
    if (socialEl) {
      const active = (social || []).filter(s => s.active !== false && s.url);
      socialEl.innerHTML = active.map(s => `
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="footer-social-icon" title="${escapeHtml(s.platform)}">
          <i class="${escapeHtml(s.icon) || NAWAH_SOCIAL_ICON_MAP[s.platform] || 'fa-solid fa-link'}"></i>
        </a>`).join('');
    }

    // Copyright
    const copyEl = document.getElementById('footer-copyright');
    const copy = (lang === 'ar' && academy.copyright_text_ar) ? academy.copyright_text_ar : academy.copyright_text;
    if (copyEl && copy) { copyEl.removeAttribute('data-i18n'); copyEl.innerHTML = escapeHtml(copy); }
  } catch (e) { /* keep static fallback footer content */ }
}

/* ---------------- Admin layout ---------------- */
const NAWAH_ADMIN_NAV = [
  { key: 'sd_dashboard', href: 'dashboard.html', icon: 'fa-gauge-high' },
  { key: 'sd_certificates', href: 'certificates.html', icon: 'fa-certificate' },
  { key: 'sd_students', href: 'students.html', icon: 'fa-user-graduate' },
  { key: 'sd_courses', href: 'courses.html', icon: 'fa-book-medical' },
  { key: 'sd_homepage', href: 'homepage.html', icon: 'fa-house' },
  { key: 'sd_partners', href: 'partners.html', icon: 'fa-handshake' },
  { key: 'sd_media', href: 'media.html', icon: 'fa-photo-film' },
  { key: 'sd_academy_settings', href: 'academy-settings.html', icon: 'fa-building-columns' },
  { key: 'sd_website_settings', href: 'website-settings.html', icon: 'fa-sliders' },
  { key: 'sd_logs', href: 'logs.html', icon: 'fa-clipboard-list' }
];

function renderAdminLayout(activeHref, titleKey) {
  const session = requireAuth();
  if (!session) return null;
  const sidebarEl = document.getElementById('admin-sidebar');
  const topbarEl = document.getElementById('admin-topbar');
  if (sidebarEl) {
    const navLinks = NAWAH_ADMIN_NAV.map(n =>
      `<a href="${n.href}" class="${activeHref === n.href ? 'active' : ''}"><i class="fa-solid ${n.icon}"></i> <span data-i18n="${n.key}"></span></a>`
    ).join('');
    sidebarEl.innerHTML = `
      <a href="../index.html" class="brand">
        <img src="../images/logo.png" alt="logo" class="logo dyn-logo">
        <span class="brand-text">
          <strong data-dyn="academy_name" data-i18n="academy_name"></strong>
          <span data-i18n="system_name"></span>
        </span>
      </a>
      <nav class="admin-nav">
        ${navLinks}
        <div class="nav-divider"></div>
        <a href="../index.html"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span data-i18n="sd_backsite"></span></a>
        <a href="#" id="admin-logout-btn"><i class="fa-solid fa-right-from-bracket"></i> <span data-i18n="sd_logout"></span></a>
      </nav>`;
    document.getElementById('admin-logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '../login.html';
    });
  }
  if (topbarEl) {
    topbarEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="sidebar-toggle" id="sidebar-toggle"><i class="fa-solid fa-bars"></i></button>
        <h1 data-i18n="${titleKey}"></h1>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="icon-btn dark-mode-toggle-btn" id="dark-mode-toggle-btn" title="Dark Mode" style="display:none;"><i class="fa-solid fa-moon"></i></button>
        <div class="lang-switch">
          <button data-lang="en" onclick="nawahSetLang('en')">EN</button>
          <button data-lang="ar" onclick="nawahSetLang('ar')">AR</button>
        </div>
        <div class="admin-user-chip">
          <i class="fa-solid fa-circle-user"></i> ${escapeHtml(session.full_name)}
          <span class="role-tag" data-i18n="role_${session.role}"></span>
        </div>
      </div>`;
    const st = document.getElementById('sidebar-toggle');
    if (st) st.addEventListener('click', () => document.getElementById('admin-sidebar').classList.toggle('open'));
    const dm = document.getElementById('dark-mode-toggle-btn');
    if (dm) dm.addEventListener('click', toggleColorMode);
  }
  nawahApplyLang();
  applyDynamicBranding();
  return session;
}

document.addEventListener('nawah-lang-changed', () => {
  // re-apply role tag translation in topbar user chip if present
  const session = getSession();
  if (session) {
    document.querySelectorAll('.role-tag').forEach(t => {
      t.textContent = nawahT(`role_${session.role}`);
    });
  }
  applyDynamicBranding();
});
