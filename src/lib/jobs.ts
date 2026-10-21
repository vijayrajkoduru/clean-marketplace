import "server-only";
import { db } from "./db";
import { formatDateTime, parseList, rupees } from "./format";
import { partnerEarning, type AddressSnapshot } from "./booking";
import { notifyAdmins, notifyUser } from "./notify";
import { fmt } from "@/strings";

/**
 * Tells every approved professional in the booking's city who has all the needed skills
 * that a new job is open, and tells the admins. Call when a booking becomes CONFIRMED
 * without a professional.
 */
export async function announceNewJob(bookingId: string): Promise<void> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { city: true, items: { include: { service: { select: { categoryId: true } } } } },
  });
  if (!b || b.status !== "CONFIRMED" || b.partnerId) return;
  const needed = [...new Set(b.items.map((i) => i.service.categoryId))];
  const services = [...new Set(b.items.map((i) => i.serviceName))].join(", ");
  const area = (() => {
    try {
      const a = JSON.parse(b.address) as AddressSnapshot;
      return [a.line2, a.city].filter(Boolean).join(", ");
    } catch {
      return b.city.name;
    }
  })();
  // The customer is never offered their own booking, even if they are also a professional.
  const partners = await db.partner.findMany({ where: { status: "APPROVED", cityId: b.cityId, userId: { not: b.customerId } }, select: { userId: true, skills: true } });
  const fit = partners.filter((p) => needed.every((c) => parseList(p.skills).includes(c)));
  for (const p of fit) {
    await notifyUser(p.userId, (t, when) => ({
      title: t.newJob,
      body: fmt(t.newJobBody, {
        services,
        when: when(b.scheduledAt),
        area,
        amount: rupees(partnerEarning(b.subtotal)),
      }),
      link: "/partner",
    }));
  }
  await notifyAdmins({
    title: `New booking ${b.code}`,
    body: `${services} on ${formatDateTime(b.scheduledAt)} in ${b.city.name}. ${fit.length ? `Sent to ${fit.length} professional${fit.length > 1 ? "s" : ""}.` : "No professional in this city has these skills yet."}`,
    link: `/admin/bookings/${b.code}`,
  });
}
