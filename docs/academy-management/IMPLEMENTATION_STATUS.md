# Academy Management System — implementation status

Legend: **✅ Implemented + tested** (automated tests) · **🟡 Implemented, not tested** (type-checked, built, no
automated test) · **🟠 Partial** · **⛔ Not implemented** · **🚫 Blocked**

Date: 2026-10-17 · Branch `claude/clever-dirac-f7c6aa` · Not deployed anywhere.

## Backend

| Requirement | Status | Notes |
| --- | --- | --- |
| Feature flag `ACADEMY_MANAGEMENT_ENABLED` | ✅ | 404 `ACADEMY_DISABLED`, summary null, bell hides Academy items |
| Programs, groups, lifecycle transitions | ✅ | |
| Instructors (one lead, assistants), resource-scoped permissions | ✅ | global INSTRUCTOR role grants nothing |
| Enrollments with capacity (row lock), history events | ✅ | |
| Assignment engine reusing existing challenges (no copy) | ✅ | search, snapshot, availability check |
| Custom / coding / file-based / project assignments | ✅ | TEXT, CODE, FILE, LINK items |
| Labs through the assignment engine | ✅ | LAB type with resources + deliverables + file items; existing TERMINAL / CTF steps can be items (🟡 not e2e-tested as items) |
| Versioned edits, revisions, optimistic locking | ✅ | |
| Publish now / scheduled (worker) | ✅ | |
| Deadlines, late policies, cutoff, per-student extensions | ✅ | inclusive boundary, server time |
| Opening a challenge from the Academy (enroll + unlock) | ✅ | |
| Submissions: immutable attempts, idempotency, attempt limit | ✅ | including concurrent races |
| Drafts | ✅ | |
| File uploads (staged, validated, authorized download, cleanup) | ✅ | no antivirus scan (see SECURITY.md) |
| Server-chosen evidence and trust levels | ✅ | |
| Grading: manual, automatic (draft), hybrid | ✅ / 🟡 | hybrid prefill of platform scores in the manual path is 🟡 |
| Rubrics | ✅ | locked after grading starts |
| Late penalty, rounding to hundredths | ✅ | |
| Attempt selection LATEST / HIGHEST / INSTRUCTOR_SELECTED | ✅ / 🟡 | LATEST and INSTRUCTOR_SELECTED ✅ e2e; HIGHEST_SCORE 🟡 (selection function unit-tested only; with server evidence auto scores never decrease, so it usually equals LATEST) |
| Release / return / change released grade with reason, history | ✅ | |
| Gradebook + CSV export | ✅ | |
| XP separated from academic grades | ✅ | asserted in tests |
| Class sessions, weekly schedules, reschedule / cancel | ✅ | |
| Attendance | ✅ | |
| Transactional outbox, worker, retries, notifications | ✅ | in-app only |
| Deadline reminders (24 h / 3 h, extension-aware) | ✅ | |
| Email / push notifications | ⛔ | no mail infrastructure in the project; in-app bell only |
| Analytics (group), instructor overview, admin overview | ✅ | formulas in BUSINESS_RULES.md |
| Audit log for Academy actions | ✅ | |
| Seed data for the two programs | ⛔ | optional; programs are created by the admin in the UI |
| Group join codes (random, per group, rotate / disable, admin-only) | ✅ | `academy-join.e2e-spec.ts` |
| Academy sign-up with a code (account + enrollment in one transaction, capacity under lock) | ✅ | including parallel sign-ups |
| Separate teacher account type `TEACHER` (no Camp staff rights) | ✅ | |

## Frontend

| Requirement | Status | Notes |
| --- | --- | --- |
| Navigation gated by role (student / teacher / admin) | ✅ | e2e (sidebar links) |
| MƏNİM AKADEMİYAM overview, assignments, detail, submit | ✅ | Playwright acceptance |
| Grades page | ✅ | Playwright acceptance |
| Schedule and attendance pages | 🟡 | |
| Labs filter | 🟡 | |
| MÜƏLLİM PANELİ overview, group workspace, assignment builder, publish | ✅ | Playwright acceptance |
| Grading page (save, release) | ✅ | Playwright acceptance; return button 🟡 |
| Extensions, rubric editor, resources, revisions UI | 🟡 | |
| Gradebook / analytics / sessions / attendance UI | 🟡 | |
| Admin Academy: KPIs, programs, groups, lead, enrollments | ✅ | Playwright acceptance |
| Admin: instructors management, group settings, course links | 🟡 | |
| Admin: program edit / archive UI, enrollment history UI, group dates / format / timezone edit UI | ⛔ | API exists (`PATCH /academy/programs/:id`, `/enrollments/:id/history`, `PATCH /academy/groups/:id`) |
| Azerbaijani primary, English complete (incl. error codes) | ✅ | English verified in the acceptance test; dictionary parity enforced by the compiler |
| Sign-up asks Camp / Academy; Academy form with code check and group preview; `?kod=` link | ✅ | Playwright `academy-join.spec.ts` |
| Join with a code from the profile page / empty «Mənim akademiyam» | 🟡 | API path ✅ (e2e); the web form itself is not covered by Playwright |
| Admin: join code box (copy, sign-up link, new code, on / off), code column in the group list | ✅ / 🟡 | display ✅ Playwright; copy / rotate / toggle buttons 🟡 (API ✅) |
| Admin: «Müəllim hesabları» (list + new teacher account) | ✅ | Playwright |
| Mobile layout | ✅ | Playwright at 390 px: no horizontal page overflow on student overview, assignments, grades, schedule, assignment detail and teacher pages; screenshots in `docs/screenshots/academy-mobile-*.png` |

## Documentation

ARCHITECTURE, DOMAIN_MODEL, DATABASE (incl. rollback script), API, BUSINESS_RULES, SECURITY, TESTING and this file. ✅

## Blocked

Nothing is blocked. Production deployment and production migrations were intentionally **not** performed.
