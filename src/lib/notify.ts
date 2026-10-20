import "server-only";

/**
 * Outgoing messages. SMS_PROVIDER=console prints to the server log;
 * SMS_PROVIDER=msg91 sends login codes through MSG91's OTP API, which needs
 * a DLT-approved template in MSG91_TEMPLATE_ID.
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

/** Booking updates. Logged for now; connect a transactional SMS or WhatsApp provider here. */
export async function notifyBooking(phone: string, message: string): Promise<void> {
  console.log(`[notify] ${phone}: ${message}`);
}
