-- AlterTable
ALTER TABLE "Partner" ADD COLUMN "idDocFile" TEXT;
ALTER TABLE "Partner" ADD COLUMN "photoFile" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "earnings" INTEGER NOT NULL,
    "collected" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "partnerId" TEXT,
    "cityId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "couponCode" TEXT,
    "startCode" TEXT NOT NULL,
    "notes" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "cancelReason" TEXT,
    "walletUsed" INTEGER NOT NULL DEFAULT 0,
    "plusFee" INTEGER NOT NULL DEFAULT 0,
    "payoutId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("address", "cancelReason", "cityId", "code", "couponCode", "createdAt", "customerId", "discount", "fee", "id", "notes", "partnerId", "paymentMethod", "paymentStatus", "razorpayOrderId", "razorpayPaymentId", "scheduledAt", "startCode", "status", "subtotal", "total", "updatedAt") SELECT "address", "cancelReason", "cityId", "code", "couponCode", "createdAt", "customerId", "discount", "fee", "id", "notes", "partnerId", "paymentMethod", "paymentStatus", "razorpayOrderId", "razorpayPaymentId", "scheduledAt", "startCode", "status", "subtotal", "total", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");
CREATE UNIQUE INDEX "Booking_razorpayOrderId_key" ON "Booking"("razorpayOrderId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_partnerId_idx" ON "Booking"("partnerId");
CREATE INDEX "Booking_cityId_scheduledAt_idx" ON "Booking"("cityId", "scheduledAt");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
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
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "phone", "role") SELECT "createdAt", "email", "id", "name", "phone", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payout_partnerId_idx" ON "Payout"("partnerId");

-- CreateIndex
CREATE INDEX "WalletEntry_userId_idx" ON "WalletEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_bookingId_key" ON "Membership"("bookingId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
