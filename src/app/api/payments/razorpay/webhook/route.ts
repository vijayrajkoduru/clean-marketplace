import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markBookingPaid } from "@/lib/payments";

/**
 * Razorpay webhook. In the Razorpay dashboard, point a webhook at
 * https://<your-domain>/api/payments/razorpay/webhook with the events
 * payment.captured and order.paid, and put its secret in RAZORPAY_WEBHOOK_SECRET.
 * It confirms bookings even when the customer closes the tab right after paying.
 */

type PaymentEntity = { id: string; order_id: string | null; amount: number; status: string };
type WebhookBody = { event: string; payload?: { payment?: { entity?: PaymentEntity } } };

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return Response.json({ ok: false }, { status: 400 });

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (body.event === "payment.captured" || body.event === "order.paid") {
    const payment = body.payload?.payment?.entity;
    if (payment?.order_id && payment.status === "captured") {
      const booking = await db.booking.findUnique({ where: { razorpayOrderId: payment.order_id } });
      if (booking && payment.amount === booking.total * 100) {
        await markBookingPaid(booking.id, payment.id, "SYSTEM");
      } else if (booking) {
        console.error(`[razorpay] amount mismatch on ${booking.code}: got ${payment.amount}, expected ${booking.total * 100}`);
      }
    }
  }
  return Response.json({ ok: true });
}
