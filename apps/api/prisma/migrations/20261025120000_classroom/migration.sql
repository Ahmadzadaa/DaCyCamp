-- CreateTable
CREATE TABLE "ClassroomTopic" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomLesson" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT,
    "links" JSONB NOT NULL DEFAULT '[]',
    "stepIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAnnouncement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "links" JSONB NOT NULL DEFAULT '[]',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAnnouncementRead_pkey" PRIMARY KEY ("announcementId","userId")
);

-- CreateTable
CREATE TABLE "ClassroomFile" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "removedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomQuestion" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomReply" (
    "id" TEXT NOT NULL,
    "questionId" TEXT,
    "announcementId" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomTopic_groupId_order_idx" ON "ClassroomTopic"("groupId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomTopic_id_groupId_key" ON "ClassroomTopic"("id", "groupId");

-- CreateIndex
CREATE INDEX "ClassroomLesson_groupId_isPublished_publishAt_idx" ON "ClassroomLesson"("groupId", "isPublished", "publishAt");

-- CreateIndex
CREATE INDEX "ClassroomLesson_topicId_order_idx" ON "ClassroomLesson"("topicId", "order");

-- CreateIndex
CREATE INDEX "ClassroomAnnouncement_groupId_isPublished_publishAt_idx" ON "ClassroomAnnouncement"("groupId", "isPublished", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomFile_storageKey_key" ON "ClassroomFile"("storageKey");

-- CreateIndex
CREATE INDEX "ClassroomFile_lessonId_idx" ON "ClassroomFile"("lessonId");

-- CreateIndex
CREATE INDEX "ClassroomQuestion_groupId_assignmentId_createdAt_idx" ON "ClassroomQuestion"("groupId", "assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassroomReply_questionId_createdAt_idx" ON "ClassroomReply"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassroomReply_announcementId_createdAt_idx" ON "ClassroomReply"("announcementId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClassroomTopic" ADD CONSTRAINT "ClassroomTopic_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomLesson" ADD CONSTRAINT "ClassroomLesson_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomLesson" ADD CONSTRAINT "ClassroomLesson_topicId_groupId_fkey" FOREIGN KEY ("topicId", "groupId") REFERENCES "ClassroomTopic"("id", "groupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomLesson" ADD CONSTRAINT "ClassroomLesson_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAnnouncement" ADD CONSTRAINT "ClassroomAnnouncement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAnnouncement" ADD CONSTRAINT "ClassroomAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAnnouncementRead" ADD CONSTRAINT "ClassroomAnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "ClassroomAnnouncement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAnnouncementRead" ADD CONSTRAINT "ClassroomAnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ClassroomLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomQuestion" ADD CONSTRAINT "ClassroomQuestion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomQuestion" ADD CONSTRAINT "ClassroomQuestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomReply" ADD CONSTRAINT "ClassroomReply_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ClassroomQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomReply" ADD CONSTRAINT "ClassroomReply_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "ClassroomAnnouncement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomReply" ADD CONSTRAINT "ClassroomReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

