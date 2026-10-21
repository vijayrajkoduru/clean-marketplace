-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Category" ("active", "description", "icon", "id", "image", "name", "slug", "sortOrder", "tagline") SELECT "active", "description", "icon", "id", "image", "name", "slug", "sortOrder", "tagline" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "includes" TEXT NOT NULL DEFAULT '[]',
    "excludes" TEXT NOT NULL DEFAULT '[]',
    "faqs" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("active", "categoryId", "createdAt", "description", "excludes", "faqs", "featured", "id", "image", "includes", "name", "ratingCount", "ratingSum", "slug", "sortOrder", "summary") SELECT "active", "categoryId", "createdAt", "description", "excludes", "faqs", "featured", "id", "image", "includes", "name", "ratingCount", "ratingSum", "slug", "sortOrder", "summary" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");
CREATE TABLE "new_ServiceVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "mrp" INTEGER,
    "durationMins" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ServiceVariant_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceVariant" ("active", "durationMins", "id", "mrp", "name", "price", "serviceId", "sortOrder") SELECT "active", "durationMins", "id", "mrp", "name", "price", "serviceId", "sortOrder" FROM "ServiceVariant";
DROP TABLE "ServiceVariant";
ALTER TABLE "new_ServiceVariant" RENAME TO "ServiceVariant";
CREATE INDEX "ServiceVariant_serviceId_idx" ON "ServiceVariant"("serviceId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralCode" TEXT,
    "referredById" TEXT,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "phone", "referralCode", "referredById", "role") SELECT "createdAt", "email", "id", "name", "phone", "referralCode", "referredById", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

