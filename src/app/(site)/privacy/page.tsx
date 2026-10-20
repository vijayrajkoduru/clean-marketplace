import type { Metadata } from "next";
import { site } from "@/config/site";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <TextPage title="Privacy policy" updated="20 October 2026">
      <p>
        This policy explains what personal data {site.legalName} collects through {site.name}, why we collect it, and your rights under the Digital Personal Data
        Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your mobile number, and your name and email if you add them.</li>
        <li><strong>Bookings:</strong> the services you book, addresses, time slots, notes for the professional, ratings and reviews.</li>
        <li><strong>Payments:</strong> payment status and the Razorpay payment reference. Card, UPI and bank details are handled by Razorpay and never reach us.</li>
        <li><strong>Professionals:</strong> name, city, skills, experience, the type of ID and its last 4 characters. We never collect full ID numbers online.</li>
        <li><strong>Technical:</strong> a login cookie that keeps you signed in, and a cart cookie that remembers your cart. We do not use advertising cookies.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To log you in with a one-time code sent by SMS.</li>
        <li>To arrange the visit: the professional assigned to your booking sees your name, phone number, address and notes.</li>
        <li>To process payments and refunds, and to keep records the law requires.</li>
        <li>To send booking updates and to handle support requests.</li>
        <li>To prevent fraud and misuse.</li>
      </ul>

      <h2>Who we share it with</h2>
      <ul>
        <li>The professional assigned to your booking, only for that booking.</li>
        <li>Razorpay, for payments. Our SMS provider, to deliver login codes and booking updates.</li>
        <li>Government authorities, when the law requires it.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account while it is active. Booking and payment records are kept for 8 years, as Indian tax law requires. Login codes are deleted after use.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your personal data, or withdraw consent, by writing to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
        You can correct your name, email and addresses yourself in My account. If you are not satisfied with our reply, you can complain to the Data Protection Board of India.
      </p>

      <h2>Security</h2>
      <p>
        Data is sent over encrypted connections. Login codes and session tokens are stored only as one-way hashes. Access to customer data is limited to staff who need it.
      </p>

      <h2>Grievance officer</h2>
      <p>
        {site.legalName}, {site.officeAddress}. Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We reply within 7 days.
      </p>
    </TextPage>
  );
}
