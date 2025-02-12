/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserTokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserTokens_userId_key" ON "UserTokens"("userId");
