-- AlterTable
ALTER TABLE "BookingItem" ADD COLUMN "guests" INTEGER;
ALTER TABLE "BookingItem" ADD COLUMN "menu" TEXT;
ALTER TABLE "BookingItem" ADD COLUMN "platePrice" INTEGER;

-- CreateTable
CREATE TABLE "MenuCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuCourse_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuDish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "veg" BOOLEAN NOT NULL DEFAULT true,
    "extraPrice" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuDish_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "MenuCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "included" INTEGER NOT NULL,
    "minPick" INTEGER NOT NULL,
    "maxPick" INTEGER NOT NULL,
    "extraPrice" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuRule_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ServiceVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuRule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "MenuCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "mrp" INTEGER,
    "durationMins" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "unit" TEXT NOT NULL DEFAULT 'job',
    "minGuests" INTEGER NOT NULL DEFAULT 0,
    "maxGuests" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServiceVariant_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceVariant" ("active", "durationMins", "id", "mrp", "name", "price", "serviceId", "sortOrder") SELECT "active", "durationMins", "id", "mrp", "name", "price", "serviceId", "sortOrder" FROM "ServiceVariant";
DROP TABLE "ServiceVariant";
ALTER TABLE "new_ServiceVariant" RENAME TO "ServiceVariant";
CREATE INDEX "ServiceVariant_serviceId_idx" ON "ServiceVariant"("serviceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MenuCourse_serviceId_idx" ON "MenuCourse"("serviceId");

-- CreateIndex
CREATE INDEX "MenuDish_courseId_idx" ON "MenuDish"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuRule_variantId_courseId_key" ON "MenuRule"("variantId", "courseId");

