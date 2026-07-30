/* ==========================================================================
   NAWAH Verify — Certificate verification result page logic
   Supports: certificate.html?number=NMH-2026-000001
             /certificate/NMH-2026-000001 (via 404.html fallback redirect)
   ========================================================================== */

function getCertNumberFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('number')) return params.get('number');
  // Fallback: support /certificate/NMH-2026-000001 style paths directly
  const path = window.location.pathname;
  const match = path.match(/certificate\/([^/?#]+)/i);
  if (match && match[1]) return decodeURIComponent(match[1]);
  return '';
}

function buildQrCanvas(container, text) {
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  if (window.QRCode) {
    QRCode.toCanvas(canvas, text, { width: 168, margin: 1, color: { dark: '#0F3D7A', light: '#ffffff' } }, function (err) {
      if (err) console.error(err);
    });
  }
}

function renderNotFound(certNumber) {
  const area = document.getElementById('cert-result-area');
  area.innerHTML = `
    <div class="cert-card">
      <div class="cert-card-header notfound">
        <div class="badge-icon">❌</div>
        <h2 data-i18n="cert_notfound"></h2>
        <p data-i18n="cert_notfound_desc"></p>
      </div>
      <div class="cert-card-body text-center">
        <p style="color:var(--nawah-text-muted);">${certNumber ? `<strong>${escapeHtml(certNumber)}</strong>` : ''}</p>
        <div class="cert-actions">
          <a href="search.html" class="btn btn-outline"><i class="fa-solid fa-magnifying-glass"></i> <span data-i18n="nav_search"></span></a>
          <a href="verify.html" class="btn btn-primary"><i class="fa-solid fa-rotate"></i> <span data-i18n="btn_new_search"></span></a>
        </div>
      </div>
    </div>`;
  nawahApplyLang();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

async function renderCertificateResult(cert, effectiveStatus) {
  const area = document.getElementById('cert-result-area');
  const verifyUrl = certificateVerifyUrl(cert.certificate_number);
  const lang = nawahGetLang();
  const site = await getCachedSiteSettings();
  const showQr = !site || site.verification_show_qr !== false;
  const footerNote = (lang === 'ar' && site && site.certificate_footer_note_ar) ? site.certificate_footer_note_ar : (site && site.certificate_footer_note) || '';
  const studentName = lang === 'ar' && cert.student_name_ar ? cert.student_name_ar : cert.student_name;
  const courseName = lang === 'ar' && cert.course_name_ar ? cert.course_name_ar : cert.course_name;

  let headerClass = '', badgeIcon = '', titleKey = '', descHtml = '';
  if (effectiveStatus === 'revoked') {
    headerClass = 'revoked'; badgeIcon = '🔴'; titleKey = 'cert_revoked';
    descHtml = `<p data-i18n="cert_revoked_desc"></p>`;
  } else if (effectiveStatus === 'expired') {
    headerClass = 'expired'; badgeIcon = '⏱️'; titleKey = 'cert_expired';
    descHtml = `<p data-i18n="cert_expired_desc"></p>`;
  } else {
    headerClass = ''; badgeIcon = '✔️'; titleKey = 'cert_verified';
  }

  const statusValClass = effectiveStatus === 'active' ? 'status-active' : (effectiveStatus === 'revoked' ? 'status-revoked' : 'status-expired');
  const statusLabelKey = effectiveStatus === 'active' ? 'status_active' : (effectiveStatus === 'revoked' ? 'status_revoked' : 'status_expired');

  area.innerHTML = `
    <div class="cert-card">
      <div class="cert-card-header ${headerClass}">
        <div class="badge-icon">${badgeIcon}</div>
        <h2 data-i18n="${titleKey}"></h2>
        ${descHtml}
        <div class="status-pill"><i class="fa-solid fa-shield-halved"></i> <span data-i18n="${statusLabelKey}"></span></div>
      </div>
      <div class="cert-card-body">
        <div class="cert-org">
          <img src="images/logo.png" alt="logo" class="dyn-logo">
          <strong data-dyn="academy_name" data-i18n="academy_name"></strong>
          <span data-i18n="lbl_organization"></span>
        </div>

        ${effectiveStatus === 'revoked' && cert.revoke_reason ? `
        <div class="cert-field full" style="background:#fbe3e5;margin-bottom:18px;">
          <label data-i18n="revoke_reason_label"></label>
          <div class="val" style="color:var(--nawah-red);">${escapeHtml(cert.revoke_reason)}</div>
        </div>` : ''}

        <div class="cert-fields">
          <div class="cert-field full">
            <label data-i18n="lbl_student"></label>
            <div class="val">${escapeHtml(studentName || '')}</div>
          </div>
          <div class="cert-field">
            <label data-i18n="lbl_cert_number"></label>
            <div class="val">${escapeHtml(cert.certificate_number)}</div>
          </div>
          <div class="cert-field">
            <label data-i18n="lbl_hours"></label>
            <div class="val">${escapeHtml(cert.training_hours)} h</div>
          </div>
          <div class="cert-field full">
            <label data-i18n="lbl_course"></label>
            <div class="val">${escapeHtml(courseName || '')}</div>
          </div>
          <div class="cert-field">
            <label data-i18n="lbl_instructor"></label>
            <div class="val">${escapeHtml(cert.instructor || '')}</div>
          </div>
          <div class="cert-field">
            <label data-i18n="lbl_status"></label>
            <div class="val ${statusValClass}" data-i18n="${statusLabelKey}"></div>
          </div>
          <div class="cert-field">
            <label data-i18n="lbl_issue_date"></label>
            <div class="val">${formatDate(cert.issue_date)}</div>
          </div>
          <div class="cert-field">
            <label data-i18n="lbl_expiry_date"></label>
            <div class="val">${cert.expiry_date ? formatDate(cert.expiry_date) : nawahT('none')}</div>
          </div>
          <div class="cert-field full">
            <label data-i18n="lbl_verify_date"></label>
            <div class="val">${formatDateTime(new Date().toISOString())}</div>
          </div>
        </div>

        ${showQr ? `
        <div class="qr-block">
          <label style="display:block;font-weight:700;color:var(--nawah-blue);margin-bottom:10px;" data-i18n="lbl_qr"></label>
          <div id="qr-canvas-holder"></div>
          <p data-i18n="scan_note"></p>
        </div>` : ''}

        ${effectiveStatus === 'active' ? `
        <div class="verified-badge">
          <i class="fa-solid fa-circle-check" style="font-size:1.3rem;"></i>
          <span data-i18n="verified_badge"></span>
        </div>` : ''}

        <div class="cert-footer-note" ${footerNote ? '' : 'data-i18n="official_note"'}>${footerNote ? escapeHtml(footerNote) : ''}</div>

        <div class="cert-actions">
          <button class="btn btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> <span data-i18n="btn_print"></span></button>
          <button class="btn btn-outline" id="copy-link-btn"><i class="fa-solid fa-link"></i> <span data-i18n="copy_link"></span></button>
          <a href="verify.html" class="btn btn-primary"><i class="fa-solid fa-rotate"></i> <span data-i18n="btn_new_search"></span></a>
        </div>
      </div>
    </div>`;

  if (showQr) buildQrCanvas(document.getElementById('qr-canvas-holder'), verifyUrl);
  nawahApplyLang();
  applyDynamicBranding();

  document.getElementById('copy-link-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      showToast(nawahT('copied'), 'success');
    } catch (e) {
      showToast(verifyUrl, 'info');
    }
  });
}

async function initCertificatePage() {
  const certNumber = getCertNumberFromUrl();
  if (!certNumber) {
    renderNotFound('');
    return;
  }
  try {
    const cert = await findCertificateByNumber(certNumber);
    if (!cert) {
      renderNotFound(certNumber);
      await logVerification(certNumber, 'not_found');
      return;
    }
    const effectiveStatus = computeEffectiveStatus(cert);
    await renderCertificateResult(cert, effectiveStatus);
    await logVerification(certNumber, effectiveStatus === 'active' ? 'verified' : effectiveStatus);
  } catch (e) {
    console.error(e);
    renderNotFound(certNumber);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderSiteHeader('verify.html');
  renderSiteFooter();
  initCertificatePage();
});
document.addEventListener('nawah-lang-changed', () => {
  // re-render fully to reflect localized names/status text properly
  initCertificatePage();
});
