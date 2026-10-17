# Academy Management System — API

All routes are under `/academy` (the browser calls `/api/academy/...`; Next.js rewrites to NestJS). Every route
except the three public join routes below requires a signed-in user (global `AuthGuard`) and passes `AcademyEnabledGuard` (404 `ACADEMY_DISABLED` when
`ACADEMY_MANAGEMENT_ENABLED=false`). Bodies and queries are validated with zod schemas from
`packages/shared/src/academy/schemas.ts` (400 `VALIDATION_FAILED`). Permissions are resource-scoped and checked
on every request from the database; "Action" refers to `packages/shared/src/academy/permissions.ts`.

Errors use the platform format `{ code, message, details?, statusCode }`. Academy codes start with `ACADEMY_`
and are translated in both dictionaries (`errors.ACADEMY_*`). Main ones: 403 `ACADEMY_FORBIDDEN` /
`ACADEMY_ADMIN_ONLY`; 404 `ACADEMY_*_NOT_FOUND`; 409 conflicts (`ACADEMY_VERSION_CONFLICT`, `ACADEMY_ATTEMPT_LIMIT`,
`ACADEMY_DEADLINE_PASSED`, `ACADEMY_CUTOFF_PASSED`, `ACADEMY_NOT_OPEN`, `ACADEMY_GROUP_CLOSED`,
`ACADEMY_CAPACITY_REACHED`, `ACADEMY_GRADE_STALE` …); 422 domain validation (`ACADEMY_ITEM_MISMATCH`,
`ACADEMY_ANSWER_REQUIRED`, `ACADEMY_FILE_TYPE`, `ACADEMY_FILE_CONTENT`, `ACADEMY_SCORE_OUT_OF_RANGE`,
`ACADEMY_RUBRIC_MISMATCH` …).

## Organization (admin)

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET / POST | `/academy/programs` | admin | list / create (409 `ACADEMY_SLUG_TAKEN`) |
| PATCH | `/academy/programs/:id` | admin | partial update |
| GET | `/academy/groups` | admin: all; others: groups they teach or are enrolled in | paged `{ items, total, page, pageSize }` |
| POST | `/academy/groups` | admin | with optional lead + assistants |
| GET | `/academy/groups/:id` | anyone related to the group | includes `permissions` and `myRole` |
| PATCH | `/academy/groups/:id` | admin | status transitions validated; capacity ≥ occupied seats |
| POST | `/academy/groups/:id/instructors` | admin | `{ userId, role }`; one active lead |
| DELETE | `/academy/groups/:id/instructors/:userId` | admin | rights end immediately |
| GET | `/academy/groups/:id/students` | `group.viewRoster` (staff) | paged |
| POST | `/academy/groups/:id/enrollments` | admin | `{ userId \| email, status? }`; capacity checked under a row lock |
| PATCH | `/academy/enrollments/:id` | admin | `{ status, reason? }`; history event |
| GET | `/academy/enrollments/:id/history` | the student or roster viewers | |
| GET / PUT | `/academy/groups/:id/courses` | view: group members; edit: admin | linked platform courses |
| POST | `/academy/groups/:id/join-code/rotate` | admin | new random join code; the old one stops working at once; audit records the fact, not the code |

The group DTO contains `joinCode` and `joinEnabled` **only for admins**. `PATCH /academy/groups/:id` accepts
`joinEnabled` (open / close joining with the code).

## Joining with a group code

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | `/academy/join/status` | public | `{ enabled: true }`; 404 when the module is off (the sign-up page hides the Academy option) |
| POST | `/academy/join/check` | public, 20 / min / IP | `{ code }` → `{ group: { code, name, startAt, format }, program: { title } }`; 422 `ACADEMY_JOIN_CODE_INVALID`, 409 `ACADEMY_JOIN_CLOSED` |
| POST | `/academy/join/register` | public, 20 / min / IP | `{ name, email, password, code }` → `{ user, joined }` + session cookies. The account and the ACTIVE enrollment are created in **one transaction**: if the code is wrong, joining is closed or the group is full, no account is created |
| POST | `/academy/join` | signed-in, 20 / min | `{ code }` → `{ groupId, groupCode, groupName }`; for Camp users who receive a code later. 409 `ACADEMY_ALREADY_MEMBER`, `ACADEMY_JOIN_NOT_ALLOWED` (withdrawn / completed — only the admin can re-enroll), `ACADEMY_TEACHER_ACCOUNT` |

Codes are 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I), generated with `crypto.randomInt`;
input is normalised (case, spaces and dashes ignored), so `k7q4-xp9m` equals `K7Q4XP9M`. The group's own code
(`DE-002`) is not a join code.

## Assignments (staff)

| Method | Path | Action | Notes |
| --- | --- | --- | --- |
| GET | `/academy/steps/search` | admin or any active instructor | published steps of published courses (`q`, `courseId`, `topicId`, `type`, `level`, `limit`) |
| GET / POST | `/academy/groups/:id/assignments` | `assignment.viewAll` / `assignment.createDraft` | list with statistics / create DRAFT |
| GET | `/academy/assignments/:id` | `assignment.viewAll` | staff view incl. rubric |
| PATCH | `/academy/assignments/:id` | `editDraft` / `editPublished`; deadline fields need `changeDeadline` | `expectedVersion` → 409 on conflict; items locked once attempts or grades exist |
| DELETE | `/academy/assignments/:id` | `editDraft` | drafts without submissions only |
| POST | `/academy/assignments/:id/publish` | `assignment.publish` | `{ mode: 'now' \| 'scheduled' }` |
| POST | `/academy/assignments/:id/cancel`, `/archive` | `assignment.cancel` | records are kept |
| GET / POST | `/academy/assignments/:id/extensions` | view / `assignment.extend` | `{ studentId, extendedDueAt, reason }` |
| DELETE | `/academy/assignments/:id/extensions/:studentId` | `assignment.extend` | |
| GET | `/academy/assignments/:id/revisions` | `assignment.viewAll` | |
| PUT / DELETE | `/academy/assignments/:id/rubric` | edit rights | total must equal the assignment maximum; locked once graded |
| POST | `/academy/assignments/:id/resources` | edit rights | multipart `file` |
| DELETE | `/academy/assignments/:id/resources/:fileId` | edit rights | |

## Student (`/academy/me`, own records only — the user comes from the session)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/academy/me/overview` | groups, upcoming assignments, next class, recent released grades |
| GET | `/academy/me/assignments` | `?type=`, `?groupId=`; derived status, effective deadline, `canSubmit` |
| GET | `/academy/me/assignments/:id` | detail, item progress (server evidence), draft, staged files, attempts, grade (released or returned only) |
| POST | `/academy/me/assignments/:id/items/:itemId/open` | enrolls in the platform course, unlocks the step if needed, returns the workspace URL |
| PUT / DELETE | `/academy/me/assignments/:id/draft` | draft answers incl. file mapping |
| POST | `/academy/me/assignments/:id/files` | stage a submission file (multipart) |
| DELETE | `/academy/me/files/:id` | own staged file only |
| POST | `/academy/me/assignments/:id/attempts` | `{ idempotencyKey, answers[] }` → 201 receipt; same key → 200 with the original receipt (`replayed: true`) |
| GET | `/academy/me/grades` | released grades only |
| GET | `/academy/me/schedule` | `?from=&to=` (ISO); meeting link only with an ACTIVE enrollment |
| GET | `/academy/me/attendance` | own records and rate per group |
| GET | `/academy/me/notifications` | latest 100 |
| POST | `/academy/me/notifications/:id/read`, `/read-all` | |

## Grading (staff)

| Method | Path | Action | Notes |
| --- | --- | --- | --- |
| GET | `/academy/assignments/:id/submissions` | `submission.review` | every roster student, `needsReview` flag |
| POST | `/academy/assignments/:id/grades/release` | `grade.release` | releases ready drafts, reports skipped ones |
| GET | `/academy/submissions/:id` | `submission.review` | attempts, staff grade (with `stale`), history, permissions |
| PUT | `/academy/submissions/:id/grade` | `grade.write`; changing a released grade needs `grade.release` + `reason` | item or rubric scores, feedback, `expectedVersion` |
| POST | `/academy/submissions/:id/grade/release` | `grade.release` | 409 if stale or not a draft |
| POST | `/academy/submissions/:id/grade/return` | `grade.release` | `{ feedback, expectedVersion? }` |
| GET | `/academy/groups/:id/gradebook` | `submission.review` or `analytics.view` | |
| GET | `/academy/groups/:id/gradebook/export` | same | CSV (UTF-8 BOM, formula-injection safe) |

## Classes and attendance

| Method | Path | Action | Notes |
| --- | --- | --- | --- |
| GET | `/academy/groups/:id/sessions` | `group.view` | meeting link only for active students and staff |
| POST | `/academy/groups/:id/sessions` | `session.manage` | single class |
| POST | `/academy/groups/:id/sessions/series` | `session.manage` | weekly schedule in the group timezone (max 200) |
| GET | `/academy/sessions/:id` | `group.view` | session + group + permissions |
| PATCH | `/academy/sessions/:id` | `session.manage` | reschedule / cancel (notifies students) |
| DELETE | `/academy/sessions/:id` | `session.manage` | only without attendance |
| GET / PUT | `/academy/sessions/:id/attendance` | `attendance.manage` | bulk upsert for enrolled (ACTIVE/PAUSED) students |

## Files

| Method | Path | Who |
| --- | --- | --- |
| GET | `/academy/files/:id` | resource: group staff or students who can see the assignment; submission file: its owner (staged: owner only) or staff with `submission.review` in that group. Always `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` |

## Analytics and overviews

| Method | Path | Who |
| --- | --- | --- |
| GET | `/academy/groups/:id/analytics` | `analytics.view` |
| GET | `/academy/instructor/overview` | instructors (their groups); admin (all non-archived groups) |
| GET | `/academy/admin/overview` | admin |

## Existing endpoints changed

- `GET /me/summary` now includes `academy: { enabled, student, instructor, admin, teacherAccount } | null` (null when the module is off).
- `POST /admin/users` and the role endpoints accept the new role `TEACHER` (Academy teacher account).
- `GET /me/notifications` now also returns Academy notifications (kinds `academy_*`); `POST /me/notifications/seen` also marks them read.
