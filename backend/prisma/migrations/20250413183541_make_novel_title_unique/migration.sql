/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `novels` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "novels_title_key" ON "novels"("title");
