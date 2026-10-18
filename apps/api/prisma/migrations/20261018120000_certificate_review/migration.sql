-- SEC-04: brauzerin bildirdiyi (CLIENT_ATTESTED) Python nəticəsinə əsaslanan sertifikatlar admin təsdiqinə qədər PENDING.
-- Yalnız əlavə: mövcud sertifikatlar APPROVED olaraq qalır (tarixi qeydlər dəyişmir, heç nə silinmir).
-- Geri qaytarma: sütunları və tipi silmək kifayətdir (məlumat itkisi yalnız yeni review sahələrindədir).
CREATE TYPE "CertificateReviewStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TABLE "Certificate"
  ADD COLUMN "reviewStatus" "CertificateReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "PathCertificate"
  ADD COLUMN "reviewStatus" "CertificateReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

CREATE INDEX "Certificate_reviewStatus_idx" ON "Certificate"("reviewStatus");
CREATE INDEX "PathCertificate_reviewStatus_idx" ON "PathCertificate"("reviewStatus");
