-- CreateEnum
CREATE TYPE "AcademyProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcademyGroupStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcademyLearningFormat" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "AcademyInstructorRole" AS ENUM ('LEAD', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AcademyEnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AcademyAssignmentType" AS ENUM ('EXISTING_CHALLENGE', 'CUSTOM_TASK', 'CODING_TASK', 'FILE_BASED', 'LAB', 'PROJECT');

-- CreateEnum
CREATE TYPE "AcademyAssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcademyGradingType" AS ENUM ('AUTOMATIC', 'MANUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AcademyLatePolicy" AS ENUM ('REJECT', 'ACCEPT', 'ACCEPT_WITH_PENALTY');

-- CreateEnum
CREATE TYPE "AcademyAttemptSelection" AS ENUM ('LATEST_ATTEMPT', 'HIGHEST_SCORE', 'INSTRUCTOR_SELECTED');

-- CreateEnum
CREATE TYPE "AcademyItemKind" AS ENUM ('LEARNING_STEP', 'TEXT', 'CODE', 'FILE', 'LINK');

-- CreateEnum
CREATE TYPE "AcademyEvaluationTrust" AS ENUM ('SERVER_VERIFIED', 'SERVER_CHECKED', 'CLIENT_ATTESTED', 'COMPLETION');

-- CreateEnum
CREATE TYPE "AcademyEvaluationStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AcademyGradeStatus" AS ENUM ('DRAFT', 'RELEASED', 'RETURNED');

-- CreateEnum
CREATE TYPE "AcademyClassStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AcademyAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AcademyFilePurpose" AS ENUM ('ASSIGNMENT_RESOURCE', 'SUBMISSION');

-- CreateEnum
CREATE TYPE "AcademyFileStatus" AS ENUM ('STAGED', 'ATTACHED');

-- CreateEnum
CREATE TYPE "AcademyOutboxStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "AcademyProgram" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "AcademyProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyGroup" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "AcademyGroupStatus" NOT NULL DEFAULT 'PLANNED',
    "format" "AcademyLearningFormat" NOT NULL DEFAULT 'ONLINE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Baku',
    "capacity" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyGroupInstructor" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AcademyInstructorRole" NOT NULL,
    "leadSlot" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyGroupInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyEnrollment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AcademyEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyEnrollmentEvent" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "fromStatus" "AcademyEnrollmentStatus",
    "toStatus" "AcademyEnrollmentStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyEnrollmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyCourseLink" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyCourseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyAssignment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "AcademyAssignmentType" NOT NULL,
    "status" "AcademyAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lateCutoffAt" TIMESTAMP(3),
    "latePolicy" "AcademyLatePolicy" NOT NULL DEFAULT 'REJECT',
    "latePenaltyPercent" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "maxScoreCenti" INTEGER NOT NULL,
    "gradingType" "AcademyGradingType" NOT NULL DEFAULT 'MANUAL',
    "attemptSelection" "AcademyAttemptSelection" NOT NULL DEFAULT 'LATEST_ATTEMPT',
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyAssignmentItem" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "kind" "AcademyItemKind" NOT NULL,
    "stepId" TEXT,
    "sourceVersion" TEXT,
    "sourceSnapshot" JSONB,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "maxScoreCenti" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyAssignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyAssignmentExtension" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "extendedDueAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyAssignmentExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyAssignmentRevision" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "editedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyAssignmentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySubmissionAttempt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "assignmentVersion" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,
    "evaluationStatus" "AcademyEvaluationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "autoScoreCenti" INTEGER,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademySubmissionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySubmissionItem" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "AcademyItemKind" NOT NULL,
    "textAnswer" TEXT,
    "codeAnswer" TEXT,
    "linkUrl" TEXT,
    "learningSubmissionId" TEXT,
    "evaluationStatus" "AcademyEvaluationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "evaluationTrust" "AcademyEvaluationTrust",
    "evaluationPassed" BOOLEAN,
    "evaluationScoreCenti" INTEGER,
    "evidenceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademySubmissionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySubmissionDraft" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademySubmissionDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyFile" (
    "id" TEXT NOT NULL,
    "purpose" "AcademyFilePurpose" NOT NULL,
    "status" "AcademyFileStatus" NOT NULL DEFAULT 'STAGED',
    "assignmentId" TEXT,
    "submissionItemId" TEXT,
    "ownerId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedAt" TIMESTAMP(3),

    CONSTRAINT "AcademyFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyGrade" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "selectedAttemptId" TEXT,
    "rawScoreCenti" INTEGER NOT NULL DEFAULT 0,
    "latePenaltyCenti" INTEGER NOT NULL DEFAULT 0,
    "finalScoreCenti" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "status" "AcademyGradeStatus" NOT NULL DEFAULT 'DRAFT',
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyGradeItem" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "scoreCenti" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "AcademyGradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyGradeHistory" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "previousScoreCenti" INTEGER,
    "newScoreCenti" INTEGER,
    "previousStatus" "AcademyGradeStatus",
    "newStatus" "AcademyGradeStatus" NOT NULL,
    "reason" TEXT,
    "snapshot" JSONB,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyGradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyRubric" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "maxScoreCenti" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyRubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "maxScoreCenti" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcademyRubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyRubricScore" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "scoreCenti" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "AcademyRubricScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyClassSession" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructorId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "meetingUrl" TEXT,
    "status" "AcademyClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "seriesId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AcademyAttendanceStatus" NOT NULL,
    "note" TEXT,
    "markedById" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyOutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AcademyOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AcademyOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyProgram_slug_key" ON "AcademyProgram"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGroup_code_key" ON "AcademyGroup"("code");

-- CreateIndex
CREATE INDEX "AcademyGroup_programId_status_idx" ON "AcademyGroup"("programId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGroupInstructor_leadSlot_key" ON "AcademyGroupInstructor"("leadSlot");

-- CreateIndex
CREATE INDEX "AcademyGroupInstructor_userId_removedAt_idx" ON "AcademyGroupInstructor"("userId", "removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGroupInstructor_groupId_userId_key" ON "AcademyGroupInstructor"("groupId", "userId");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_studentId_status_idx" ON "AcademyEnrollment"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyEnrollment_groupId_studentId_key" ON "AcademyEnrollment"("groupId", "studentId");

-- CreateIndex
CREATE INDEX "AcademyEnrollmentEvent_enrollmentId_createdAt_idx" ON "AcademyEnrollmentEvent"("enrollmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyCourseLink_groupId_courseId_key" ON "AcademyCourseLink"("groupId", "courseId");

-- CreateIndex
CREATE INDEX "AcademyAssignment_groupId_status_dueAt_idx" ON "AcademyAssignment"("groupId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyAssignment_id_groupId_key" ON "AcademyAssignment"("id", "groupId");

-- CreateIndex
CREATE INDEX "AcademyAssignmentItem_assignmentId_sortOrder_idx" ON "AcademyAssignmentItem"("assignmentId", "sortOrder");

-- CreateIndex
CREATE INDEX "AcademyAssignmentItem_stepId_idx" ON "AcademyAssignmentItem"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyAssignmentItem_id_assignmentId_key" ON "AcademyAssignmentItem"("id", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyAssignmentExtension_assignmentId_studentId_key" ON "AcademyAssignmentExtension"("assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyAssignmentRevision_assignmentId_version_key" ON "AcademyAssignmentRevision"("assignmentId", "version");

-- CreateIndex
CREATE INDEX "AcademySubmission_studentId_idx" ON "AcademySubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmission_assignmentId_studentId_key" ON "AcademySubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmission_id_assignmentId_key" ON "AcademySubmission"("id", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmissionAttempt_submissionId_attemptNumber_key" ON "AcademySubmissionAttempt"("submissionId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmissionAttempt_submissionId_idempotencyKey_key" ON "AcademySubmissionAttempt"("submissionId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmissionAttempt_id_assignmentId_key" ON "AcademySubmissionAttempt"("id", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmissionAttempt_id_submissionId_key" ON "AcademySubmissionAttempt"("id", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmissionItem_attemptId_itemId_key" ON "AcademySubmissionItem"("attemptId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySubmissionDraft_assignmentId_studentId_key" ON "AcademySubmissionDraft"("assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyFile_storageKey_key" ON "AcademyFile"("storageKey");

-- CreateIndex
CREATE INDEX "AcademyFile_status_createdAt_idx" ON "AcademyFile"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AcademyFile_assignmentId_idx" ON "AcademyFile"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGrade_submissionId_key" ON "AcademyGrade"("submissionId");

-- CreateIndex
CREATE INDEX "AcademyGrade_assignmentId_status_idx" ON "AcademyGrade"("assignmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGrade_id_assignmentId_key" ON "AcademyGrade"("id", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGrade_submissionId_assignmentId_key" ON "AcademyGrade"("submissionId", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGradeItem_gradeId_itemId_key" ON "AcademyGradeItem"("gradeId", "itemId");

-- CreateIndex
CREATE INDEX "AcademyGradeHistory_gradeId_changedAt_idx" ON "AcademyGradeHistory"("gradeId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyRubric_assignmentId_key" ON "AcademyRubric"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyRubric_id_assignmentId_key" ON "AcademyRubric"("id", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyRubricCriterion_id_assignmentId_key" ON "AcademyRubricCriterion"("id", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyRubricScore_gradeId_criterionId_key" ON "AcademyRubricScore"("gradeId", "criterionId");

-- CreateIndex
CREATE INDEX "AcademyClassSession_groupId_startsAt_idx" ON "AcademyClassSession"("groupId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyClassSession_id_groupId_key" ON "AcademyClassSession"("id", "groupId");

-- CreateIndex
CREATE INDEX "AcademyAttendance_studentId_idx" ON "AcademyAttendance"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyAttendance_sessionId_studentId_key" ON "AcademyAttendance"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "AcademyNotification_userId_createdAt_idx" ON "AcademyNotification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyNotification_userId_dedupeKey_key" ON "AcademyNotification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "AcademyOutboxEvent_status_availableAt_idx" ON "AcademyOutboxEvent"("status", "availableAt");

-- AddForeignKey
ALTER TABLE "AcademyGroup" ADD CONSTRAINT "AcademyGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "AcademyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGroup" ADD CONSTRAINT "AcademyGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGroupInstructor" ADD CONSTRAINT "AcademyGroupInstructor_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGroupInstructor" ADD CONSTRAINT "AcademyGroupInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGroupInstructor" ADD CONSTRAINT "AcademyGroupInstructor_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollmentEvent" ADD CONSTRAINT "AcademyEnrollmentEvent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "AcademyEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollmentEvent" ADD CONSTRAINT "AcademyEnrollmentEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyCourseLink" ADD CONSTRAINT "AcademyCourseLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyCourseLink" ADD CONSTRAINT "AcademyCourseLink_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignment" ADD CONSTRAINT "AcademyAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignment" ADD CONSTRAINT "AcademyAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignment" ADD CONSTRAINT "AcademyAssignment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentItem" ADD CONSTRAINT "AcademyAssignmentItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AcademyAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentItem" ADD CONSTRAINT "AcademyAssignmentItem_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentExtension" ADD CONSTRAINT "AcademyAssignmentExtension_assignmentId_groupId_fkey" FOREIGN KEY ("assignmentId", "groupId") REFERENCES "AcademyAssignment"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentExtension" ADD CONSTRAINT "AcademyAssignmentExtension_groupId_studentId_fkey" FOREIGN KEY ("groupId", "studentId") REFERENCES "AcademyEnrollment"("groupId", "studentId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentExtension" ADD CONSTRAINT "AcademyAssignmentExtension_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentExtension" ADD CONSTRAINT "AcademyAssignmentExtension_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentRevision" ADD CONSTRAINT "AcademyAssignmentRevision_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AcademyAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAssignmentRevision" ADD CONSTRAINT "AcademyAssignmentRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmission" ADD CONSTRAINT "AcademySubmission_assignmentId_groupId_fkey" FOREIGN KEY ("assignmentId", "groupId") REFERENCES "AcademyAssignment"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmission" ADD CONSTRAINT "AcademySubmission_groupId_studentId_fkey" FOREIGN KEY ("groupId", "studentId") REFERENCES "AcademyEnrollment"("groupId", "studentId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AcademySubmission" ADD CONSTRAINT "AcademySubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmissionAttempt" ADD CONSTRAINT "AcademySubmissionAttempt_submissionId_assignmentId_fkey" FOREIGN KEY ("submissionId", "assignmentId") REFERENCES "AcademySubmission"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmissionItem" ADD CONSTRAINT "AcademySubmissionItem_attemptId_assignmentId_fkey" FOREIGN KEY ("attemptId", "assignmentId") REFERENCES "AcademySubmissionAttempt"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmissionItem" ADD CONSTRAINT "AcademySubmissionItem_itemId_assignmentId_fkey" FOREIGN KEY ("itemId", "assignmentId") REFERENCES "AcademyAssignmentItem"("id", "assignmentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmissionItem" ADD CONSTRAINT "AcademySubmissionItem_learningSubmissionId_fkey" FOREIGN KEY ("learningSubmissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmissionDraft" ADD CONSTRAINT "AcademySubmissionDraft_assignmentId_groupId_fkey" FOREIGN KEY ("assignmentId", "groupId") REFERENCES "AcademyAssignment"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademySubmissionDraft" ADD CONSTRAINT "AcademySubmissionDraft_groupId_studentId_fkey" FOREIGN KEY ("groupId", "studentId") REFERENCES "AcademyEnrollment"("groupId", "studentId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AcademySubmissionDraft" ADD CONSTRAINT "AcademySubmissionDraft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyFile" ADD CONSTRAINT "AcademyFile_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AcademyAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyFile" ADD CONSTRAINT "AcademyFile_submissionItemId_fkey" FOREIGN KEY ("submissionItemId") REFERENCES "AcademySubmissionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyFile" ADD CONSTRAINT "AcademyFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGrade" ADD CONSTRAINT "AcademyGrade_submissionId_assignmentId_fkey" FOREIGN KEY ("submissionId", "assignmentId") REFERENCES "AcademySubmission"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGrade" ADD CONSTRAINT "AcademyGrade_selectedAttemptId_submissionId_fkey" FOREIGN KEY ("selectedAttemptId", "submissionId") REFERENCES "AcademySubmissionAttempt"("id", "submissionId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AcademyGrade" ADD CONSTRAINT "AcademyGrade_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGradeItem" ADD CONSTRAINT "AcademyGradeItem_gradeId_assignmentId_fkey" FOREIGN KEY ("gradeId", "assignmentId") REFERENCES "AcademyGrade"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGradeItem" ADD CONSTRAINT "AcademyGradeItem_itemId_assignmentId_fkey" FOREIGN KEY ("itemId", "assignmentId") REFERENCES "AcademyAssignmentItem"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGradeHistory" ADD CONSTRAINT "AcademyGradeHistory_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "AcademyGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGradeHistory" ADD CONSTRAINT "AcademyGradeHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyRubric" ADD CONSTRAINT "AcademyRubric_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AcademyAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyRubricCriterion" ADD CONSTRAINT "AcademyRubricCriterion_rubricId_assignmentId_fkey" FOREIGN KEY ("rubricId", "assignmentId") REFERENCES "AcademyRubric"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyRubricScore" ADD CONSTRAINT "AcademyRubricScore_gradeId_assignmentId_fkey" FOREIGN KEY ("gradeId", "assignmentId") REFERENCES "AcademyGrade"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyRubricScore" ADD CONSTRAINT "AcademyRubricScore_criterionId_assignmentId_fkey" FOREIGN KEY ("criterionId", "assignmentId") REFERENCES "AcademyRubricCriterion"("id", "assignmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyClassSession" ADD CONSTRAINT "AcademyClassSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyClassSession" ADD CONSTRAINT "AcademyClassSession_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyClassSession" ADD CONSTRAINT "AcademyClassSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAttendance" ADD CONSTRAINT "AcademyAttendance_sessionId_groupId_fkey" FOREIGN KEY ("sessionId", "groupId") REFERENCES "AcademyClassSession"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAttendance" ADD CONSTRAINT "AcademyAttendance_groupId_studentId_fkey" FOREIGN KEY ("groupId", "studentId") REFERENCES "AcademyEnrollment"("groupId", "studentId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AcademyAttendance" ADD CONSTRAINT "AcademyAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAttendance" ADD CONSTRAINT "AcademyAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyNotification" ADD CONSTRAINT "AcademyNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═════════ Akademiya: Prisma-nın ifadə etmədiyi invariantlar (CHECK və trigger-lər) ═════════
-- Prisma CHECK və trigger-ləri izləmir (drift yaratmır); hamısı yalnız yeni Academy* cədvəllərinə aiddir.

ALTER TABLE "AcademyGroup"
  ADD CONSTRAINT "AcademyGroup_capacity_check" CHECK ("capacity" IS NULL OR "capacity" >= 1),
  ADD CONSTRAINT "AcademyGroup_dates_check" CHECK ("startAt" IS NULL OR "endAt" IS NULL OR "endAt" >= "startAt");

-- leadSlot = groupId yalnız aktiv aparıcı müəllimdə (unikal indeks qrupda bir aktiv aparıcını təmin edir)
ALTER TABLE "AcademyGroupInstructor"
  ADD CONSTRAINT "AcademyGroupInstructor_leadSlot_check" CHECK (
    (("role" = 'LEAD' AND "removedAt" IS NULL) AND "leadSlot" = "groupId")
    OR (NOT ("role" = 'LEAD' AND "removedAt" IS NULL) AND "leadSlot" IS NULL)
  );

ALTER TABLE "AcademyAssignment"
  ADD CONSTRAINT "AcademyAssignment_dates_check" CHECK ("dueAt" > "availableAt"),
  ADD CONSTRAINT "AcademyAssignment_cutoff_check" CHECK ("lateCutoffAt" IS NULL OR "lateCutoffAt" >= "dueAt"),
  ADD CONSTRAINT "AcademyAssignment_penalty_check" CHECK ("latePenaltyPercent" BETWEEN 0 AND 100),
  ADD CONSTRAINT "AcademyAssignment_attempts_check" CHECK ("maxAttempts" BETWEEN 1 AND 20),
  ADD CONSTRAINT "AcademyAssignment_score_check" CHECK ("maxScoreCenti" >= 0),
  ADD CONSTRAINT "AcademyAssignment_version_check" CHECK ("version" >= 1);

ALTER TABLE "AcademyAssignmentItem"
  ADD CONSTRAINT "AcademyAssignmentItem_score_check" CHECK ("maxScoreCenti" >= 0),
  ADD CONSTRAINT "AcademyAssignmentItem_source_check" CHECK ("kind" <> 'LEARNING_STEP' OR "sourceSnapshot" IS NOT NULL);

ALTER TABLE "AcademySubmissionAttempt"
  ADD CONSTRAINT "AcademySubmissionAttempt_number_check" CHECK ("attemptNumber" >= 1),
  ADD CONSTRAINT "AcademySubmissionAttempt_score_check" CHECK ("autoScoreCenti" IS NULL OR "autoScoreCenti" >= 0);

ALTER TABLE "AcademySubmissionItem"
  ADD CONSTRAINT "AcademySubmissionItem_score_check" CHECK ("evaluationScoreCenti" IS NULL OR "evaluationScoreCenti" >= 0);

ALTER TABLE "AcademyGrade"
  ADD CONSTRAINT "AcademyGrade_scores_check" CHECK (
    "rawScoreCenti" >= 0 AND "latePenaltyCenti" >= 0 AND "latePenaltyCenti" <= "rawScoreCenti"
    AND "finalScoreCenti" = "rawScoreCenti" - "latePenaltyCenti"
  ),
  ADD CONSTRAINT "AcademyGrade_release_check" CHECK ("status" <> 'RELEASED' OR "releasedAt" IS NOT NULL),
  ADD CONSTRAINT "AcademyGrade_version_check" CHECK ("version" >= 0);

ALTER TABLE "AcademyGradeItem" ADD CONSTRAINT "AcademyGradeItem_score_check" CHECK ("scoreCenti" >= 0);
ALTER TABLE "AcademyRubric" ADD CONSTRAINT "AcademyRubric_score_check" CHECK ("maxScoreCenti" > 0);
ALTER TABLE "AcademyRubricCriterion" ADD CONSTRAINT "AcademyRubricCriterion_score_check" CHECK ("maxScoreCenti" > 0);
ALTER TABLE "AcademyRubricScore" ADD CONSTRAINT "AcademyRubricScore_score_check" CHECK ("scoreCenti" >= 0);
ALTER TABLE "AcademyClassSession" ADD CONSTRAINT "AcademyClassSession_time_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "AcademyFile" ADD CONSTRAINT "AcademyFile_size_check" CHECK ("sizeBytes" >= 0);

-- Göndərilmiş cəhd dəyişməzdir: kimlik, nömrə, vaxt, gecikmə və açar yenilənə bilməz
CREATE FUNCTION academy_attempt_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW."submissionId" IS DISTINCT FROM OLD."submissionId"
     OR NEW."assignmentId" IS DISTINCT FROM OLD."assignmentId"
     OR NEW."attemptNumber" IS DISTINCT FROM OLD."attemptNumber"
     OR NEW."assignmentVersion" IS DISTINCT FROM OLD."assignmentVersion"
     OR NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt"
     OR NEW."isLate" IS DISTINCT FROM OLD."isLate"
     OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" THEN
    RAISE EXCEPTION 'ACADEMY_ATTEMPT_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AcademySubmissionAttempt_immutable" BEFORE UPDATE ON "AcademySubmissionAttempt"
  FOR EACH ROW EXECUTE FUNCTION academy_attempt_immutable();

-- Cavab dəyişməzdir. Yeganə istisna: mənbə platforma qeydi silinəndə FK-nın learningSubmissionId-ni NULL etməsi
CREATE FUNCTION academy_answer_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW."attemptId" IS DISTINCT FROM OLD."attemptId"
     OR NEW."assignmentId" IS DISTINCT FROM OLD."assignmentId"
     OR NEW."itemId" IS DISTINCT FROM OLD."itemId"
     OR NEW."kind" IS DISTINCT FROM OLD."kind"
     OR NEW."textAnswer" IS DISTINCT FROM OLD."textAnswer"
     OR NEW."codeAnswer" IS DISTINCT FROM OLD."codeAnswer"
     OR NEW."linkUrl" IS DISTINCT FROM OLD."linkUrl"
     OR NEW."evaluationStatus" IS DISTINCT FROM OLD."evaluationStatus"
     OR NEW."evaluationTrust" IS DISTINCT FROM OLD."evaluationTrust"
     OR NEW."evaluationPassed" IS DISTINCT FROM OLD."evaluationPassed"
     OR NEW."evaluationScoreCenti" IS DISTINCT FROM OLD."evaluationScoreCenti"
     OR NEW."evidenceAt" IS DISTINCT FROM OLD."evidenceAt"
     OR (NEW."learningSubmissionId" IS DISTINCT FROM OLD."learningSubmissionId" AND NEW."learningSubmissionId" IS NOT NULL) THEN
    RAISE EXCEPTION 'ACADEMY_ANSWER_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AcademySubmissionItem_immutable" BEFORE UPDATE ON "AcademySubmissionItem"
  FOR EACH ROW EXECUTE FUNCTION academy_answer_immutable();

-- Element balı elementin maksimumunu, yekun xam bal tapşırığın maksimumunu, rubrika balı meyarın maksimumunu keçə bilməz
CREATE FUNCTION academy_grade_item_max() RETURNS trigger AS $$
DECLARE m integer;
BEGIN
  SELECT "maxScoreCenti" INTO m FROM "AcademyAssignmentItem" WHERE "id" = NEW."itemId";
  IF m IS NULL OR NEW."scoreCenti" > m THEN
    RAISE EXCEPTION 'ACADEMY_SCORE_OUT_OF_RANGE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AcademyGradeItem_max" BEFORE INSERT OR UPDATE ON "AcademyGradeItem"
  FOR EACH ROW EXECUTE FUNCTION academy_grade_item_max();

CREATE FUNCTION academy_grade_max() RETURNS trigger AS $$
DECLARE m integer;
BEGIN
  SELECT "maxScoreCenti" INTO m FROM "AcademyAssignment" WHERE "id" = NEW."assignmentId";
  IF m IS NULL OR NEW."rawScoreCenti" > m THEN
    RAISE EXCEPTION 'ACADEMY_SCORE_OUT_OF_RANGE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AcademyGrade_max" BEFORE INSERT OR UPDATE ON "AcademyGrade"
  FOR EACH ROW EXECUTE FUNCTION academy_grade_max();

CREATE FUNCTION academy_rubric_score_max() RETURNS trigger AS $$
DECLARE m integer;
BEGIN
  SELECT "maxScoreCenti" INTO m FROM "AcademyRubricCriterion" WHERE "id" = NEW."criterionId";
  IF m IS NULL OR NEW."scoreCenti" > m THEN
    RAISE EXCEPTION 'ACADEMY_SCORE_OUT_OF_RANGE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AcademyRubricScore_max" BEFORE INSERT OR UPDATE ON "AcademyRubricScore"
  FOR EACH ROW EXECUTE FUNCTION academy_rubric_score_max();
