
-- A reply belongs to exactly one thread. No existing rows or tables are changed.
ALTER TABLE "ClassroomReply" ADD CONSTRAINT "ClassroomReply_one_thread" CHECK (
  ("questionId" IS NOT NULL AND "announcementId" IS NULL) OR
  ("questionId" IS NULL AND "announcementId" IS NOT NULL)
);
