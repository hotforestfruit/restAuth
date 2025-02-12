-- AlterTable
ALTER TABLE "UserTokens" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "UserTokens_pkey" PRIMARY KEY ("id");
