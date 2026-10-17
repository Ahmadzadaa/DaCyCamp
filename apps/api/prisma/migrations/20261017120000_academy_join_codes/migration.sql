-- Akademiya: qrupa qoşulma kodu (yalnız əlavə; mövcud sətirlər silinmir, dəyişən sütun yoxdur)
ALTER TABLE "AcademyGroup" ADD COLUMN "joinCode" TEXT;
ALTER TABLE "AcademyGroup" ADD COLUMN "joinEnabled" BOOLEAN NOT NULL DEFAULT true;

-- mövcud qruplara təsadüfi 8 simvollu kod (0/O/1/I kimi qarışan simvollar yoxdur); hər sətir üçün ayrıca hesablanır
UPDATE "AcademyGroup" g SET "joinCode" = (
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
  FROM generate_series(1, 8) WHERE g."id" IS NOT NULL
);

ALTER TABLE "AcademyGroup" ALTER COLUMN "joinCode" SET NOT NULL;
CREATE UNIQUE INDEX "AcademyGroup_joinCode_key" ON "AcademyGroup"("joinCode");
