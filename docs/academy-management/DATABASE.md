# Academy Management System — database

Migration: `apps/api/prisma/migrations/20261017005426_academy_management/migration.sql` (additive only).
It creates **25 tables, 19 enums, 5 trigger functions / 5 triggers and 23 CHECK constraints**. No existing table,
column or row is altered or deleted. Foreign keys from Academy tables to existing tables: `User` (21),
`Step` (1, `SET NULL`), `Course` (1), `Submission` (1, `SET NULL`).

Applied in this environment to the local development database and the test database only. It has **not** been
applied to any production database.

## Tables

| Group | Tables |
| --- | --- |
| Organization | `AcademyProgram`, `AcademyGroup`, `AcademyGroupInstructor`, `AcademyEnrollment`, `AcademyEnrollmentEvent`, `AcademyCourseLink` |
| Assignments | `AcademyAssignment`, `AcademyAssignmentItem`, `AcademyAssignmentExtension`, `AcademyAssignmentRevision`, `AcademyRubric`, `AcademyRubricCriterion` |
| Submissions | `AcademySubmission`, `AcademySubmissionAttempt`, `AcademySubmissionItem`, `AcademySubmissionDraft`, `AcademyFile` |
| Grading | `AcademyGrade`, `AcademyGradeItem`, `AcademyGradeHistory`, `AcademyRubricScore` |
| Classes | `AcademyClassSession`, `AcademyAttendance` |
| Notifications | `AcademyOutboxEvent`, `AcademyNotification` |

## Integrity enforced by the database

- **Composite foreign keys** make cross-scope references impossible even for buggy code:
  - an answer (`AcademySubmissionItem`) references `(attemptId, assignmentId)` and `(itemId, assignmentId)` — an answer cannot point to an item of another assignment;
  - a submission, draft, extension and attendance record reference `(groupId, studentId)` → `AcademyEnrollment` — only students enrolled in that group;
  - a submission references `(assignmentId, groupId)`; a grade's selected attempt references `(selectedAttemptId, submissionId)` — only an attempt of the same submission;
  - grade items, rubric criteria and rubric scores carry `assignmentId` in their keys;
  - an attendance record references `(sessionId, groupId)`.
- **Unique constraints:** one active lead per group (`leadSlot`), one enrollment per (group, student), one submission per (assignment, student), unique (submission, attemptNumber) and (submission, idempotencyKey), one grade per submission, one notification per (user, dedupeKey), one attendance per (session, student).
- **CHECK constraints:** group dates and capacity; lead-slot consistency; assignment dates, cutoff ≥ due, penalty 0–100, attempts ≥ 1, max score > 0, version ≥ 1; item max score > 0 and LEARNING_STEP ⇔ step reference; attempt number ≥ 1; scores ≥ 0; grade `final = raw − penalty`, `penalty ≤ raw`; `RELEASED ⇒ releasedAt`; session end after start; file size ≥ 0 (empty files are rejected by the API).
- **Triggers:**
  - `AcademySubmissionAttempt_immutable` — a submitted attempt cannot be changed (only evaluation fields may be filled in);
  - `AcademySubmissionItem_immutable` — answers cannot be changed (only `learningSubmissionId → NULL` when the referenced platform submission is deleted);
  - `AcademyGradeItem_max`, `AcademyGrade_max`, `AcademyRubricScore_max` — a score cannot exceed the item / assignment / criterion maximum.
- The `(groupId, studentId)` foreign keys to the enrollment use `NO ACTION`, so deleting a user still cascades cleanly through the user-owned rows.

## Scores and time

- Scores are integers in hundredths of a point (`…Centi`). The API accepts and returns decimal points (2 decimals).
- All timestamps are UTC (`timestamp(3)`); the group timezone is stored on the group and used only for display and for weekly schedules.

## Backup before applying

```bash
pg_dump --format=custom --file=dacy-before-academy.dump "$DATABASE_URL"
pnpm --filter @dacy/api exec prisma migrate deploy   # applies the additive migration
```

## Rollback (removes Academy data only)

Disable the module first (`ACADEMY_MANAGEMENT_ENABLED=false`), take a backup, then run the script below in a
transaction. It drops only `Academy*` objects; platform data (users, courses, progress, XP, submissions) is untouched.
Finally remove the migration row so Prisma does not consider it applied.

```sql
BEGIN;
DROP TABLE IF EXISTS
  "AcademyNotification", "AcademyOutboxEvent", "AcademyAttendance", "AcademyClassSession",
  "AcademyRubricScore", "AcademyGradeHistory", "AcademyGradeItem", "AcademyGrade",
  "AcademyFile", "AcademySubmissionItem", "AcademySubmissionAttempt", "AcademySubmissionDraft", "AcademySubmission",
  "AcademyRubricCriterion", "AcademyRubric", "AcademyAssignmentRevision", "AcademyAssignmentExtension",
  "AcademyAssignmentItem", "AcademyAssignment", "AcademyCourseLink", "AcademyEnrollmentEvent",
  "AcademyEnrollment", "AcademyGroupInstructor", "AcademyGroup", "AcademyProgram"
  CASCADE;
DROP FUNCTION IF EXISTS academy_attempt_immutable(), academy_answer_immutable(),
  academy_grade_item_max(), academy_grade_max(), academy_rubric_score_max();
DROP TYPE IF EXISTS
  "AcademyProgramStatus", "AcademyGroupStatus", "AcademyLearningFormat", "AcademyInstructorRole",
  "AcademyEnrollmentStatus", "AcademyAssignmentType", "AcademyAssignmentStatus", "AcademyGradingType",
  "AcademyLatePolicy", "AcademyAttemptSelection", "AcademyItemKind", "AcademyEvaluationTrust",
  "AcademyEvaluationStatus", "AcademyGradeStatus", "AcademyClassStatus", "AcademyAttendanceStatus",
  "AcademyFilePurpose", "AcademyFileStatus", "AcademyOutboxStatus";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261017005426_academy_management';
COMMIT;
```

Uploaded Academy files live under `STORAGE_DIR/academy/` and can be removed separately after the rollback.
The rollback script has been reviewed but **not executed** in this environment (it is destructive by design).
