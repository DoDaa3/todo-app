-- CreateEnum
CREATE TYPE "BoardRole" AS ENUM ('EDITOR', 'VIEWER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BOARD_SHARED';

-- CreateTable
CREATE TABLE "BoardShare" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardShare_boardId_idx" ON "BoardShare"("boardId");

-- CreateIndex
CREATE INDEX "BoardShare_userId_idx" ON "BoardShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardShare_boardId_userId_key" ON "BoardShare"("boardId", "userId");

-- AddForeignKey
ALTER TABLE "BoardShare" ADD CONSTRAINT "BoardShare_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardShare" ADD CONSTRAINT "BoardShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
