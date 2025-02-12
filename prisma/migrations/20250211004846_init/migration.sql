/*
  Warnings:

  - You are about to drop the column `refreshtoken` on the `UserTokens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refreshToken]` on the table `UserTokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refreshToken` to the `UserTokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserTokens_refreshtoken_key";

-- AlterTable
ALTER TABLE "UserTokens" DROP COLUMN "refreshtoken",
ADD COLUMN     "refreshToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserTokens_refreshToken_key" ON "UserTokens"("refreshToken");
