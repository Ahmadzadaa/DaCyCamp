-- AlterTable
ALTER TABLE "PathCertificate" ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PathCertificate_seq_key" ON "PathCertificate"("seq");
