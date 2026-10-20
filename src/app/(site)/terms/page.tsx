import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <TextPage title="Terms of use" updated="20 October 2026">
      <p>
        These terms apply when you use the {site.name} website to book home services. {site.name} is run by {site.legalName}, {site.officeAddress} (&quot;we&quot;, &quot;us&quot;).
        By creating an account or booking a service, you agree to these terms.
      </p>

      <h2>1. What we do</h2>
      <p>
        We run an online marketplace that connects you with independent professionals who provide home services. The professional who visits you is an independent
        service provider and not our employee. We handle booking, payment, scheduling and support, and we stand behind the service as set out in these terms.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You log in with your Indian mobile number and a one-time code. Keep your phone secure; anyone with it can use your account.</li>
        <li>You must be at least 18 years old to book.</li>
        <li>Give correct details, including the address and the name of the person who will be at home.</li>
      </ul>

      <h2>3. Bookings</h2>
      <ul>
        <li>A booking is confirmed when you see it in My bookings with the status Confirmed.</li>
        <li>An adult must be present at the address for the whole visit.</li>
        <li>The professional may decline or stop work if the site is unsafe, if the work is different from what was booked, or if they are treated with disrespect.</li>
        <li>If extra work or spare parts are needed, the professional will tell you the price first. Extra work happens only if you agree.</li>
      </ul>

      <h2>4. Prices and payment</h2>
      <ul>
        <li>Prices are shown in Indian rupees and include GST.</li>
        <li>The minimum order is ₹{site.minOrder.toLocaleString("en-IN")}. A visiting fee of ₹{site.convenienceFee} applies to orders below ₹{site.freeFeeAbove.toLocaleString("en-IN")}.</li>
        <li>You can pay online when you book, or pay the professional after the service. Online payments are processed by Razorpay; we do not store your card or bank details.</li>
        <li>Coupons have their own conditions, shown with the coupon. One coupon can be used per booking.</li>
      </ul>

      <h2>5. Cancelling and rescheduling</h2>
      <p>
        You can cancel or reschedule for free up to {site.changeCutoffMinutes / 60} hours before the slot. See the <Link href="/refund-policy">cancellation and refund policy</Link> for details.
      </p>

      <h2>6. Warranty</h2>
      <p>
        If the same problem comes back within {site.warrantyDays} days of the visit, we will arrange a free repeat visit. The warranty does not cover damage from misuse,
        new faults unrelated to the original job, or parts bought by you.
      </p>

      <h2>7. Your conduct</h2>
      <p>
        Please treat professionals with respect. We may suspend accounts that abuse, threaten or harass professionals or our staff, or that misuse coupons or payments.
      </p>

      <h2>8. Liability</h2>
      <p>
        If something is damaged during a visit, tell us within 48 hours with photos and your booking code. We will investigate and work with the professional to make
        it right. Our total liability for any booking is limited to the amount you paid for that booking, except where the law does not allow such a limit.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>We may update these terms. The date at the top shows when they last changed. Bookings already made follow the terms in place when they were made.</p>

      <h2>10. Law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Courts in {site.officeAddress.split(",")[0]} have jurisdiction. Before going to court, please write to{" "}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> so we can try to resolve the problem.
      </p>
    </TextPage>
  );
}
