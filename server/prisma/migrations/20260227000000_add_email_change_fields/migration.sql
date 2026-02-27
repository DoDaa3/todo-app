-- AlterTable
ALTER TABLE "User" ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "emailChangeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_emailChangeToken_key" ON "User"("emailChangeToken");
