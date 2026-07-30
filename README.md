# NAWAH Verify — Certificate Verification System
### For NAWAH Medical Academy (https://nawa.base44.app)

A bilingual (Arabic/English), responsive certificate verification platform in the style of international university/certification systems. Visitors verify certificates by number or QR code; admins manage certificates, students, courses, and view verification logs.

---

## ✅ Completed Features

**Public site**
- **Home** (`index.html`) — logo, hero title/subtitle, certificate-number quick-verify box, feature highlights, "how it works" steps.
- **Verify Certificate** (`verify.html`) — dedicated verification form.
- **Certificate Result** (`certificate.html?number=NMH-2026-000001`) — looks up the certificate and shows:
  - ✔ Verified (green), ❌ Not Found, 🔴 Revoked (with reason), ⏱️ Expired states
  - Organization, student name, certificate #, course, hours, instructor, issue/expiry date, status, live verification date/time
  - Auto-generated QR code (encodes **only** `https://nawa.base44.app/certificate/{number}` — no personal data)
  - Print button, "copy verification link", official verification footer note
  - Every lookup (found or not) is written to `verification_logs` automatically.
- **Search Certificate** (`search.html`) — search by certificate number or student name, with status badges and a "View Certificate" link per result.
- **Deep link support** — `404.html` catches paths like `/certificate/NMH-2026-000001` on static hosting and redirects to `certificate.html?number=...`, so the QR/deep-link format in the spec works without a server-side router.
- **Full bilingual UI** — language switcher (EN/AR) in the header, persisted in `localStorage`, RTL layout automatically applied for Arabic (`js/i18n.js`).

**Admin area** (`login.html` → `admin/*.html`)
- **Login** — demo credential-based auth against the `admin_users` table (client-side session via `sessionStorage`).
  - Administrator: `admin` / `Nawah@2026`
  - Instructor: `instructor` / `Instr@2026`
  - Viewer: `viewer` / `View@2026`
- **Dashboard** (`admin/dashboard.html`) — Total / Active / Revoked / Issued-this-month stat cards + recent verification activity table.
- **Certificates Management** (`admin/certificates.html`) — data table with View / Edit / Delete / Revoke / Restore / Generate QR / Download PDF actions; add/edit modal; quick search. QR codes and the verification URL are generated automatically on save. Role-based buttons (Viewer = read-only, Instructor = add/edit, Administrator = full control incl. delete).
- **Students** (`admin/students.html`) and **Courses** (`admin/courses.html`) management — simple CRUD tables + modals.
- **Verification Logs** (`admin/logs.html`) — full history: certificate #, date, browser, device, country, result.
- **Settings** (`admin/settings.html`) — academy name, logo URL, website, support email, primary/secondary color, footer text, certificate template.
- Sidebar navigation, topbar with user/role chip, logout, mobile-responsive collapsible sidebar.

**Design**
- Dark blue (#0F3D7A) + medical green (#28A745) + white/light-gray theme, Inter/Cairo fonts, Font Awesome icons, card-based UI with soft shadows and subtle animations, fully responsive (mobile/tablet/desktop).

---

## 🌐 Entry Points / Routes

| Page | Path | Notes |
|---|---|---|
| Home | `/index.html` | |
| Verify | `/verify.html` | |
| Certificate result | `/certificate.html?number=NMH-2026-000001` | also reachable via `/certificate/NMH-2026-000001` (through `404.html` fallback redirect) |
| Search | `/search.html` | |
| Admin login | `/login.html` | |
| Admin dashboard | `/admin/dashboard.html` | requires session |
| Certificates mgmt | `/admin/certificates.html` | requires session |
| Students mgmt | `/admin/students.html` | requires session |
| Courses mgmt | `/admin/courses.html` | requires session |
| Verification logs | `/admin/logs.html` | requires session |
| Settings | `/admin/settings.html` | requires session |

Sample certificate numbers to try: `NMH-2026-000001` (active), `NMH-2026-000004` (revoked), `NMH-2026-000005` (expired), `NMH-2026-999999` (not found).

---

## 🗄️ Data Model (RESTful Table API)

- **certificates** — `certificate_number` (unique), `student_name`/`student_name_ar`, `course_name`/`course_name_ar`, `instructor`, `training_hours`, `issue_date`, `expiry_date`, `status` (active/revoked/expired), `certificate_image`, `notes`, `revoke_reason`, `verification_url`.
- **verification_logs** — `certificate_number`, `verification_date`, `browser`, `device`, `country`, `result` (verified/not_found/revoked/expired).
- **students** — `full_name`/`full_name_ar`, `email`, `phone`, `national_id`, `notes`.
- **courses** — `course_name`/`course_name_ar`, `description`, `default_hours`, `instructor`.
- **admin_users** — `username`, `password` (demo-only, plaintext), `full_name`, `role` (administrator/instructor/viewer), `email`.
- **settings** — `academy_name`/`academy_name_ar`, `logo_url`, `website`, `support_email`, `primary_color`, `secondary_color`, `footer_text`/`footer_text_ar`, `certificate_template`.

All data is stored via the built-in RESTful Table API (`tables/{table}`), pre-seeded with realistic sample records for demo purposes.

---

## ⚠️ Not Yet Implemented / Known Limitations

- **Authentication is client-side only** (demo credential check against a table, session in `sessionStorage`) — this is **not** secure production authentication. A static site cannot host real server-side auth, password hashing, or protected APIs.
- **Country detection** in verification logs is left empty (no IP-geolocation service is wired in); can be added if the user supplies a CORS-enabled, key-free geolocation API.
- **Certificate image upload** — only a URL field is provided (no file upload/storage backend); users must host images externally and paste the URL.
- Route-level access control for `/admin/*` is enforced only in the browser (JS redirect), not by the hosting layer, since this is a static site — for real deployments with the Hosted platform, an access-control descriptor could be added if genuine authentication is required.

## 🚀 Suggested Next Steps

1. If real authentication/authorization is needed, consider the platform's Hosted access-control rules (login-gated routes) rather than the current demo, client-side check.
2. Wire a free/CORS-enabled geolocation API to populate the `country` field in verification logs.
3. Add bulk import (CSV) for certificates/students in the admin panel.
4. Add a public "certificate template preview" in Settings so admins can see template changes live.

---

## 🛠️ Tech Stack

- HTML5 / CSS3 (custom theme in `css/style.css`) / vanilla JavaScript (no framework)
- Font Awesome 6 (icons), Google Fonts (Inter + Cairo)
- `qrcode.js` (QR generation) and `jsPDF` (certificate PDF export) via jsDelivr CDN
- RESTful Table API for all data persistence

## 📁 File Structure

```
index.html            verify.html         search.html         login.html
certificate.html       404.html
css/style.css
js/
  i18n.js              (EN/AR dictionary + language switching)
  common.js            (API helpers, header/footer, auth, toast)
  certificate.js        search.js           dashboard.js
  certificates-admin.js students-admin.js   courses-admin.js
  logs-admin.js         settings-admin.js
admin/
  dashboard.html certificates.html students.html courses.html logs.html settings.html
images/logo.png
```

---

To deploy your website and make it live, please go to the **Publish tab** — it will handle deployment and give you the live URL.
