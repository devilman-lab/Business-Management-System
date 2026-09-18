-- CreateTable
CREATE TABLE "FileBlob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" BLOB NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
