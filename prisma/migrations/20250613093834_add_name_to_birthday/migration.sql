/*
  Warnings:

  - Added the required column `name` to the `Birthday` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Birthday" ADD COLUMN     "name" TEXT NOT NULL;
