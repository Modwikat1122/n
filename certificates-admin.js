/* ==========================================================================
   NAWAH Verify — Certificates Management (admin)
   ========================================================================== */

let nawahAllCerts = [];
let nawahCurrentSession = null;

function escapeHtmlC(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function toDateInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function canEdit() {
  return nawahCurrentSession && (nawahCurrentSession.role === 'administrator' || nawahCurrentSession.role === 'instructor');
}
function canDelete() {
  return nawahCurrentSession && nawahCurrentSession.role === 'administrator';
}

function renderCertsTable(list) {
  const tbody = document.getElementById('certs-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" data-i18n="no_results_title"></td></tr>`;
    nawahApplyLang();
    return;
  }
  tbody.innerHTML = list.map(c => {
    const effective = computeEffectiveStatus(c);
    const canManage = canEdit();
    const canDel = canDelete();
    return `
    <tr>
      <td><strong>${escapeHtmlC(c.certificate_number)}</strong></td>
      <td>${escapeHtmlC(c.student_name)}</td>
      <td>${escapeHtmlC(c.course_name)}</td>
      <td>${escapeHtmlC(c.instructor)}</td>
      <td>${formatDate(c.issue_date)}</td>
      <td>${statusBadgeHtml(effective)}</td>
      <td>
        <div class="action-icons">
          <a class="icon-btn" href="../certificate.html?number=${encodeURIComponent(c.certificate_number)}" target="_blank" title="View"><i class="fa-solid fa-eye"></i></a>
          <button class="icon-btn" data-action="qr" data-id="${c.id}" title="QR"><i class="fa-solid fa-qrcode"></i></button>
          <button class="icon-btn" data-action="pdf" data-id="${c.id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
          ${canManage ? `<button class="icon-btn" data-action="edit" data-id="${c.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${canManage && c.status !== 'revoked' ? `<button class="icon-btn warn" data-action="revoke" data-id="${c.id}" title="Revoke"><i class="fa-solid fa-ban"></i></button>` : ''}
          ${canManage && c.status === 'revoked' ? `<button class="icon-btn success" data-action="restore" data-id="${c.id}" title="Restore"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
          ${canDel ? `<button class="icon-btn danger" data-action="delete" data-id="${c.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  nawahApplyLang();
  attachRowActions();
}

async function loadCertsTable() {
  nawahAllCerts = await apiGetAll('certificates');
  nawahAllCerts.sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0));
  renderCertsTable(nawahAllCerts);
}

function attachRowActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const cert = nawahAllCerts.find(c => c.id === id);
      if (!cert) return;
      if (action === 'qr') openQrModal(cert);
      if (action === 'pdf') downloadCertPdf(cert);
      if (action === 'edit') openEditModal(cert);
      if (action === 'revoke') await revokeCert(cert);
      if (action === 'restore') await restoreCert(cert);
      if (action === 'delete') await deleteCert(cert);
    });
  });
}

/* ---------------- Add/Edit Modal ---------------- */
function openAddModal() {
  clearAllFieldErrors(document.getElementById('cert-form'));
  document.getElementById('cert-modal-title').setAttribute('data-i18n', 'modal_add_cert');
  document.getElementById('cert-id-field').value = '';
  document.getElementById('f-student-name').value = '';
  document.getElementById('f-cert-number').value = '';
  document.getElementById('f-course-name').value = '';
  document.getElementById('f-instructor').value = '';
  document.getElementById('f-hours').value = '';
  document.getElementById('f-status').value = 'active';
  document.getElementById('f-issue-date').value = toDateInputValue(new Date().toISOString());
  document.getElementById('f-expiry-date').value = '';
  document.getElementById('f-image').value = '';
  document.getElementById('f-notes').value = '';
  document.getElementById('cert-modal-overlay').classList.add('open');
  nawahApplyLang();
}
function openEditModal(cert) {
  clearAllFieldErrors(document.getElementById('cert-form'));
  document.getElementById('cert-modal-title').setAttribute('data-i18n', 'modal_edit_cert');
  document.getElementById('cert-id-field').value = cert.id;
  document.getElementById('f-student-name').value = cert.student_name || '';
  document.getElementById('f-cert-number').value = cert.certificate_number || '';
  document.getElementById('f-course-name').value = cert.course_name || '';
  document.getElementById('f-instructor').value = cert.instructor || '';
  document.getElementById('f-hours').value = cert.training_hours || '';
  document.getElementById('f-status').value = cert.status || 'active';
  document.getElementById('f-issue-date').value = toDateInputValue(cert.issue_date);
  document.getElementById('f-expiry-date').value = toDateInputValue(cert.expiry_date);
  document.getElementById('f-image').value = cert.certificate_image || '';
  document.getElementById('f-notes').value = cert.notes || '';
  document.getElementById('cert-modal-overlay').classList.add('open');
  nawahApplyLang();
}
function closeCertModal() {
  document.getElementById('cert-modal-overlay').classList.remove('open');
}

async function handleCertFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('cert-form');
  clearAllFieldErrors(form);
  const id = document.getElementById('cert-id-field').value;
  const certNumber = document.getElementById('f-cert-number').value.trim();

  let valid = true;
  if (!validateRequired(document.getElementById('f-student-name'))) valid = false;
  if (!validateRequired(document.getElementById('f-cert-number'))) valid = false;
  if (!validateRequired(document.getElementById('f-course-name'))) valid = false;
  if (!valid) { showToast(nawahT('validation_required'), 'error'); return; }

  const taken = await isCertificateNumberTaken(certNumber, id || null);
  if (taken) {
    markFieldError(document.getElementById('f-cert-number'), nawahT('validation_duplicate_cert'));
    showToast(nawahT('validation_duplicate_cert'), 'error');
    return;
  }

  const payload = {
    student_name: document.getElementById('f-student-name').value.trim(),
    certificate_number: certNumber,
    course_name: document.getElementById('f-course-name').value.trim(),
    instructor: document.getElementById('f-instructor').value.trim(),
    training_hours: Number(document.getElementById('f-hours').value) || 0,
    status: document.getElementById('f-status').value,
    issue_date: document.getElementById('f-issue-date').value ? new Date(document.getElementById('f-issue-date').value).toISOString() : '',
    expiry_date: document.getElementById('f-expiry-date').value ? new Date(document.getElementById('f-expiry-date').value).toISOString() : '',
    certificate_image: document.getElementById('f-image').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
    verification_url: certificateVerifyUrl(certNumber)
  };
  try {
    if (id) {
      await apiUpdate('certificates', id, payload);
    } else {
      await apiCreate('certificates', payload);
    }
    showToast(nawahT('toast_saved'), 'success');
    closeCertModal();
    loadCertsTable();
  } catch (err) {
    showToast('Error saving certificate', 'error');
  }
}

/* ---------------- Revoke / Restore / Delete ---------------- */
async function revokeCert(cert) {
  const reason = window.prompt(nawahT('confirm_revoke'), '');
  if (reason === null) return;
  await apiUpdate('certificates', cert.id, { status: 'revoked', revoke_reason: reason });
  showToast(nawahT('toast_revoked'), 'success');
  loadCertsTable();
}
async function restoreCert(cert) {
  await apiUpdate('certificates', cert.id, { status: 'active', revoke_reason: '' });
  showToast(nawahT('toast_restored'), 'success');
  loadCertsTable();
}
async function deleteCert(cert) {
  if (!window.confirm(nawahT('confirm_delete'))) return;
  await apiDelete('certificates', cert.id);
  showToast(nawahT('toast_deleted'), 'success');
  loadCertsTable();
}

/* ---------------- QR ---------------- */
let nawahCurrentQrUrl = '';
function openQrModal(cert) {
  const url = certificateVerifyUrl(cert.certificate_number);
  nawahCurrentQrUrl = url;
  document.getElementById('qr-modal-url').textContent = url;
  const holder = document.getElementById('qr-modal-canvas-holder');
  holder.innerHTML = '';
  const canvas = document.createElement('canvas');
  holder.appendChild(canvas);
  QRCode.toCanvas(canvas, url, { width: 220, margin: 1, color: { dark: '#0F3D7A', light: '#ffffff' } });
  document.getElementById('qr-modal-overlay').classList.add('open');
}
function closeQrModal() {
  document.getElementById('qr-modal-overlay').classList.remove('open');
}
function downloadQrImage() {
  const canvas = document.querySelector('#qr-modal-canvas-holder canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'qr-code.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ---------------- PDF Export ---------------- */
function downloadCertPdf(cert) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Border
  doc.setDrawColor(15, 61, 122);
  doc.setLineWidth(3);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);
  doc.setLineWidth(1);
  doc.rect(32, 32, pageWidth - 64, pageHeight - 64);

  doc.setTextColor(15, 61, 122);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('NAWAH Medical Academy', pageWidth / 2, 90, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificate of Completion', pageWidth / 2, 120, { align: 'center' });

  doc.setFontSize(12);
  doc.text('This is to certify that', pageWidth / 2, 165, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(40, 167, 69);
  doc.setFont('helvetica', 'bold');
  doc.text(cert.student_name || '', pageWidth / 2, 200, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`has successfully completed the course`, pageWidth / 2, 230, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 61, 122);
  doc.text(cert.course_name || '', pageWidth / 2, 255, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Training Hours: ${cert.training_hours || 0}   |   Instructor: ${cert.instructor || ''}`, pageWidth / 2, 280, { align: 'center' });
  doc.text(`Certificate Number: ${cert.certificate_number}`, pageWidth / 2, 300, { align: 'center' });
  doc.text(`Issue Date: ${cert.issue_date ? new Date(cert.issue_date).toDateString() : ''}`, pageWidth / 2, 318, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`Verify at: ${certificateVerifyUrl(cert.certificate_number)}`, pageWidth / 2, pageHeight - 45, { align: 'center' });

  doc.save(`${cert.certificate_number}.pdf`);
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  nawahCurrentSession = renderAdminLayout('certificates.html', 'certs_title');
  if (!nawahCurrentSession) return;

  loadCertsTable();

  const addBtn = document.getElementById('add-cert-btn');
  if (!canEdit()) {
    addBtn.style.display = 'none';
  }
  addBtn.addEventListener('click', openAddModal);
  document.getElementById('cert-modal-cancel').addEventListener('click', closeCertModal);
  const certSubmitBtn = document.querySelector('#cert-form button[type="submit"]');
  document.getElementById('cert-form').addEventListener('submit', guardSubmit(certSubmitBtn, handleCertFormSubmit));
  document.getElementById('qr-modal-close').addEventListener('click', closeQrModal);
  document.getElementById('qr-download-btn').addEventListener('click', downloadQrImage);

  document.getElementById('cert-search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderCertsTable(nawahAllCerts); return; }
    const filtered = nawahAllCerts.filter(c =>
      (c.certificate_number || '').toLowerCase().includes(q) ||
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.course_name || '').toLowerCase().includes(q) ||
      (c.instructor || '').toLowerCase().includes(q)
    );
    renderCertsTable(filtered);
  });

  [document.getElementById('cert-modal-overlay'), document.getElementById('qr-modal-overlay')].forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
});
document.addEventListener('nawah-lang-changed', () => {
  if (nawahAllCerts.length) renderCertsTable(nawahAllCerts);
});
