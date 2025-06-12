/*
  Warnings:

  - The primary key for the `Chat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `chatId` on the `Birthday` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `title` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Birthday" DROP COLUMN "chatId",
ADD COLUMN     "chatId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_pkey",
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "Chat_pkey" PRIMARY KEY ("id");
