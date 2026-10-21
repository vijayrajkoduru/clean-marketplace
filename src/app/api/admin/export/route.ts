import { getAdminUser } from "@/lib/auth";
import { partnerEarning } from "@/lib/booking";
import { formatDateTime } from "@/lib/format";
import { bookingsInRange, RANGES, type RangeKey } from "@/lib/reports";

/** Bookings for a period as a CSV file that opens in Excel. Admins only. */
export async function GET(req: Request) {
  if (!(await getAdminUser())) return new Response("Admins only", { status: 403 });
  const raw = new URL(req.url).searchParams.get("range") ?? "month";
  const range: RangeKey = raw in RANGES ? (raw as RangeKey) : "month";
  const bookings = await bookingsInRange(range);

  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Quote, and stop Excel from treating text that starts with = + - @ as a formula.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ["Booking", "Visit", "City", "Customer", "Phone", "Services", "Status", "Payment", "Payment status", "Item total", "Discount", "Visiting fee", "Total", "Professional", "Professional earning", "Invoice"];
  const lines = [head.join(",")];
  for (const b of bookings) {
    lines.push([
      b.code,
      formatDateTime(b.scheduledAt),
      b.city.name,
      b.customer.name,
      b.customer.phone,
      b.items.map((i) => `${i.serviceName} (${i.variantName}) ${i.guests ? `${i.guests} guests` : `x${i.quantity}`}`).join("; "),
      b.status,
      b.paymentMethod,
      b.paymentStatus,
      b.subtotal,
      b.discount,
      b.fee,
      b.total,
      b.partner?.user.name ?? "",
      b.status === "COMPLETED" ? partnerEarning(b.subtotal) : "",
      b.invoiceNo ?? "",
    ].map(cell).join(","));
  }
  // The byte order mark lets Excel read the rupee-free UTF-8 text correctly.
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="bookings-${range}.csv"`,
      "cache-control": "no-store",
    },
  });
}
