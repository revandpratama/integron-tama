/*
  Warnings:

  - You are about to drop the column `accountManager` on the `partners` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "partners" DROP COLUMN "accountManager",
ADD COLUMN     "integrator" TEXT;
