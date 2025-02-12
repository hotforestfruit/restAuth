-- DropIndex
DROP INDEX "UserTokens_userId_key";

-- CreateTable
CREATE TABLE "InvalidTokens" (
    "id" SERIAL NOT NULL,
    "accessToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "InvalidTokens_pkey" PRIMARY KEY ("id")
);
