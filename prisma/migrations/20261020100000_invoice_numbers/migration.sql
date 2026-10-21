-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "invoiceNo" TEXT;

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "fy" TEXT NOT NULL PRIMARY KEY,
    "last" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_invoiceNo_key" ON "Booking"("invoiceNo");

