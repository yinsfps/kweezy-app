/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `blog_posts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "user_novel_progress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "novelId" INTEGER NOT NULL,
    "lastReadChapterId" INTEGER,
    "lastReadScrollY" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_novel_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_novel_progress_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_novel_progress_lastReadChapterId_fkey" FOREIGN KEY ("lastReadChapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_novel_progress_userId_novelId_key" ON "user_novel_progress"("userId", "novelId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_title_key" ON "blog_posts"("title");
