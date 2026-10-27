-- Add attachments to announcements; every existing lesson file is retained.
ALTER TABLE "ClassroomFile" ALTER COLUMN "lessonId" DROP NOT NULL;
ALTER TABLE "ClassroomFile" ADD COLUMN "announcementId" TEXT;
CREATE INDEX "ClassroomFile_announcementId_idx" ON "ClassroomFile"("announcementId");
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "ClassroomAnnouncement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_one_parent" CHECK (
  ("lessonId" IS NOT NULL AND "announcementId" IS NULL) OR
  ("lessonId" IS NULL AND "announcementId" IS NOT NULL)
);
