/* ==========================================================================
   NAWAH Verify — Settings (admin)
   ========================================================================== */

async function loadSettings() {
  const all = await apiGetAll('settings');
  const settings = all[0];
  if (!settings) return;
  document.getElementById('set-id-field').value = settings.id;
  document.getElementById('set-academy-name').value = settings.academy_name || '';
  document.getElementById('set-website').value = settings.website || '';
  document.getElementById('set-support-email').value = settings.support_email || '';
  document.getElementById('set-logo-url').value = settings.logo_url || '';
  document.getElementById('set-primary-color').value = settings.primary_color || '#0F3D7A';
  document.getElementById('set-secondary-color').value = settings.secondary_color || '#28A745';
  document.getElementById('set-footer-text').value = settings.footer_text || '';
  document.getElementById('set-cert-template').value = settings.certificate_template || 'classic';
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('set-id-field').value;
  const payload = {
    academy_name: document.getElementById('set-academy-name').value.trim(),
    website: document.getElementById('set-website').value.trim(),
    support_email: document.getElementById('set-support-email').value.trim(),
    logo_url: document.getElementById('set-logo-url').value.trim(),
    primary_color: document.getElementById('set-primary-color').value,
    secondary_color: document.getElementById('set-secondary-color').value,
    footer_text: document.getElementById('set-footer-text').value.trim(),
    certificate_template: document.getElementById('set-cert-template').value
  };
  try {
    if (id) {
      await apiUpdate('settings', id, payload);
    } else {
      await apiCreate('settings', payload);
    }
    showToast(nawahT('toast_settings_saved'), 'success');
  } catch (err) {
    showToast('Error saving settings', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const session = renderAdminLayout('settings.html', 'settings_title');
  if (!session) return;
  loadSettings();
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
});
