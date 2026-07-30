/* ==========================================================================
   NAWAH Verify — Admin Dashboard logic
   ========================================================================== */

function escapeHtmlD(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function resultBadge(result) {
  const map = {
    verified: { cls: 'badge-active', icon: 'fa-circle-check', key: 'result_verified' },
    not_found: { cls: 'badge-revoked', icon: 'fa-circle-xmark', key: 'result_not_found' },
    revoked: { cls: 'badge-revoked', icon: 'fa-ban', key: 'result_revoked' },
    expired: { cls: 'badge-expired', icon: 'fa-clock', key: 'result_expired' }
  };
  const m = map[result] || map.not_found;
  return `<span class="badge ${m.cls}"><i class="fa-solid ${m.icon}"></i> ${nawahT(m.key)}</span>`;
}

async function loadDashboard() {
  const [certs, logs] = await Promise.all([apiGetAll('certificates'), apiGetAll('verification_logs')]);

  const total = certs.length;
  const active = certs.filter(c => computeEffectiveStatus(c) === 'active').length;
  const revoked = certs.filter(c => c.status === 'revoked').length;
  const now = new Date();
  const monthCount = certs.filter(c => {
    if (!c.issue_date) return false;
    const d = new Date(c.issue_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-revoked').textContent = revoked;
  document.getElementById('stat-month').textContent = monthCount;

  const sortedLogs = logs.slice().sort((a, b) => new Date(b.verification_date) - new Date(a.verification_date)).slice(0, 10);
  const tbody = document.getElementById('recent-activity-body');
  if (sortedLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" data-i18n="no_results_title"></td></tr>`;
  } else {
    tbody.innerHTML = sortedLogs.map(l => `
      <tr>
        <td><strong>${escapeHtmlD(l.certificate_number)}</strong></td>
        <td>${formatDateTime(l.verification_date)}</td>
        <td>${escapeHtmlD(l.browser)}</td>
        <td>${escapeHtmlD(l.device)}</td>
        <td>${resultBadge(l.result)}</td>
      </tr>`).join('');
  }
  nawahApplyLang();
}

document.addEventListener('DOMContentLoaded', () => {
  const session = renderAdminLayout('dashboard.html', 'dash_title');
  if (!session) return;
  loadDashboard();
});
document.addEventListener('nawah-lang-changed', () => {
  if (getSession()) loadDashboard();
});
