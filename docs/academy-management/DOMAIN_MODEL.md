# Academy Management System — domain model

The Academy adds instructor-led education to the existing DaCy platform. It uses the same users, the same
login and the same learning engine. Platform content (tracks, courses, steps) is **referenced, never copied**.

## Entities

```
AcademyProgram (Data Engineering, Cyber Security …)
 └─ AcademyGroup (DE-001, CS-002 …; timezone, capacity, status)
     ├─ AcademyGroupInstructor (user + LEAD | ASSISTANT; removedAt; at most one active LEAD)
     ├─ AcademyEnrollment (student + status) ── AcademyEnrollmentEvent (status history)
     ├─ AcademyCourseLink (optional link to platform courses)
     ├─ AcademyAssignment (type, dates, late policy, attempts, grading type, version)
     │   ├─ AcademyAssignmentItem (LEARNING_STEP → existing Step | TEXT | CODE | FILE | LINK; max score)
     │   ├─ AcademyAssignmentExtension (one per student: extendedDueAt + reason)
     │   ├─ AcademyAssignmentRevision (snapshot per published version)
     │   ├─ AcademyRubric ── AcademyRubricCriterion
     │   ├─ AcademyFile (ASSIGNMENT_RESOURCE)
     │   ├─ AcademySubmissionDraft (one per student; not an attempt)
     │   └─ AcademySubmission (one per student) ── container
     │       ├─ AcademySubmissionAttempt (immutable; sequential number; idempotency key)
     │       │   └─ AcademySubmissionItem (answer per item; evidence for LEARNING_STEP)
     │       │       └─ AcademyFile (SUBMISSION; STAGED → ATTACHED)
     │       └─ AcademyGrade (one; DRAFT | RELEASED | RETURNED; version)
     │           ├─ AcademyGradeItem / AcademyRubricScore
     │           └─ AcademyGradeHistory (every change)
     └─ AcademyClassSession (single or weekly series) ── AcademyAttendance
AcademyOutboxEvent (domain events, same transaction as the change) → AcademyNotification (per user, deduplicated)
```

Existing tables referenced: `User` (all people), `Step` (platform challenges), `Course` (course links),
`Submission` (evidence of a solved platform challenge). XP (`XpEvent`, `User.xpTotal`) is never written by the Academy.

## Roles (resource-scoped)

| Actor | Source of the right | Scope |
| --- | --- | --- |
| Admin | global `Role.ADMIN` | everything in the Academy (not `student.*` actions) |
| Lead instructor | active `AcademyGroupInstructor` row with role LEAD | that group only |
| Assistant instructor | active `AcademyGroupInstructor` row with role ASSISTANT | that group only, reduced set |
| Student | `AcademyEnrollment` in the group, by status | that group only |

The global `INSTRUCTOR` role (course content staff) grants **no** Academy right. The full matrix is in
`packages/shared/src/academy/permissions.ts` and in [SECURITY.md](SECURITY.md).

## Lifecycles

**Group:** `PLANNED → ACTIVE | CANCELLED`, `ACTIVE → COMPLETED | CANCELLED`, `COMPLETED → ARCHIVED | ACTIVE`,
`CANCELLED → ARCHIVED | PLANNED`, `ARCHIVED` is final. Only an ACTIVE group accepts submissions; ARCHIVED and
CANCELLED groups are read-only.

**Enrollment:** `PENDING → ACTIVE | WITHDRAWN`, `ACTIVE → PAUSED | COMPLETED | WITHDRAWN`,
`PAUSED → ACTIVE | COMPLETED | WITHDRAWN`, `COMPLETED → ACTIVE`, `WITHDRAWN → ACTIVE | PENDING`.
PENDING, ACTIVE and PAUSED occupy a seat. Every change writes an `AcademyEnrollmentEvent`.

**Assignment:** `DRAFT → PUBLISHED` (publish now) or `DRAFT → SCHEDULED → PUBLISHED` (the worker publishes at
`availableAt`); `PUBLISHED | SCHEDULED → CANCELLED | ARCHIVED`. Drafts without submissions can be deleted.
Editing a published assignment increases `version` and stores a revision snapshot.

**Grade:** created as DRAFT (manual or automatic) → `RELEASED` (visible to the student) or `RETURNED`
(feedback only; the student may submit one more attempt). A RETURNED grade becomes DRAFT again when the
instructor re-grades. Changing a RELEASED grade keeps it RELEASED, requires a reason and is audited.

**Class session:** `SCHEDULED → RESCHEDULED` (time changed) `| CANCELLED | COMPLETED`.

## Student status (derived, never stored)

Computed by `deriveStudentStatus` (shared, used by the API and shown by the web):

| Status | Meaning |
| --- | --- |
| NOT_OPEN | `now < availableAt` |
| NOT_STARTED / IN_PROGRESS | open, no attempt yet (IN_PROGRESS when a draft exists); `overdue` flag when only late submission is still possible |
| SUBMITTED / SUBMITTED_LATE | latest attempt on time / late, not yet graded |
| UNDER_REVIEW | a DRAFT grade exists (manual or automatic) |
| RETURNED | grade returned for revision and no newer attempt |
| GRADED | grade RELEASED |
| MISSED | window closed (deadline, cutoff, closed assignment or group) without any attempt |
