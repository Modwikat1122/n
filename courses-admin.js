/* ==========================================================================
   NAWAH Verify — Courses Management (admin)
   ========================================================================== */

let nawahAllCourses = [];
let nawahCoursesSession = null;

function escapeHtmlCo(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function canManageCourses() {
  return nawahCoursesSession && (nawahCoursesSession.role === 'administrator' || nawahCoursesSession.role === 'instructor');
}

function renderCoursesTable(list) {
  const tbody = document.getElementById('courses-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" data-i18n="no_results_title"></td></tr>`;
    nawahApplyLang();
    return;
  }
  const canManage = canManageCourses();
  tbody.innerHTML = list.map(c => `
    <tr>
      <td><strong>${escapeHtmlCo(c.course_name)}</strong></td>
      <td>${escapeHtmlCo(c.default_hours)} h</td>
      <td>${escapeHtmlCo(c.instructor)}</td>
      <td>
        <div class="action-icons">
          ${canManage ? `<button class="icon-btn" data-action="edit" data-id="${c.id}"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${nawahCoursesSession && nawahCoursesSession.role === 'administrator' ? `<button class="icon-btn danger" data-action="delete" data-id="${c.id}"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`).join('');
  nawahApplyLang();
  attachCourseActions();
}

async function loadCoursesTable() {
  nawahAllCourses = await apiGetAll('courses');
  renderCoursesTable(nawahAllCourses);
}

function attachCourseActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const course = nawahAllCourses.find(c => c.id === id);
      if (!course) return;
      if (action === 'edit') openEditCourseModal(course);
      if (action === 'delete') {
        if (!window.confirm(nawahT('confirm_delete'))) return;
        await apiDelete('courses', course.id);
        showToast(nawahT('toast_deleted'), 'success');
        loadCoursesTable();
      }
    });
  });
}

function openAddCourseModal() {
  clearAllFieldErrors(document.getElementById('course-form'));
  document.getElementById('course-modal-title').setAttribute('data-i18n', 'btn_add_course');
  document.getElementById('c-id-field').value = '';
  document.getElementById('c-course-name').value = '';
  document.getElementById('c-default-hours').value = '';
  document.getElementById('c-instructor').value = '';
  document.getElementById('c-description').value = '';
  document.getElementById('course-modal-overlay').classList.add('open');
  nawahApplyLang();
}
function openEditCourseModal(course) {
  clearAllFieldErrors(document.getElementById('course-form'));
  document.getElementById('c-id-field').value = course.id;
  document.getElementById('c-course-name').value = course.course_name || '';
  document.getElementById('c-default-hours').value = course.default_hours || '';
  document.getElementById('c-instructor').value = course.instructor || '';
  document.getElementById('c-description').value = course.description || '';
  document.getElementById('course-modal-overlay').classList.add('open');
  nawahApplyLang();
}

async function handleCourseFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('course-form');
  clearAllFieldErrors(form);
  const id = document.getElementById('c-id-field').value;

  if (!validateRequired(document.getElementById('c-course-name'))) {
    showToast(nawahT('validation_required'), 'error');
    return;
  }

  const payload = {
    course_name: document.getElementById('c-course-name').value.trim(),
    default_hours: Number(document.getElementById('c-default-hours').value) || 0,
    instructor: document.getElementById('c-instructor').value.trim(),
    description: document.getElementById('c-description').value.trim()
  };
  try {
    if (id) await apiUpdate('courses', id, payload);
    else await apiCreate('courses', payload);
    showToast(nawahT('toast_saved'), 'success');
    document.getElementById('course-modal-overlay').classList.remove('open');
    loadCoursesTable();
  } catch (err) {
    showToast('Error saving course', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  nawahCoursesSession = renderAdminLayout('courses.html', 'courses_title');
  if (!nawahCoursesSession) return;
  loadCoursesTable();

  const addBtn = document.getElementById('add-course-btn');
  if (!canManageCourses()) addBtn.style.display = 'none';
  addBtn.addEventListener('click', openAddCourseModal);
  document.getElementById('course-modal-cancel').addEventListener('click', () => document.getElementById('course-modal-overlay').classList.remove('open'));
  const courseSubmitBtn = document.querySelector('#course-form button[type="submit"]');
  document.getElementById('course-form').addEventListener('submit', guardSubmit(courseSubmitBtn, handleCourseFormSubmit));
  document.getElementById('course-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'course-modal-overlay') e.target.classList.remove('open');
  });
  document.getElementById('course-search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderCoursesTable(nawahAllCourses); return; }
    renderCoursesTable(nawahAllCourses.filter(c => (c.course_name || '').toLowerCase().includes(q)));
  });
});
document.addEventListener('nawah-lang-changed', () => {
  if (nawahAllCourses.length) renderCoursesTable(nawahAllCourses);
});
