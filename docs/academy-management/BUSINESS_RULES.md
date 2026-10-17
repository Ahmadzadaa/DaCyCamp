# Academy Management System — business rules

Pure rules live in `packages/shared/src/academy/rules.ts` (unit-tested) and are applied by the API. The web uses
the same functions only for display; the server is always authoritative.

## Sign-up: Camp or Academy

- The sign-up page first asks for the path. **DaCy Camp**: an ordinary account (courses, labs, roadmap) — no
  Academy menu. **DaCy Academy**: the student enters the group's join code; the account is created and the student
  is enrolled in that group as `ACTIVE` in one step. Academy students keep full Camp access.
- Every group gets its own random join code when it is created (existing groups received one in the migration).
  DE-001 and DE-002 therefore have different codes, and a code always leads to exactly one group.
- The admin sees the code (and a sign-up link with the code filled in, `/qeydiyyat?kod=…`) on the group page and in
  the group list, can copy it, generate a new one, or switch joining off.
- Joining is possible while the group is `PLANNED` or `ACTIVE`, the code is switched on and the program is not
  archived; capacity counts `PENDING`, `ACTIVE` and `PAUSED` seats. A `PENDING` enrollment becomes `ACTIVE`.
- A Camp user who receives a code later joins from the profile page or the empty «Mənim akademiyam» page.
- Teacher accounts (`TEACHER`) are created by the admin (Admin → Akademiya → «Müəllim hesabları», or the users page).
  They sign in with their own email and password, land on «Müəllim paneli» and see a group once the admin assigns
  them. A teacher account cannot join a group as a student.

## Time and deadlines

- All decisions use the **server clock**; times are stored in UTC and shown in the group timezone (default `Asia/Baku`).
- `effectiveDue = max(dueAt, extendedDueAt)` — an extension can only move a student's deadline later; it applies to that student only.
- **Boundary is inclusive:** a submission is on time when `now <= effectiveDue`.
- Late policies: `REJECT` (409 `ACADEMY_DEADLINE_PASSED` after the deadline), `ACCEPT` (late flag, no penalty),
  `ACCEPT_WITH_PENALTY` (late flag + penalty). `lateCutoffAt` closes late submission completely
  (`effectiveCutoff = max(lateCutoffAt, effectiveDue)`; 409 `ACADEMY_CUTOFF_PASSED`).
- Before `availableAt`: 409 `ACADEMY_NOT_OPEN`. The window is checked again inside the locked transaction with the
  acceptance time.
- Extensions require a reason, must be later than the original due date and need an ACTIVE or PAUSED enrollment.
  Granting / changing / removing one is audited (previous value kept) and notifies the student.

## Submissions and attempts

- Only students with an **ACTIVE** enrollment, in an **ACTIVE** group, on a **PUBLISHED** assignment can submit.
- Every non-platform item (TEXT, CODE, LINK, FILE) needs an answer; answers must match the item kind; answers for
  items of another assignment are rejected (also impossible at database level).
- Attempt numbers are sequential per submission and assigned under a row lock (`SELECT … FOR UPDATE`).
- **Idempotency:** the client sends an `idempotencyKey`; a repeated request with the same key (double click,
  network retry, concurrent duplicate) returns the original receipt with HTTP 200 and `replayed: true`.
- **Attempt limit:** `maxAttempts` (default 3). Exception: after a grade is **RETURNED**, one extra attempt is allowed
  until the student resubmits. After a grade is **RELEASED**, no new attempts (409 `ACADEMY_ALREADY_GRADED`).
- Attempts and answers are immutable (database triggers). A draft is not an attempt and is deleted on submit.
- Files: staged first (owner + assignment), attached atomically to the attempt; attached files cannot be deleted.
  Staged files older than 24 hours are removed by the worker unless referenced by a draft of a published assignment.

## Platform challenges (LEARNING_STEP items)

- The item references an existing step (no copy). The student opens it in the existing editor; the Academy enrolls
  the student in the course and unlocks the step if the course is sequential.
- Evidence is chosen **by the server** from the student's own records only; the client never sends a score:
  - QUIZ: best score in the window (partial credit = score %), SQL / PYTHON / TERMINAL: latest passing submission
    in the window, THEORY: step completed, CTF: share of task points solved.
  - Window for repeatable types: `[availableAt, submission time]`; one-time types (THEORY, CTF) are accepted whenever done.
- Item score = `round(itemMax × ratio)` in hundredths; attempt `autoScore` = sum of platform item scores.
- Trust levels shown to staff: QUIZ, CTF, TERMINAL = SERVER_VERIFIED; SQL = SERVER_CHECKED; PYTHON = CLIENT_ATTESTED;
  THEORY = COMPLETION.
- **XP is separate:** the existing engine grants XP once per step when the challenge is solved; Academy grades never
  create or change XP, and solving a challenge shared by several groups does not grant XP twice.

## Grading

- Scores in hundredths; inputs rounded half-up to 2 decimals (`toCenti`). Each item score is between 0 and the item
  maximum (also enforced by triggers).
- Without a rubric: raw = sum of item scores; platform items default to the selected attempt's server score
  (the instructor may override); manual items must be scored.
- With a rubric: all criteria must be scored; raw = rubric total (rubric total must equal the assignment maximum;
  the rubric is locked once grading has started).
- **Late penalty:** `penalty = floor((raw × p + 50) / 100)` in hundredths, i.e. raw × p% rounded half-up;
  `final = raw − penalty`. Applies only to late attempts under `ACCEPT_WITH_PENALTY`.
- **Attempt selection:** LATEST_ATTEMPT (default), HIGHEST_SCORE (highest auto score, latest on ties) or
  INSTRUCTOR_SELECTED. A grade is **stale** when an attempt was submitted after the grade was written (choosing an older attempt on
  purpose is not stale); stale grades cannot be released.
- **Optimistic locking:** grade writes carry `expectedVersion`; a concurrent change returns 409 `ACADEMY_VERSION_CONFLICT`.
- Automatic grading (only platform items allowed): each attempt updates a DRAFT grade in the same transaction unless an
  instructor already graded it manually or it was released / returned.
- Grades are visible to students **only after release** (lead or admin). Assistants can write drafts but cannot
  release or return. Changing a released grade requires a reason, stays released, re-notifies the student and is
  audited with before / after values. Every change is stored in `AcademyGradeHistory`.

## Classes and attendance

- Weekly schedules are expanded in the group timezone (daylight-saving aware); at most 200 sessions per schedule; each
  session is a separate row, so moving one class does not affect others.
- Rescheduling sets RESCHEDULED and notifies; cancelling sets CANCELLED, hides the meeting link and notifies.
- A session with attendance cannot be deleted (cancel instead). Attendance can be recorded from 15 minutes before the
  start, never for cancelled sessions, and only for ACTIVE or PAUSED students of that group.

## Notifications

- Domain events are written to `AcademyOutboxEvent` in the same transaction as the change. The worker
  (`ACADEMY_WORKER_INTERVAL_SEC`, default 30 s; 0 = off) converts them to `AcademyNotification` rows with a per-user
  `dedupeKey`, so retries never duplicate. Failures retry with exponential backoff (30 s × 2ⁿ, max 1 h) and become
  FAILED after 5 attempts (visible in the admin overview).
- Recipients: enrollment → the student; published / updated assignment → ACTIVE students; extension, receipt,
  return, grade release → that student; class rescheduled / cancelled → ACTIVE students. Instructors see a live
  counter of submissions awaiting review in the bell.
- Deadline reminders: 24 h and 3 h before the effective deadline, only to ACTIVE students without an attempt; only the
  nearest threshold is sent; the key includes the effective deadline, so a changed deadline yields new reminders.
- Titles are rendered in the reader's language at read time.

## Analytics (formulas)

- *Expected* assignments per student: visible (published / archived) and already open.
- *Completion* = Σ completed (≥ 1 attempt) / Σ expected, over ACTIVE students.
- *Average grade* = Σ released final points / Σ maximum points of those assignments (weighted by points).
- *Missed* = submission window closed with no attempt; *overdue* = effective deadline passed with no attempt
  (includes assignments that still accept late work).
- *Attendance* = (present + late) / (present + late + absent); excused and cancelled sessions are excluded.
- No data → `null` (shown as "—"), never 0 %. Flags (≥ 2 missed; attendance < 60 %) are for attention only; nothing is
  decided automatically.
- Pending review = has attempts and (no grade, an unconfirmed automatic draft, a stale draft, or a resubmission after return).
