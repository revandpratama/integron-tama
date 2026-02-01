-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('Onboarding', 'Live', 'Blocked', 'Decommissioned');

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL,
    "devBaseUrl" TEXT,
    "devWhitelistedIps" TEXT,
    "devCredentialsOwner" TEXT,
    "prodBaseUrl" TEXT,
    "prodWhitelistedIps" TEXT,
    "prodCredentialsOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_code_key" ON "partners"("code");
