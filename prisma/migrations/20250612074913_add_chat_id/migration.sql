/*
  Warnings:

  - Added the required column `chatId` to the `Birthday` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Birthday" ADD COLUMN     "chatId" TEXT NOT NULL;
