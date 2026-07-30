/* ==========================================================================
   NAWAH Verify — Search Certificate page logic
   ========================================================================== */

let nawahSearchMode = 'number';

function escapeHtmlS(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  if (!results || results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🔍</span>
        <h3 data-i18n="no_results_title"></h3>
        <p data-i18n="no_results_desc"></p>
      </div>`;
    nawahApplyLang();
    return;
  }
  const lang = nawahGetLang();
  container.innerHTML = results.map(cert => {
    const effective = computeEffectiveStatus(cert);
    const studentName = lang === 'ar' && cert.student_name_ar ? cert.student_name_ar : cert.student_name;
    const courseName = lang === 'ar' && cert.course_name_ar ? cert.course_name_ar : cert.course_name;
    return `
      <div class="result-item">
        <div class="r-info">
          <strong>${escapeHtmlS(studentName)}</strong>
          <span>${escapeHtmlS(cert.certificate_number)} · ${escapeHtmlS(courseName)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          ${statusBadgeHtml(effective)}
          <a href="certificate.html?number=${encodeURIComponent(cert.certificate_number)}" class="btn btn-primary btn-sm">
            <span data-i18n="view_certificate"></span>
          </a>
        </div>
      </div>`;
  }).join('');
  nawahApplyLang();
}

async function performSearch(query) {
  const container = document.getElementById('search-results');
  container.innerHTML = `<div class="text-center" style="padding:30px;"><i class="fa-solid fa-circle-notch spin" style="color:var(--nawah-blue);font-size:1.5rem;"></i></div>`;
  const all = await apiGetAll('certificates');
  const q = query.trim().toLowerCase();
  let results = [];
  if (!q) { renderSearchResults([]); return; }
  if (nawahSearchMode === 'number') {
    results = all.filter(c => (c.certificate_number || '').toLowerCase().includes(q));
  } else {
    results = all.filter(c =>
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.student_name_ar || '').toLowerCase().includes(q)
    );
  }
  renderSearchResults(results);
}

document.addEventListener('DOMContentLoaded', () => {
  renderSiteHeader('search.html');
  renderSiteFooter();

  const tabs = document.querySelectorAll('#search-tabs button');
  const input = document.getElementById('search-input');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      nawahSearchMode = tab.getAttribute('data-mode');
      const placeholderKey = nawahSearchMode === 'number' ? 'search_placeholder_number' : 'search_placeholder_name';
      input.setAttribute('data-i18n-placeholder', placeholderKey);
      input.setAttribute('placeholder', nawahT(placeholderKey));
      input.value = '';
      document.getElementById('search-results').innerHTML = '';
    });
  });

  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch(input.value);
  });
});
