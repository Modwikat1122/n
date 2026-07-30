/* ==========================================================================
   NAWAH Verify — Homepage dynamic content loader
   Pulls hero / mission / vision / about / stats / courses / partners /
   testimonials from the database. Falls back to i18n defaults when a
   section has no admin-entered content yet, so the page never looks broken.
   ========================================================================== */

function hpLang() { return nawahGetLang(); }
function hpText(row, field) {
  if (!row) return '';
  const lang = hpLang();
  const arField = field + '_ar';
  return (lang === 'ar' && row[arField]) ? row[arField] : (row[field] || '');
}
function hpEscape(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function starsHtml(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 5));
  let html = '';
  for (let i = 0; i < 5; i++) html += `<i class="fa-solid fa-star" style="${i < r ? '' : 'opacity:.25;'}"></i>`;
  return html;
}

async function loadHomepageSections() {
  try {
    const [sections, site] = await Promise.all([apiGetAll('homepage_sections'), getCachedSiteSettings()]);
    const byKey = {};
    (sections || []).forEach(s => { byKey[s.section_key] = s; });

    // Hero
    const hero = byKey.hero;
    if (hero && hero.active !== false) {
      const t = hpText(hero, 'title'); const st = hpText(hero, 'subtitle');
      if (t) { document.getElementById('hero-title').textContent = t; document.getElementById('hero-title').removeAttribute('data-i18n'); }
      if (st) { document.getElementById('hero-subtitle').textContent = st; document.getElementById('hero-subtitle').removeAttribute('data-i18n'); }
    }

    // Mission
    const mission = byKey.mission;
    if (mission && mission.active !== false && (hpText(mission, 'content') || hpText(mission, 'title'))) {
      document.getElementById('mission-section').style.display = '';
      document.getElementById('mission-title').textContent = hpText(mission, 'title') || nawahT('mission_title');
      document.getElementById('mission-content').innerHTML = hpText(mission, 'content');
    }

    // Vision
    const vision = byKey.vision;
    if (vision && vision.active !== false && (hpText(vision, 'content') || hpText(vision, 'title'))) {
      document.getElementById('vision-section').style.display = '';
      document.getElementById('vision-title').textContent = hpText(vision, 'title') || nawahT('vision_title');
      document.getElementById('vision-content').innerHTML = hpText(vision, 'content');
    }

    // About
    const about = byKey.about;
    if (about && about.active !== false && (hpText(about, 'content') || hpText(about, 'title'))) {
      document.getElementById('about-section').style.display = '';
      document.getElementById('about-title').textContent = hpText(about, 'title') || nawahT('about_title');
      document.getElementById('about-content').innerHTML = hpText(about, 'content');
      if (about.image_url) {
        const img = document.getElementById('about-image');
        img.src = resolveAssetUrl(about.image_url);
        img.style.display = '';
      }
    }

    // Section visibility toggles from site_settings
    const showStats = !site || site.homepage_show_stats !== false;
    const showCourses = !site || site.homepage_show_courses !== false;
    const showPartners = !site || site.homepage_show_partners !== false;
    const showTestimonials = !site || site.homepage_show_testimonials !== false;

    if (showStats) await loadHomepageStats();
    if (showCourses) await loadHomepageCourses();
    if (showPartners) await loadHomepagePartners();
    if (showTestimonials) await loadHomepageTestimonials();
  } catch (e) {
    console.error('loadHomepageSections failed', e);
  }
}

async function loadHomepageStats() {
  try {
    const stats = (await apiGetAll('homepage_stats')).filter(s => s.active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (!stats.length) return;
    const colors = ['var(--nawah-blue)', 'var(--nawah-green)', 'var(--nawah-red)', 'var(--nawah-amber)'];
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = stats.map((s, i) => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${colors[i % colors.length]};"><i class="fa-solid ${hpEscape(s.icon) || 'fa-chart-line'}"></i></div>
        <div class="stat-info"><strong>${hpEscape(s.value)}</strong><span>${hpEscape(hpText(s, 'label'))}</span></div>
      </div>`).join('');
    document.getElementById('stats-section').style.display = '';
  } catch (e) { console.error(e); }
}

async function loadHomepageCourses() {
  try {
    const courses = (await apiGetAll('courses')).slice(0, 8);
    if (!courses.length) return;
    const icons = ['fa-heart-pulse', 'fa-user-nurse', 'fa-syringe', 'fa-stethoscope', 'fa-kit-medical', 'fa-hospital'];
    const grid = document.getElementById('courses-grid');
    grid.innerHTML = courses.map((c, i) => `
      <div class="feature-card">
        <div class="icon"><i class="fa-solid ${icons[i % icons.length]}"></i></div>
        <h3>${hpEscape(c.course_name)}</h3>
        <p>${hpEscape(c.description) || (c.default_hours ? (c.default_hours + ' h') : '')}</p>
      </div>`).join('');
    document.getElementById('courses-section').style.display = '';
  } catch (e) { console.error(e); }
}

async function loadHomepagePartners() {
  try {
    const partners = (await apiGetAll('partners')).filter(p => p.active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (!partners.length) return;
    const slider = document.getElementById('partners-slider');
    slider.innerHTML = partners.map(p => {
      const logo = p.logo_url ? resolveAssetUrl(p.logo_url) : '';
      const name = hpEscape(hpText(p, 'name'));
      const desc = hpEscape(hpText(p, 'description'));
      const inner = `
        ${logo ? `<img src="${logo}" alt="${name}">` : `<div style="height:64px;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-building" style="font-size:1.8rem;color:var(--nawah-blue-light);"></i></div>`}
        <strong>${name}</strong>
        <p>${desc}</p>`;
      return p.website_url
        ? `<a class="partner-card" href="${hpEscape(p.website_url)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="partner-card">${inner}</div>`;
    }).join('');
    document.getElementById('partners-section').style.display = '';
  } catch (e) { console.error(e); }
}

async function loadHomepageTestimonials() {
  try {
    const items = (await apiGetAll('testimonials')).filter(t => t.active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (!items.length) return;
    const grid = document.getElementById('testimonials-grid');
    grid.innerHTML = items.map(t => {
      const avatar = t.avatar_url ? resolveAssetUrl(t.avatar_url) : (NAWAH_ASSET_BASE + 'images/logo.png');
      return `
      <div class="testimonial-card">
        <div class="stars">${starsHtml(t.rating)}</div>
        <p class="quote">&ldquo;${hpEscape(hpText(t, 'content'))}&rdquo;</p>
        <div class="person">
          <img src="${avatar}" alt="${hpEscape(hpText(t, 'name'))}">
          <div>
            <strong>${hpEscape(hpText(t, 'name'))}</strong>
            <span>${hpEscape(hpText(t, 'role'))}</span>
          </div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('testimonials-section').style.display = '';
  } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
  renderSiteHeader('index.html');
  renderSiteFooter();
  loadHomepageSections();

  document.getElementById('home-verify-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const val = document.getElementById('cert-number-input').value.trim();
    if (!val) return;
    window.location.href = `certificate.html?number=${encodeURIComponent(val)}`;
  });
});
document.addEventListener('nawah-lang-changed', () => {
  loadHomepageSections();
});
