-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationsSeenAt" TIMESTAMP(3),
ADD COLUMN     "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyGoal" INTEGER NOT NULL DEFAULT 8;
