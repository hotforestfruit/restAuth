/*
  Warnings:

  - Added the required column `expirationTime` to the `InvalidTokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvalidTokens" ADD COLUMN     "expirationTime" INTEGER NOT NULL;
