/* ==========================================================================
   NAWAH Verify — Verification Logs (admin)
   ========================================================================== */

let nawahAllLogs = [];

function escapeHtmlL(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function resultBadgeL(result) {
  const map = {
    verified: { cls: 'badge-active', icon: 'fa-circle-check', key: 'result_verified' },
    not_found: { cls: 'badge-revoked', icon: 'fa-circle-xmark', key: 'result_not_found' },
    revoked: { cls: 'badge-revoked', icon: 'fa-ban', key: 'result_revoked' },
    expired: { cls: 'badge-expired', icon: 'fa-clock', key: 'result_expired' }
  };
  const m = map[result] || map.not_found;
  return `<span class="badge ${m.cls}"><i class="fa-solid ${m.icon}"></i> ${nawahT(m.key)}</span>`;
}

function renderLogsTable(list) {
  const tbody = document.getElementById('logs-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" data-i18n="no_results_title"></td></tr>`;
    nawahApplyLang();
    return;
  }
  tbody.innerHTML = list.map(l => `
    <tr>
      <td><strong>${escapeHtmlL(l.certificate_number)}</strong></td>
      <td>${formatDateTime(l.verification_date)}</td>
      <td>${escapeHtmlL(l.browser)}</td>
      <td>${escapeHtmlL(l.device)}</td>
      <td>${escapeHtmlL(l.country) || nawahT('none')}</td>
      <td>${resultBadgeL(l.result)}</td>
    </tr>`).join('');
  nawahApplyLang();
}

async function loadLogsTable() {
  nawahAllLogs = await apiGetAll('verification_logs');
  nawahAllLogs.sort((a, b) => new Date(b.verification_date || 0) - new Date(a.verification_date || 0));
  renderLogsTable(nawahAllLogs);
}

document.addEventListener('DOMContentLoaded', () => {
  const session = renderAdminLayout('logs.html', 'logs_title');
  if (!session) return;
  loadLogsTable();

  document.getElementById('log-search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderLogsTable(nawahAllLogs); return; }
    renderLogsTable(nawahAllLogs.filter(l =>
      (l.certificate_number || '').toLowerCase().includes(q) ||
      (l.browser || '').toLowerCase().includes(q) ||
      (l.device || '').toLowerCase().includes(q) ||
      (l.result || '').toLowerCase().includes(q)
    ));
  });
});
document.addEventListener('nawah-lang-changed', () => {
  if (nawahAllLogs.length) renderLogsTable(nawahAllLogs);
});
