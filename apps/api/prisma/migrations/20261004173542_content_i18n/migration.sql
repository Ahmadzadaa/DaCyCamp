-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "i18n" JSONB;

-- AlterTable
ALTER TABLE "CtfTask" ADD COLUMN     "i18n" JSONB;

-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN     "i18n" JSONB;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "i18n" JSONB;

-- AlterTable
ALTER TABLE "PathItem" ADD COLUMN     "i18n" JSONB,
ADD COLUMN     "secretI18n" JSONB;

-- AlterTable
ALTER TABLE "Roadmap" ADD COLUMN     "i18n" JSONB;

-- AlterTable
ALTER TABLE "Step" ADD COLUMN     "i18n" JSONB,
ADD COLUMN     "secretI18n" JSONB;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "i18n" JSONB;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "i18n" JSONB;
