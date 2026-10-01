-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('THEORY', 'QUIZ', 'SQL', 'PYTHON', 'TERMINAL', 'CTF');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DATASET', 'ATTACHMENT', 'CHECK_SCRIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('STEP_COMPLETED', 'CTF_TASK_SOLVED', 'HINT_USED', 'COURSE_COMPLETED', 'PATH_ITEM_COMPLETED', 'PATH_COMPLETED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('VALIDATED', 'FAILED', 'APPLIED');

-- CreateEnum
CREATE TYPE "LabStatus" AS ENUM ('STARTING', 'RUNNING', 'PASSED', 'EXPIRED', 'STOPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "PathItemType" AS ENUM ('COURSE', 'PROJECT', 'ASSESSMENT', 'MILESTONE');

-- CreateEnum
CREATE TYPE "PathItemStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'az',
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "targetPathId" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "Level" NOT NULL DEFAULT 'BEGINNER',
    "description" TEXT NOT NULL DEFAULT '',
    "coverAssetId" TEXT,
    "sequential" BOOLEAN NOT NULL DEFAULT true,
    "estimatedHours" DOUBLE PRECISION,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "secret" JSONB,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtfTask" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "hint" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "answerHash" TEXT NOT NULL,

    CONSTRAINT "CtfTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseImport" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "slug" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "report" JSONB NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastStepId" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HintUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "hintKey" TEXT NOT NULL,
    "xpPenalty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HintUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtfSolve" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ctfTaskId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtfSolve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "XpReason" NOT NULL,
    "stepId" TEXT,
    "ctfTaskId" TEXT,
    "courseId" TEXT,
    "pathItemId" TEXT,
    "pathId" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "snapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "LabStatus" NOT NULL DEFAULT 'STARTING',
    "image" TEXT NOT NULL,
    "containerId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "passedAt" TIMESTAMP(3),
    "checkOutput" TEXT,

    CONSTRAINT "LabSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "level" "Level" NOT NULL DEFAULT 'BEGINNER',
    "targetAudience" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedHours" DOUBLE PRECISION,
    "sequential" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathItem" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "PathItemType" NOT NULL,
    "courseId" TEXT,
    "title" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "secret" JSONB,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "estimatedHours" DOUBLE PRECISION,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastItemId" TEXT,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PathEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathItemProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathItemId" TEXT NOT NULL,
    "status" "PathItemStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "feedback" TEXT,
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathCertificate" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathId" TEXT,
    "snapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PathCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Track_order_key" ON "Track"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_isPublished_level_idx" ON "Course"("isPublished", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Course_trackId_order_key" ON "Course"("trackId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_key_key" ON "Module"("courseId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_order_key" ON "Module"("courseId", "order");

-- CreateIndex
CREATE INDEX "Step_type_idx" ON "Step"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Step_moduleId_key_key" ON "Step"("moduleId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Step_moduleId_order_key" ON "Step"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CtfTask_stepId_key_key" ON "CtfTask"("stepId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CtfTask_stepId_order_key" ON "CtfTask"("stepId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_kind_idx" ON "Asset"("kind");

-- CreateIndex
CREATE INDEX "Asset_sha256_idx" ON "Asset"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_courseId_path_key" ON "Asset"("courseId", "path");

-- CreateIndex
CREATE INDEX "CourseImport_courseId_createdAt_idx" ON "CourseImport"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseImport_slug_createdAt_idx" ON "CourseImport"("slug", "createdAt");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE INDEX "Enrollment_userId_lastActivityAt_idx" ON "Enrollment"("userId", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "StepProgress_stepId_status_idx" ON "StepProgress"("stepId", "status");

-- CreateIndex
CREATE INDEX "StepProgress_userId_status_idx" ON "StepProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "StepProgress_userId_completedAt_idx" ON "StepProgress"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StepProgress_userId_stepId_key" ON "StepProgress"("userId", "stepId");

-- CreateIndex
CREATE INDEX "Submission_userId_stepId_createdAt_idx" ON "Submission"("userId", "stepId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_stepId_passed_idx" ON "Submission"("stepId", "passed");

-- CreateIndex
CREATE UNIQUE INDEX "HintUsage_userId_stepId_hintKey_key" ON "HintUsage"("userId", "stepId", "hintKey");

-- CreateIndex
CREATE UNIQUE INDEX "CtfSolve_userId_ctfTaskId_key" ON "CtfSolve"("userId", "ctfTaskId");

-- CreateIndex
CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_dedupeKey_key" ON "XpEvent"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityDay_userId_date_key" ON "ActivityDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serial_key" ON "Certificate"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LabSession_userId_stepId_status_idx" ON "LabSession"("userId", "stepId", "status");

-- CreateIndex
CREATE INDEX "LabSession_status_expiresAt_idx" ON "LabSession"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");

-- CreateIndex
CREATE INDEX "LearningPath_isPublished_idx" ON "LearningPath"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_trackId_order_key" ON "LearningPath"("trackId", "order");

-- CreateIndex
CREATE INDEX "PathItem_courseId_idx" ON "PathItem"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "PathItem_pathId_key_key" ON "PathItem"("pathId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PathItem_pathId_order_key" ON "PathItem"("pathId", "order");

-- CreateIndex
CREATE INDEX "PathEnrollment_userId_isActive_idx" ON "PathEnrollment"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PathEnrollment_userId_pathId_key" ON "PathEnrollment"("userId", "pathId");

-- CreateIndex
CREATE INDEX "PathItemProgress_pathItemId_status_idx" ON "PathItemProgress"("pathItemId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PathItemProgress_userId_pathItemId_key" ON "PathItemProgress"("userId", "pathItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PathCertificate_serial_key" ON "PathCertificate"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "PathCertificate_userId_pathId_key" ON "PathCertificate"("userId", "pathId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_targetPathId_fkey" FOREIGN KEY ("targetPathId") REFERENCES "LearningPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtfTask" ADD CONSTRAINT "CtfTask_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseImport" ADD CONSTRAINT "CourseImport_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseImport" ADD CONSTRAINT "CourseImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_lastStepId_fkey" FOREIGN KEY ("lastStepId") REFERENCES "Step"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepProgress" ADD CONSTRAINT "StepProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepProgress" ADD CONSTRAINT "StepProgress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUsage" ADD CONSTRAINT "HintUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUsage" ADD CONSTRAINT "HintUsage_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtfSolve" ADD CONSTRAINT "CtfSolve_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtfSolve" ADD CONSTRAINT "CtfSolve_ctfTaskId_fkey" FOREIGN KEY ("ctfTaskId") REFERENCES "CtfTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_ctfTaskId_fkey" FOREIGN KEY ("ctfTaskId") REFERENCES "CtfTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_pathItemId_fkey" FOREIGN KEY ("pathItemId") REFERENCES "PathItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityDay" ADD CONSTRAINT "ActivityDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSession" ADD CONSTRAINT "LabSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSession" ADD CONSTRAINT "LabSession_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathItem" ADD CONSTRAINT "PathItem_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathItem" ADD CONSTRAINT "PathItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathEnrollment" ADD CONSTRAINT "PathEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathEnrollment" ADD CONSTRAINT "PathEnrollment_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathEnrollment" ADD CONSTRAINT "PathEnrollment_lastItemId_fkey" FOREIGN KEY ("lastItemId") REFERENCES "PathItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathItemProgress" ADD CONSTRAINT "PathItemProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathItemProgress" ADD CONSTRAINT "PathItemProgress_pathItemId_fkey" FOREIGN KEY ("pathItemId") REFERENCES "PathItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathItemProgress" ADD CONSTRAINT "PathItemProgress_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathCertificate" ADD CONSTRAINT "PathCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathCertificate" ADD CONSTRAINT "PathCertificate_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;
