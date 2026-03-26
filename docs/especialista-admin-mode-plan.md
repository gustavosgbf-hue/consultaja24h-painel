# Specialist panel review and minimal admin-mode flow

## 1) Current specialist panel sections (as-is)

### Login flow
- Full-screen login card (`#screen-login`) with:
  - email + password fields;
  - login submit (`fazerLogin` -> `POST /api/especialista/login`);
  - password recovery drawer (`enviarRecuperacao`);
  - forced password change modal (`#trocar-overlay`) when `precisa_trocar_senha` is returned.
- Session token and specialist payload are stored in `localStorage` (`esp_token`, `especialista`), and auto-restored on reload (`init`).

### Specialist session flow
- On successful login, app screen (`#screen-app`) is shown and navbar is hydrated with specialist identity (`nome`, `crm`, `especialidade`).
- Authenticated calls are centralized in `apiFetch`, injecting bearer token and forcing logout on `401`.
- Logout clears local storage and reloads page.

### Agenda / consultation flow
- Left rail agenda (`.agenda-col`):
  - filters: Hoje / Próximas / Histórico;
  - cards with status, modality, patient, specialty;
  - click card loads consultation details (`abrirConsulta`).
- Right detail (`.detalhe-col`):
  - empty state before selection;
  - selected consultation state with:
    - patient summary block;
    - action bar (start, cancel, end) depending on status;
    - tabs: Consulta / Avaliação / Prontuário;
    - video link management (Google Meet link);
    - clinical notes + autosave to consultation record;
    - prontuário generator and copy.

### Existing profile/config areas
- No dedicated “profile/config” screen exists in the specialist panel.
- Only identity presentation is in navbar plus security actions (forgot password / change temporary password).

### Current places where admin-only controls can fit with minimal disruption
- **Best existing anchors** (no layout redesign):
  1. Navbar right side (next to doctor identity and logout) for an admin-mode toggle.
  2. Agenda filter strip for an extra admin-only tab.
  3. Detail column for an admin-only panel using existing card/block visual style (`.sec-box`, tabs, modals, toasts).

---

## 2) Minimal admin mode to manage specialists (inside current panel)

## Primary goal
Enable an authenticated admin user to manage specialist lifecycle without logging in as that specialist and without creating a separate registration flow.

## Admin capabilities required
Inside specialist panel admin mode, admin must be able to:
1. View specialist records.
2. View pending specialist approvals.
3. Approve specialist.
4. Hide/show specialist profile.
5. Activate/deactivate specialist public visibility.
6. Clearly separate admin actions from specialist self-actions.

## Proposed minimal behavior
- Login stays the same endpoint and page.
- Backend returns role flags in login/session payload (future), e.g. `role: 'especialista' | 'admin'` + capabilities.
- If admin capability is present:
  - show a **Modo Admin** toggle in navbar;
  - reveal **Admin** agenda tab;
  - switch right detail area to specialist-management list and actions.
- If user is specialist-only:
  - no admin controls rendered;
  - current flow remains unchanged.

---

## 3) Reuse-first approach (no new dashboard)

- Keep **single page** (`especialista.html`) and all current sections.
- Add one **conditional admin surface** instead of building a new route/app.
- Reuse existing design language:
  - pills/tags for statuses;
  - `.sec-box` blocks;
  - existing modal pattern for confirmation actions;
  - existing toast feedback.

---

## 4) Best UI placement choice

## Recommended: **Admin-only tab + small navbar toggle**

### Why this is simplest
- The page already has a strong split (agenda left + detail right).
- Adding an admin-only “Admin” tab to the existing filter row is lower impact than introducing a separate dashboard.
- A small navbar toggle prevents accidental context confusion and clearly indicates operator mode.

### Concretely
1. Navbar right: add `Modo Admin` switch/badge shown only when `isAdmin`.
2. Agenda tabs:
   - keep Hoje/Próximas/Histórico;
   - add `Admin` tab only for admins.
3. When `Admin` tab active:
   - left rail shows specialist records list instead of consultations;
   - right panel shows specialist profile management card with actions.
4. Specialist self-actions (consultation operations) are hidden/disabled while in `Admin` tab.
5. Admin actions get explicit labels (`Ação administrativa`) and confirmation modal text to avoid confusion.

This keeps navigation mental model unchanged while adding a dedicated management space.

---

## 5) Coexistence with immediate-care doctor flow

- Admin operations in specialist panel must target **specialist attributes only**, never global doctor identity nor immediate-care status.
- A doctor shared across immediate-care and specialist should have independent flags (future backend model):
  - immediate-care eligibility/status;
  - specialist eligibility/status/visibility.
- UI copy should explicitly say “Especialista” in admin actions to avoid cross-flow ambiguity.

---

## 6) What to add in panel (UI-only scope for next implementation step)

## New state needed on frontend
- `isAdmin` / `canManageSpecialists` from session.
- `panelMode: 'assistencial' | 'admin'`.
- Admin list filter state (e.g., `pending`, `approved`, `hidden`, `inactive`).
- Selected specialist in admin mode.

## New visual components (minimal)
1. Navbar admin toggle/badge.
2. Agenda admin tab.
3. Admin list card renderer (specialists instead of consultations).
4. Admin detail block in right column with:
   - specialist identity summary;
   - status chips (approval, profile hidden, public active);
   - action buttons:
     - Aprovar especialista;
     - Ocultar/Mostrar perfil;
     - Ativar/Desativar visibilidade pública.
5. Confirmation modals for high-impact actions.
6. Audit hint text near buttons (“Ação administrativa”).

## Distinction between admin and specialist actions
- Visual prefix/badge for admin actions.
- Separate button groups:
  - assistencial actions remain bound to consultation detail;
  - admin actions appear only in admin mode.
- Optional lightweight activity line in UI (“Última ação admin: …”).

---

## 7) Future backend endpoints/actions required (for later step)

> Not implementing now; this is the panel contract needed later.

1. **Session/identity**
   - `GET /api/especialista/me` (or extend login response) with role/capabilities.

2. **List specialists for admin mode**
   - `GET /api/especialista/admin/especialistas?status=...&q=...`
   - Returns specialist records + specialist-specific status flags.

3. **Pending approvals**
   - Either dedicated endpoint or list filter:
     - `GET /api/especialista/admin/especialistas?status=pending_approval`

4. **Approve specialist**
   - `PUT /api/especialista/admin/especialistas/:id/aprovar`

5. **Hide/show specialist profile**
   - `PUT /api/especialista/admin/especialistas/:id/perfil-visibilidade`
   - Body: `{ hidden: true|false }`

6. **Activate/deactivate public specialist visibility**
   - `PUT /api/especialista/admin/especialistas/:id/visibilidade-publica`
   - Body: `{ ativo_publico: true|false }`

7. **(Optional but recommended) admin audit metadata in responses**
   - `updated_by_admin`, `updated_at`, `last_action` for UI feedback.

## Expected minimum data fields per specialist record
- `id`, `nome`, `email`, `crm`, `especialidade`.
- `approval_status` (`pending|approved|rejected` or equivalent).
- `profile_hidden` (boolean).
- `public_visibility_active` (boolean).
- Optional timestamps: `approved_at`, `updated_at`.

---

## Final recommendation
Use the current panel shell and add **Admin mode as a guarded extension** (navbar toggle + admin tab + right-side admin detail card). This satisfies all required management actions with the least UI disruption and keeps specialist care flow intact.
