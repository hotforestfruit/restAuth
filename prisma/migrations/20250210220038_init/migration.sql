-- CreateTable
CREATE TABLE "UserTokens" (
    "refreshtoken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTokens_refreshtoken_key" ON "UserTokens"("refreshtoken");
