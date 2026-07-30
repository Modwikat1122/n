/* ==========================================================================
   NAWAH Verify — Students Management (admin)
   ========================================================================== */

let nawahAllStudents = [];
let nawahStudentsSession = null;

function escapeHtmlSt(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function canManageStudents() {
  return nawahStudentsSession && (nawahStudentsSession.role === 'administrator' || nawahStudentsSession.role === 'instructor');
}

function renderStudentsTable(list) {
  const tbody = document.getElementById('students-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" data-i18n="no_results_title"></td></tr>`;
    nawahApplyLang();
    return;
  }
  const canManage = canManageStudents();
  tbody.innerHTML = list.map(s => `
    <tr>
      <td><strong>${escapeHtmlSt(s.full_name)}</strong></td>
      <td>${escapeHtmlSt(s.email)}</td>
      <td>${escapeHtmlSt(s.phone)}</td>
      <td>${escapeHtmlSt(s.national_id)}</td>
      <td>
        <div class="action-icons">
          ${canManage ? `<button class="icon-btn" data-action="edit" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${nawahStudentsSession && nawahStudentsSession.role === 'administrator' ? `<button class="icon-btn danger" data-action="delete" data-id="${s.id}"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`).join('');
  nawahApplyLang();
  attachStudentActions();
}

async function loadStudentsTable() {
  nawahAllStudents = await apiGetAll('students');
  renderStudentsTable(nawahAllStudents);
}

function attachStudentActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const student = nawahAllStudents.find(s => s.id === id);
      if (!student) return;
      if (action === 'edit') openEditStudentModal(student);
      if (action === 'delete') {
        if (!window.confirm(nawahT('confirm_delete'))) return;
        await apiDelete('students', student.id);
        showToast(nawahT('toast_deleted'), 'success');
        loadStudentsTable();
      }
    });
  });
}

function openAddStudentModal() {
  clearAllFieldErrors(document.getElementById('student-form'));
  document.getElementById('student-modal-title').setAttribute('data-i18n', 'btn_add_student');
  document.getElementById('s-id-field').value = '';
  document.getElementById('s-full-name').value = '';
  document.getElementById('s-email').value = '';
  document.getElementById('s-phone').value = '';
  document.getElementById('s-national-id').value = '';
  document.getElementById('s-notes').value = '';
  document.getElementById('student-modal-overlay').classList.add('open');
  nawahApplyLang();
}
function openEditStudentModal(student) {
  clearAllFieldErrors(document.getElementById('student-form'));
  document.getElementById('student-modal-title').setAttribute('data-i18n', 'btn_add_student');
  document.getElementById('s-id-field').value = student.id;
  document.getElementById('s-full-name').value = student.full_name || '';
  document.getElementById('s-email').value = student.email || '';
  document.getElementById('s-phone').value = student.phone || '';
  document.getElementById('s-national-id').value = student.national_id || '';
  document.getElementById('s-notes').value = student.notes || '';
  document.getElementById('student-modal-overlay').classList.add('open');
  nawahApplyLang();
}

async function handleStudentFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('student-form');
  clearAllFieldErrors(form);
  const id = document.getElementById('s-id-field').value;

  let valid = true;
  if (!validateRequired(document.getElementById('s-full-name'))) valid = false;
  if (!validateEmail(document.getElementById('s-email'), false)) valid = false;
  if (!valid) { showToast(nawahT('validation_required'), 'error'); return; }

  const payload = {
    full_name: document.getElementById('s-full-name').value.trim(),
    email: document.getElementById('s-email').value.trim(),
    phone: document.getElementById('s-phone').value.trim(),
    national_id: document.getElementById('s-national-id').value.trim(),
    notes: document.getElementById('s-notes').value.trim()
  };
  try {
    if (id) await apiUpdate('students', id, payload);
    else await apiCreate('students', payload);
    showToast(nawahT('toast_saved'), 'success');
    document.getElementById('student-modal-overlay').classList.remove('open');
    loadStudentsTable();
  } catch (err) {
    showToast('Error saving student', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  nawahStudentsSession = renderAdminLayout('students.html', 'students_title');
  if (!nawahStudentsSession) return;
  loadStudentsTable();

  const addBtn = document.getElementById('add-student-btn');
  if (!canManageStudents()) addBtn.style.display = 'none';
  addBtn.addEventListener('click', openAddStudentModal);
  document.getElementById('student-modal-cancel').addEventListener('click', () => document.getElementById('student-modal-overlay').classList.remove('open'));
  const studentSubmitBtn = document.querySelector('#student-form button[type="submit"]');
  document.getElementById('student-form').addEventListener('submit', guardSubmit(studentSubmitBtn, handleStudentFormSubmit));
  document.getElementById('student-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'student-modal-overlay') e.target.classList.remove('open');
  });
  document.getElementById('student-search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderStudentsTable(nawahAllStudents); return; }
    renderStudentsTable(nawahAllStudents.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
    ));
  });
});
document.addEventListener('nawah-lang-changed', () => {
  if (nawahAllStudents.length) renderStudentsTable(nawahAllStudents);
});
