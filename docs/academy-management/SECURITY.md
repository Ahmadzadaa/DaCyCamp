# Academy Management System — security

## Authentication

Unchanged: the existing JWT session cookie and the global `AuthGuard`, which reloads the user and role from the
database on every request. Academy routes have no anonymous access.

## Authorization model

- **Resource-scoped**, evaluated per request from the database (no permission cache): removing an instructor, pausing
  or withdrawing an enrollment, or archiving a group takes effect on the next request.
- Only `Role.ADMIN` is a global Academy privilege. The global `INSTRUCTOR` role gives **no** Academy rights (tested).
- Users come from the session, never from the request body, for all student endpoints (`/academy/me/...`).

| Action | Admin | Lead | Assistant | Student (by enrollment status) |
| --- | --- | --- | --- | --- |
| program / group / staff / enrollment management | ✓ | | | |
| view group, roster | ✓ | ✓ | ✓ | group: ACTIVE, COMPLETED |
| view all assignments, create and edit drafts | ✓ | ✓ | ✓ | |
| publish, edit published, change deadline, extend, cancel | ✓ | ✓ | | |
| review submissions, write draft grades | ✓ | ✓ | ✓ | |
| release / return grades | ✓ | ✓ | | |
| manage class schedule | ✓ | ✓ | | |
| record attendance, analytics | ✓ | ✓ | ✓ | |
| content and submit | | | | ACTIVE only |
| own records (grades, attendance) | | | | any status except PENDING |

A user cannot be both instructor and student of the same group (409). Cross-group access returns 403; unknown ids 404.

## Data isolation

- Students only ever receive their own submissions, grades and attendance; draft grades are never sent to students;
  returned grades expose feedback only.
- Platform evidence queries are always filtered by the student's own `userId` and by the assignment window.
- Composite foreign keys make cross-assignment / cross-group references impossible at database level
  (see [DATABASE.md](DATABASE.md)).
- Meeting links are returned only to active students of the group and to its staff; never for cancelled classes.

## Integrity

- Immutable attempts and answers (triggers); scores bounded by triggers and CHECK constraints.
- Idempotent submissions; attempt numbering, grading and capacity checks under row locks.
- Optimistic versions on assignments and grades.
- The client never sends scores or evaluation results for platform challenges.

## Files

- Extension allowlist: pdf, zip, docx, xlsx, pptx, png, jpg/jpeg, csv, txt, md, py, sql, json, ipynb. SVG and HTML are
  rejected (script carriers).
- Content checks: magic bytes for binary formats (PDF, PNG, JPEG, ZIP-based), valid UTF-8 without NUL bytes for text
  formats, valid JSON for json / ipynb. The MIME type is derived from the extension, never from the client.
- Size limit `ACADEMY_MAX_FILE_MB` (default 20) enforced by multer; at most 30 staged files per user and 20 resources
  per assignment.
- Storage keys are generated (`academy/<purpose>/<assignmentId>/<uuid>.<ext>`); the user's filename is sanitized and
  only stored as metadata.
- Downloads are authorized per file and always sent as `attachment` with `X-Content-Type-Options: nosniff` and
  `Cache-Control: private, no-store`. Files are never executed.

## Other controls

- Gradebook CSV export escapes cells starting with `=`, `+`, `-`, `@`, tab or CR (formula injection).
- Links in answers are rendered with `rel="noopener noreferrer nofollow"`; URLs must be `https` (or `http://localhost`);
  `javascript:` URLs are rejected by validation.
- Markdown (assignment descriptions, feedback) is rendered with the existing sanitized renderer.
- Audit log entries (`academy.*`) for organization changes, assignment changes (deadline changes with before/after),
  extensions, resources, grade writes / changes / releases / returns, sessions and attendance. No passwords or file
  contents are logged.
- Existing rate limits apply (300 requests/min per user, 20 logins/min per IP).
- The feature flag hides and disables the module; it is not an authorization mechanism.

## Remaining risks

- **Python results are client-attested** (pre-existing platform design). Mitigation: Academy auto grades are drafts and
  require explicit release; staff see the trust level. Recommended: server-side sandboxed Python evaluation.
- SQL results are compared with a client-computed hash (moderate trust).
- Uploaded files are not virus-scanned (no scanner available in this environment); they are never executed and are
  served only as downloads.
- The in-process worker runs in every API instance. This is safe (outbox claiming uses `FOR UPDATE SKIP LOCKED`,
  scheduled publishing is a conditional update, notifications and reminders are deduplicated by key) but the work is
  repeated per instance; in a scaled deployment run it on one instance (`ACADEMY_WORKER_INTERVAL_SEC=0` elsewhere).
