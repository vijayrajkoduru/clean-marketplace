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
    "plusDiscount" INTEGER NOT NULL DEFAULT 0,
    "walletUsed" INTEGER NOT NULL DEFAULT 0,
    "plusFee" INTEGER NOT NULL DEFAULT 0,
    "invoiceNo" TEXT,
    "payoutId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("address", "cancelReason", "cityId", "code", "couponCode", "createdAt", "customerId", "discount", "fee", "id", "invoiceNo", "notes", "partnerId", "paymentMethod", "paymentStatus", "payoutId", "plusFee", "razorpayOrderId", "razorpayPaymentId", "scheduledAt", "startCode", "status", "subtotal", "total", "updatedAt", "walletUsed") SELECT "address", "cancelReason", "cityId", "code", "couponCode", "createdAt", "customerId", "discount", "fee", "id", "invoiceNo", "notes", "partnerId", "paymentMethod", "paymentStatus", "payoutId", "plusFee", "razorpayOrderId", "razorpayPaymentId", "scheduledAt", "startCode", "status", "subtotal", "total", "updatedAt", "walletUsed" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");
CREATE UNIQUE INDEX "Booking_razorpayOrderId_key" ON "Booking"("razorpayOrderId");
CREATE UNIQUE INDEX "Booking_invoiceNo_key" ON "Booking"("invoiceNo");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_partnerId_idx" ON "Booking"("partnerId");
CREATE INDEX "Booking_cityId_scheduledAt_idx" ON "Booking"("cityId", "scheduledAt");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

