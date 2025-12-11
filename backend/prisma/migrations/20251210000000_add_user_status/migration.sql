-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateTable (SystemSetting - if not exists)
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemSetting_key_idx" ON "SystemSetting"("key");

-- AlterTable Comment (add parentId for replies)
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_timestamp_idx" ON "Comment"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Course_isPublished_idx" ON "Course"("isPublished");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Module_order_idx" ON "Module"("order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lesson_order_idx" ON "Lesson"("order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Progress_isCompleted_idx" ON "Progress"("isCompleted");

-- AddForeignKey (Comment self-relation)
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
