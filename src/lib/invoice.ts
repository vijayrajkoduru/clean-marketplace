import "server-only";
import { site } from "@/config/site";
import { db } from "./db";

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Indian financial year for a date, for example "2026-27" (April to March, in IST). */
export function financialYear(d: Date): string {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  const y = t.getUTCFullYear();
  const start = t.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Gives the booking a consecutive invoice number (INV/2026-27/000001) if it has none yet. */
export async function ensureInvoiceNumber(bookingId: string, issuedAt: Date): Promise<string> {
  return db.$transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { invoiceNo: true } });
    if (b.invoiceNo) return b.invoiceNo;
    const fy = financialYear(issuedAt);
    const counter = await tx.invoiceCounter.upsert({ where: { fy }, create: { fy, last: 1 }, update: { last: { increment: 1 } } });
    const invoiceNo = `INV/${fy}/${String(counter.last).padStart(6, "0")}`;
    await tx.booking.update({ where: { id: bookingId }, data: { invoiceNo } });
    return invoiceNo;
  });
}

export type TaxBreakup = { taxable: number; cgst: number; sgst: number; igst: number; rate: number; intraState: boolean };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Splits a GST-inclusive amount into taxable value and tax. Null when the business has no GSTIN. */
export function taxBreakup(totalInclusive: number, customerState: string): TaxBreakup | null {
  if (!site.gstin) return null;
  const rate = site.gstRate;
  const taxable = round2((totalInclusive * 100) / (100 + rate));
  const tax = round2(totalInclusive - taxable);
  const intraState = customerState.trim().toLowerCase() === site.businessState.trim().toLowerCase();
  const half = round2(tax / 2);
  return intraState
    ? { taxable, cgst: half, sgst: round2(tax - half), igst: 0, rate, intraState }
    : { taxable, cgst: 0, sgst: 0, igst: tax, rate, intraState };
}

const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,299.00 */
export function rupees2(n: number): string {
  return `₹${inr2.format(n)}`;
}
