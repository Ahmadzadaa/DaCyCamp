# Academy Management System — testing

## How to run

```bash
pnpm --filter @dacy/shared test                 # pure rules (vitest)
pnpm --filter @dacy/api test                    # API unit tests (jest)
pnpm --filter @dacy/api test:e2e                # API e2e against DATABASE_URL_TEST (jest, real PostgreSQL)
pnpm --filter @dacy/web test                    # web unit tests (vitest)
pnpm typecheck                                  # shared + API + web typecheck (turbo)
pnpm --filter @dacy/web lint                    # eslint
# browser acceptance (API on :4000 and web on :3000 must be running):
pnpm --filter @dacy/web e2e -- e2e/academy.spec.ts
```

The API e2e suites reset the **test** database (`DATABASE_URL_TEST`) and never touch the development or a
production database. The worker timer is disabled under `NODE_ENV=test`; tests call `runOnce()` / `processOutbox()`
directly with controlled clocks.

## Automated tests added

| Suite | Tests | Covers |
| --- | --- | --- |
| `packages/shared/src/__tests__/academy-rules.test.ts` | 38 | rounding to hundredths, final score and late penalty, rubric totals, deadline window (inclusive boundary, extensions, cutoff), attempt selection, derived student status, permission matrix, timezone conversion and DST, weekly schedule expansion, analytics helpers, schema validation, partial-update defaults regression, attempt limit with returned grade, score scaling, draft file mapping, file allowlist, stale-grade rule |
| `apps/api/test/academy-org.e2e-spec.ts` | 13 | feature flag, admin-only programs, groups, single lead, enrollments, concurrent capacity, instructor / student scoping, global INSTRUCTOR has no rights, paused enrollment and removed instructor lose access, lifecycle, course links, audit without secrets |
| `apps/api/test/academy-assignments.e2e-spec.ts` | 14 | step search, multi-item assignments referencing existing steps (no copy), validation, assistant cannot publish, outbox + revision on publish, student visibility, cross-group 403, versioned edits and conflicts, per-student extensions, opening a challenge (enrollment + unlock), challenge shared across groups, scheduled publishing, delete vs cancel, rubric totals, unavailable source step |
| `apps/api/test/academy-submissions.e2e-spec.ts` | 12 | file upload validation (type, magic bytes, UTF-8, JSON, empty), generated keys, authorized downloads, drafts with file mapping, answer validation, successful submit + receipt + outbox, idempotent replay, concurrent duplicate and concurrent limit race, DB immutability and composite FK, server-chosen evidence (window, own records only, no client scores), auto score, late / cutoff / extension, released grade blocks attempts, returned grade allows one resubmission, resources, closed group / paused enrollment, staged-file cleanup |
| `apps/api/test/academy-grading.e2e-spec.ts` | 13 | staff submission list, validation (range, missing, foreign item, rubric misuse, selection policy), assistant drafts and cannot release, release visibility, XP unchanged, changing a released grade (reason, audit before/after, version conflict), late penalty rounding, return + resubmission, automatic drafts, rubric grading, stale detection, bulk release, gradebook averages, CSV formula-injection protection, INSTRUCTOR_SELECTED (older attempt is not stale, foreign attempt rejected), DB score triggers, cancelled assignment read-only |
| `apps/api/test/academy-classes.e2e-spec.ts` | 8 | single sessions and permissions, weekly schedule in Asia/Baku, too long / empty schedules, reschedule one session, cancel, outbox, audit, meeting-link visibility, schedule ranges, attendance upsert and rules, DB composite FK, own attendance rates, delete rules, session detail endpoint, next class in overview |
| `apps/api/test/academy-notifications.e2e-spec.ts` | 10 | outbox → notifications, idempotent processing, duplicate events, retry with backoff → FAILED, bell integration (az / en, read state, feature flag), deadline reminders with extensions and no duplicates, scheduled publish by the worker, grade / return / class notifications, instructor review counter, analytics formulas, instructor and admin overviews, LAB assignments |
| `apps/api/test/academy-join.e2e-spec.ts` | 12 | join code visible to admins only, unique random codes, check (normalised input, group code is not a join code), Academy sign-up = account + ACTIVE enrollment + outbox + audit without the code, wrong code / full group create no account, Camp-only sign-up has no Academy, signed-in join and «already a member», 4 parallel sign-ups for 1 seat, rotate (old code dead, members stay, non-admin 403), disabled code, completed group, withdrawn student cannot rejoin, TEACHER account (no Camp admin rights, empty panel, cannot be a student, sees the group after assignment), role field ignored, feature flag |
| `apps/web/e2e/academy-join.spec.ts` (Playwright) | 6 | admin sees the group code; sign-up asks Camp / Academy; Academy + code lands in «Mənim akademiyam» with Camp open; wrong code shows an error and creates no account; Camp-only user has no Academy menu; admin creates a teacher account, the teacher lands on «Müəllim paneli» and sees the group after assignment; 390 px without horizontal overflow |
| `apps/web/e2e/academy.spec.ts` (Playwright) | 6 | full acceptance flow in the browser: admin creates program and group, assigns the lead, enrolls the student → teacher creates and publishes → student submits → teacher grades and releases → student sees the grade; mobile (390 px, no horizontal overflow); English UI |

Totals after the Academy work: shared 107 (67 before), API e2e 23 suites / 214 tests (16 / 132 before),
API unit 11 (unchanged), web unit 9 (unchanged), Playwright Academy 12 (6 + 6).

`e2e/phase4.spec.ts` and `e2e/student-flow.spec.ts` gained one step (choose «DaCy Camp» on the sign-up page), because
sign-up now asks for the path first.

## Not covered by automated tests

- Web UI flows other than the acceptance path (assignment editing, rubric editor, extensions UI, attendance UI,
  sessions UI, analytics tab, admin instructors / course links UI) — implemented and type-checked, exercised manually
  through screenshots only where stated in the report.
- The HIGHEST_SCORE policy through the API (the selection function itself is unit-tested).
- TERMINAL / CTF steps as assignment items end-to-end (the evidence adapter logic exists; e2e tests use SQL and QUIZ).
- Multi-instance worker behaviour.

## Regression of existing browser tests

The whole Playwright suite cannot run in one go against a single API instance: the existing login rate limit
(20 logins / minute / IP) returns 429 after ~20 logins. Run spec files separately (about one minute apart).
Result on 2026-10-17: all existing spec files pass this way; `screenshots.spec.ts` › "dərs ekranı" timed out once
waiting for the lab terminal and passed on an immediate rerun (lab timing, unrelated to the Academy).
