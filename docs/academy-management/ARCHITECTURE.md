# Academy Management System — architecture

Status: Phase 0 audit (2026-10-17), updated as the implementation progresses.
Checkpoint before the work: commit `5709187` (tag `pre-academy-checkpoint`, branch `claude/clever-dirac-f7c6aa` on GitHub).

## 1. Current architecture (audit)

| Area | What exists (verified in the repository) |
| --- | --- |
| Monorepo | pnpm workspaces + turbo: `apps/api` (NestJS 10), `apps/web` (Next.js 15, React 19), `packages/shared` (zod schemas, DTO types, i18n dictionaries, pure domain rules) |
| Database | PostgreSQL via Prisma 6 (`apps/api/prisma/schema.prisma`, 11 migrations). `PrismaService` extends the client with the content-translation extension (`content-i18n.ts`) |
| API conventions | No global prefix; the browser calls `/api/*`, Next rewrites to NestJS. Errors: `{ code, message, details?, statusCode }` via `ApiException` helpers (`notFound`, `forbidden`, `conflict`, `badRequest`, `unprocessable`). Validation: `ZodPipe(schema)` with schemas from `@dacy/shared` |
| Authentication | JWT access token in an httpOnly cookie (`dacy_at`) + rotating refresh tokens (hash stored). `AuthGuard` (global) re-reads the user and role from the database on every request, so role changes and deleted accounts take effect immediately |
| Authorization | Global `Role` enum: `STUDENT`, `INSTRUCTOR`, `ADMIN`. `@Staff()` = INSTRUCTOR or ADMIN (content administration), `@AdminOnly()`. No resource-scoped permissions existed |
| Learning content | Track > Course > Module > Step (`StepType`: THEORY, QUIZ, SQL, PYTHON, TERMINAL, CTF). Public `config` vs server-only `secret` |
| Evaluation | QUIZ: scored on the server. CTF: answer hash compared on the server. SQL: the query runs in the browser (DuckDB-WASM); the server compares column names, row count and a row hash with the expected result computed on the server. PYTHON: tests run in the browser (Pyodide); **the server trusts the reported `passed` flag**. TERMINAL: Docker lab containers, check script run on the server |
| Progress / XP | `StepProgress` is canonical; `Submission` keeps every graded attempt; `XpEvent` is an append-only ledger with a per-user `dedupeKey` (XP for a step is granted once); `User.xpTotal` is a cache |
| Step access | Sequential courses lock steps; `StepUnlock` lets staff unlock a step for one student; learning endpoints require a course `Enrollment` |
| Files | Local disk storage adapter (`assets/storage.ts`: `saveToStorage`, `readFromStorage`, `removeFromStorage`), files served by authorized endpoints (`sendFile`). Path-project uploads use multer memory storage with a size limit, no content-type check |
| Notifications | No table: the bell is derived from existing records (`dashboard/notifications.service.ts`), unread = after `User.notificationsSeenAt` |
| Background jobs | None (no queue, no scheduler library). Lab expiry uses in-process timers |
| Audit | `AuditLog` table + `AuditService.record()` (failures never break the main operation) |
| Labs | `LabSession` + Docker driver: memory/CPU/PIDs limits, `CapDrop: ALL`, `no-new-privileges`, network `none` unless the step needs it, session expiry. Mock driver in tests |
| Tests | Shared: vitest (67). API: jest unit (11) + jest e2e against `DATABASE_URL_TEST` (16 suites, 132 tests). Web: vitest (9) + Playwright e2e. CI: `.github/workflows` |
| i18n | Azerbaijani default, English via `en.ts` (typed `Dictionary`, tests forbid Azerbaijani letters in English) |

## 2. Baseline (before any Academy code)

- `pnpm --filter @dacy/shared test` — 67 passed
- `pnpm --filter @dacy/api test` — 11 passed; `typecheck` clean
- `pnpm --filter @dacy/api test:e2e` — 16 suites / 132 tests passed (last full run 2026-10-06)
- `pnpm --filter @dacy/web test` — 9 passed; `typecheck` clean; `lint` 0 errors, 1 pre-existing warning (`import/no-anonymous-default-export`)
- Git: clean working tree at `5709187`

## 3. Reusable components and integration points

```
Existing user ───── AuthGuard / CurrentUser ─────────────► Academy controllers
Existing Step ───── ContentAdapter (search, validate, snapshot) ─► AssignmentItem (reference, never a copy)
Existing Submission / StepProgress / CtfSolve ── EvaluationAdapter ─► SubmissionItem evidence
Existing StepUnlock + Enrollment ── LearningAccessAdapter ─► student opens the step in the existing editor
Existing storage adapter ── AcademyFiles (staged uploads, content sniffing) ─► resources and answers
Existing AuditService ─────────────────────────────────► academy audit events
Existing bell (NotificationsService) ◄── AcademyNotification rows (one bell, one unread rule)
```

The Academy never writes `XpEvent`, never re-implements evaluation and never copies step content. XP is still granted by the existing learning engine when the student solves the step in the existing editor (once per step, whatever the number of groups).

## 4. Design decisions

1. **Modular monolith.** One NestJS module `apps/api/src/academy/` with sub-areas (access, programs/groups, assignments, submissions, grading, classes, notifications, analytics) and explicit adapters to the learning core (`academy/integrations/`). Pure domain rules (deadlines, scores, statuses, permissions) live in `packages/shared/src/academy/` so the web can display the same derived states; the server is always authoritative.
2. **Resource-scoped authorization.** Only `Role.ADMIN` is a global Academy privilege. The global `INSTRUCTOR` role (content staff) gives **no** Academy rights; Academy instructor rights come from an active `AcademyGroupInstructor` row (LEAD or ASSISTANT), student rights from an `AcademyEnrollment` and its status. Every check reads the database per request (no permission cache → removal/suspension is effective immediately).
3. **Identifiers are database-enforced.** Composite foreign keys guarantee that an answer can only reference an item of the same assignment, a grade can only select an attempt of its own submission, an attendance record or a submission can only exist for a student enrolled in that group, and rubric scores only use criteria of the same assignment.
4. **Scores are integers in hundredths of a point** (`…Centi` columns). Inputs are rounded half-up to 2 decimals; sums and penalties are exact.
5. **Immutable attempts.** A database trigger rejects `UPDATE` on submitted answers; new submissions create new attempts; an idempotency key per submission makes retries safe.
6. **Deadlines are server time.** Stored in UTC, displayed in the group timezone (default `Asia/Baku`). On-time means `submittedAt <= effectiveDueAt` (inclusive boundary everywhere).
7. **Python trust boundary.** Because Python results are self-reported by the browser, every automatic score is a *draft* grade; grades are visible to students only after an explicit release by a lead instructor or an admin.
8. **Reliable notifications without new infrastructure.** Domain changes write an `AcademyOutboxEvent` in the same transaction; an in-process worker turns events into `AcademyNotification` rows (unique `dedupeKey`), retries failures with backoff, and generates deadline reminders whose key includes the effective deadline (a changed deadline produces new reminders, old ones never conflict).
9. **Feature flag** `ACADEMY_MANAGEMENT_ENABLED` (env, default `true`). When off, Academy endpoints answer 404 `ACADEMY_DISABLED` and the navigation is hidden; nothing else changes. The flag is not an authorization mechanism.

## 5. Known limitations and security risks found

- Python evaluation is client-attested (pre-existing). Mitigation in the Academy: draft-only auto grades, instructor review, code visible in the review screen. Recommended future work: server-side Python evaluation in an isolated sandbox.
- SQL evaluation compares a client-computed result hash; forging it requires knowing the expected result (moderate trust).
- Path-project uploads (pre-existing) do not sniff content types; Academy uploads add an extension allowlist plus magic-byte checks and never execute files.
- The global `INSTRUCTOR` role can edit all course content (pre-existing design); Academy rights are deliberately independent of it.
- Docker-based terminal labs are not a hostile-code sandbox by themselves (pre-existing; documented in the lab docs). The Academy reuses them only through existing TERMINAL/CTF steps and adds file-based labs; no new execution service is introduced.

## 6. Implementation strategy

Additive only: new tables, new module, new pages. Existing tables are not altered except for optional summary fields in DTOs. Phases: (1) organization + authorization + flag, (2) assignments + deadlines, (3) submissions + files, (4) grading, (5) labs, (6) classes + attendance, (7) notifications, (8) analytics, (9) stabilization. Each phase ships with tests.

## 7. Rollback strategy

- Code: revert the Academy commits or reset the branch to `pre-academy-checkpoint` (never forced on shared branches; use a revert commit).
- Database: the Academy migration only creates new tables, enums, indexes and triggers. Rolling back = `DROP` of the `Academy*` tables/enums (script in `DATABASE.md`), which does not touch existing data. Take a backup first.
- Runtime: set `ACADEMY_MANAGEMENT_ENABLED=false` to hide and disable the module without a deployment of code.
