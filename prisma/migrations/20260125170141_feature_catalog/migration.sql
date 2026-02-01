/*
  Warnings:

  - The values [Decommissioned] on the enum `PartnerStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FeatureCategory" AS ENUM ('SNAP', 'NON_SNAP');

-- AlterEnum
BEGIN;
CREATE TYPE "PartnerStatus_new" AS ENUM ('Onboarding', 'Live', 'Blocked');
ALTER TABLE "partners" ALTER COLUMN "status" TYPE "PartnerStatus_new" USING ("status"::text::"PartnerStatus_new");
ALTER TYPE "PartnerStatus" RENAME TO "PartnerStatus_old";
ALTER TYPE "PartnerStatus_new" RENAME TO "PartnerStatus";
DROP TYPE "integron"."PartnerStatus_old";
COMMIT;

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FeatureCategory" NOT NULL,
    "apigeeProducts" TEXT[],
    "apigeeTraceProxies" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);
