-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFAEnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFASecret" TEXT;
