import "server-only";
import { db } from "./db";
import { formatDateTime } from "./format";
import { strings, type Strings } from "@/strings";

/**
 * Outgoing messages.
 *
 * Login codes: SMS_PROVIDER=console prints codes in the server log; SMS_PROVIDER=msg91
 * sends them through MSG91's OTP API, which needs a DLT-approved template in MSG91_TEMPLATE_ID.
 *
 * Booking updates: always saved as in-site notifications (the bell in the header). When
 * WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TEMPLATE are set, they are also sent
 * on WhatsApp through Meta's Cloud API. The template needs one body variable, for example:
 *   "Update from Clean: {{1}}"
 */

export function smsProvider(): "console" | "msg91" {
  return process.env.SMS_PROVIDER === "msg91" ? "msg91" : "console";
}

export async function sendLoginCode(phone: string, code: string): Promise<void> {
  if (smsProvider() === "msg91") {
    const key = process.env.MSG91_AUTH_KEY;
    const template = process.env.MSG91_TEMPLATE_ID;
    if (!key || !template) throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID must be set to send SMS.");
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", template);
    url.searchParams.set("mobile", `91${phone}`);
    url.searchParams.set("otp", code);
    const res = await fetch(url, { method: "POST", headers: { authkey: key, "content-type": "application/json" } });
    if (!res.ok) throw new Error(`MSG91 returned ${res.status}`);
    return;
  }
  console.log(`[sms] login code for ${phone}: ${code}`);
}

export function whatsappEnabled(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE);
}

/** Sends a WhatsApp template message. Never throws: a failed message must not fail a booking. */
async function sendWhatsApp(phone: string, text: string): Promise<void> {
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 1000) }] }],
        },
      }),
    });
    if (!res.ok) console.error(`[whatsapp] ${res.status} ${(await res.text()).slice(0, 300)}`);
  } catch (e) {
    console.error("[whatsapp] send failed", e);
  }
}

export type Message = { title: string; body: string; link?: string };

/** Builds a message from the notification texts in src/strings.ts; `when` formats a date. */
export type Compose = (t: Strings["notify"], when: (date: Date) => string) => Message;

/** Saves an in-site notification for the user and sends it on WhatsApp when that is set up. */
export async function notifyUser(userId: string, message: Message | Compose): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
    // Deleted accounts keep a placeholder instead of a phone number and get no messages.
    if (!user || !/^[6-9]\d{9}$/.test(user.phone)) return;
    const msg = typeof message === "function" ? message(strings.notify, formatDateTime) : message;
    await db.notification.create({ data: { userId, title: msg.title, body: msg.body, link: msg.link ?? null } });
    if (whatsappEnabled()) await sendWhatsApp(user.phone, `${msg.title}. ${msg.body}`);
    else console.log(`[notify] ${user.phone}: ${msg.title}. ${msg.body}`);
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

/** Notifies every admin, in the site only. */
export async function notifyAdmins(msg: Message): Promise<void> {
  try {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length) await db.notification.createMany({ data: admins.map((a) => ({ userId: a.id, title: msg.title, body: msg.body, link: msg.link ?? null })) });
  } catch (e) {
    console.error("[notify] admins failed", e);
  }
}
