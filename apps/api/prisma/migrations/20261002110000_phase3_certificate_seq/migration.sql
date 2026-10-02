-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_seq_key" ON "Certificate"("seq");
