import "server-only";
import { site } from "@/config/site";
import { strings } from "@/strings";
import { db } from "./db";
import type { SessionUser } from "./auth";
import { customerCanChange, partnerEarning, PROGRESS, STATUS, type AddressSnapshot } from "./booking";
import { parseList } from "./format";
import { activePlus } from "./membership";
import { referralCodeFor, walletBalance } from "./wallet";
import { unsettledBalance } from "./payouts";
import { expireStalePayments } from "./maintenance";
import { parseMenu } from "./menu-rules";
import { razorpayEnabled, razorpayKeyId } from "./razorpay";

/**
 * Data for the mobile app API: the same numbers the website pages show, as plain JSON.
 */

const iso = (d: Date) => d.toISOString();
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Public settings the app needs before anyone signs in. */
export function appSettings() {
  return {
    name: site.name,
    tagline: site.tagline,
    supportEmail: site.supportEmail,
    supportPhone: site.supportPhone || null,
    whatsappNumber: site.whatsappNumber || null,
    minOrder: site.minOrder,
    convenienceFee: site.convenienceFee,
    freeFeeAbove: site.freeFeeAbove,
    changeCutoffMinutes: site.changeCutoffMinutes,
    warrantyDays: site.warrantyDays,
    partnerSharePercent: site.partnerSharePercent,
    maxCartItems: site.maxCartItems,
    plus: site.plus,
    referral: site.referral,
    onlinePayment: razorpayEnabled() ? { razorpayKeyId: razorpayKeyId() } : null,
    cancelReasons: strings.booking.reasons,
    statusLabels: strings.status,
    websiteUrl: appUrl(),
  };
}

/** The signed-in user's account: profile, Plus, referral credit and professional status. */
export async function accountView(user: SessionUser) {
  const [profile, plus, credit, entries, friends, code, partner] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true, role: true } }),
    activePlus(user.id),
    walletBalance(user.id),
    db.walletEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.user.count({ where: { referredById: user.id } }),
    referralCodeFor(user.id),
    db.partner.findUnique({ where: { userId: user.id }, select: { status: true } }),
  ]);
  return {
    user: { id: user.id, name: profile?.name ?? null, email: profile?.email ?? null, phone: profile?.phone ?? user.phone, role: profile?.role ?? user.role },
    plusUntil: plus ? iso(plus.endsAt) : null,
    credit,
    walletEntries: entries.map((e) => ({
      id: e.id,
      amount: e.amount,
      // Rewards are saved with the friend's id so each is paid once; show them without it.
      reason: e.reason.startsWith("Referral reward") ? strings.account.walletReward : e.reason,
      at: iso(e.createdAt),
    })),
    referral: { code, link: `${appUrl()}/r/${code}`, friendsJoined: friends },
    partnerStatus: partner?.status ?? null,
  };
}

type ItemRow = { serviceName: string; variantName: string; quantity: number; unitPrice: number; durationMins: number; guests?: number | null; platePrice?: number | null; menu?: string | null };

function itemsView(items: ItemRow[]) {
  return items.map((i) => ({
    serviceName: i.serviceName,
    variantName: i.variantName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    durationMins: i.durationMins,
    // Catering: guests, the price per plate and the chosen menu.
    guests: i.guests ?? null,
    platePrice: i.platePrice ?? null,
    menu: parseMenu(i.menu),
  }));
}

export async function bookingList(user: SessionUser) {
  await expireStalePayments();
  const rows = await db.booking.findMany({
    where: { customerId: user.id },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    select: { code: true, status: true, scheduledAt: true, total: true, items: { select: { serviceName: true, variantName: true, quantity: true, unitPrice: true, durationMins: true } } },
  });
  return rows.map((b) => ({ code: b.code, status: b.status, scheduledAt: iso(b.scheduledAt), total: b.total, items: itemsView(b.items) }));
}

const PAY_WINDOW_MINUTES = 30;

export async function bookingDetail(user: SessionUser, code: string) {
  await expireStalePayments();
  const b = await db.booking.findFirst({
    where: { code, customerId: user.id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
      partner: { select: { experienceYears: true, photoFile: true, user: { select: { name: true, phone: true } } } },
      review: { select: { rating: true, comment: true } },
    },
  });
  if (!b) return null;
  const showStartCode = ["CONFIRMED", "ASSIGNED", "ON_THE_WAY"].includes(b.status);
  const pay =
    b.status === STATUS.PENDING_PAYMENT && b.razorpayOrderId && razorpayEnabled()
      ? { orderId: b.razorpayOrderId, keyId: razorpayKeyId(), amountPaise: b.total * 100, payBy: iso(new Date(b.createdAt.getTime() + PAY_WINDOW_MINUTES * 60 * 1000)) }
      : null;
  return {
    code: b.code,
    status: b.status,
    cityId: b.cityId,
    progress: PROGRESS,
    scheduledAt: iso(b.scheduledAt),
    totalMinutes: b.items.reduce((n, i) => n + i.durationMins * i.quantity, 0),
    items: itemsView(b.items),
    bill: {
      subtotal: b.subtotal,
      discount: b.discount,
      couponCode: b.couponCode,
      plusDiscount: b.plusDiscount,
      plusFee: b.plusFee,
      walletUsed: b.walletUsed,
      fee: b.fee,
      total: b.total,
    },
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    address: JSON.parse(b.address) as AddressSnapshot,
    notes: b.notes,
    cancelReason: b.cancelReason,
    startCode: showStartCode ? b.startCode : null,
    partner: b.partner
      ? { name: b.partner.user.name, phone: b.partner.user.phone, experienceYears: b.partner.experienceYears, hasPhoto: Boolean(b.partner.photoFile) }
      : null,
    review: b.review,
    canChange: customerCanChange(b),
    canRate: b.status === STATUS.COMPLETED && !b.review,
    pay,
    events: b.events.map((e) => ({ status: e.status, note: e.note, at: iso(e.createdAt) })),
  };
}

const IST_OFFSET_MS = 330 * 60 * 1000;
function monthStartIst(now: Date): Date {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - IST_OFFSET_MS);
}

/** The professional's dashboard: their jobs, open jobs that match their skills, earnings and payouts. */
export async function partnerDashboard(user: SessionUser) {
  const partner = await db.partner.findUnique({ where: { userId: user.id }, include: { city: true } });
  if (!partner) return { status: null };
  if (partner.status !== "APPROVED") return { status: partner.status };

  const now = new Date();
  const skills = parseList(partner.skills);
  const [balance, payouts, openRaw, mine, completedThisMonth, recent, ratingAgg] = await Promise.all([
    unsettledBalance(partner.id),
    db.payout.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { bookings: true } } } }),
    db.booking.findMany({
      where: { cityId: partner.cityId, status: "CONFIRMED", partnerId: null, scheduledAt: { gt: now }, customerId: { not: partner.userId } },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: { items: { include: { service: { select: { categoryId: true } } } } },
    }),
    db.booking.findMany({
      where: { partnerId: partner.id, status: { in: ["ASSIGNED", "ON_THE_WAY", "IN_PROGRESS"] } },
      orderBy: { scheduledAt: "asc" },
      include: { items: true },
    }),
    db.booking.findMany({ where: { partnerId: partner.id, status: "COMPLETED", scheduledAt: { gte: monthStartIst(now) } }, select: { subtotal: true } }),
    db.booking.findMany({
      where: { partnerId: partner.id, status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      include: { items: true, review: { select: { rating: true } } },
    }),
    db.review.aggregate({ where: { partnerId: partner.id }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const open = openRaw.filter((b) => b.items.every((i) => skills.includes(i.service.categoryId)));
  return {
    status: partner.status,
    city: partner.city.name,
    stats: {
      earnedThisMonth: completedThisMonth.reduce((n, b) => n + partnerEarning(b.subtotal), 0),
      jobsThisMonth: completedThisMonth.length,
      upcomingJobs: mine.length,
      rating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      ratingCount: ratingAgg._count._all,
    },
    myJobs: mine.map((b) => {
      const a = JSON.parse(b.address) as AddressSnapshot;
      return {
        code: b.code,
        status: b.status,
        scheduledAt: iso(b.scheduledAt),
        items: itemsView(b.items),
        address: a,
        notes: b.notes,
        collectAmount: b.paymentMethod === "PAY_AFTER_SERVICE" && b.paymentStatus !== "PAID" ? b.total : 0,
        earning: partnerEarning(b.subtotal),
      };
    }),
    openJobs: open.map((b) => {
      const a = JSON.parse(b.address) as AddressSnapshot;
      // Until the job is accepted, show only the area, not the exact address or phone.
      return { code: b.code, scheduledAt: iso(b.scheduledAt), items: itemsView(b.items), area: [a.line2, a.city, a.pincode].filter(Boolean).join(", "), earning: partnerEarning(b.subtotal) };
    }),
    balance: { jobs: balance.jobs, earnings: balance.earnings, collected: balance.collected, balance: balance.balance },
    payouts: payouts.map((p) => ({ id: p.id, at: iso(p.createdAt), jobs: p._count.bookings, earnings: p.earnings, collected: p.collected, amount: p.amount, reference: p.reference })),
    recent: recent.map((b) => ({ code: b.code, scheduledAt: iso(b.scheduledAt), services: [...new Set(b.items.map((i) => i.serviceName))], rating: b.review?.rating ?? null, earning: partnerEarning(b.subtotal) })),
  };
}
