import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "About us", description: `Why we started ${site.name} and how we choose the professionals who visit your home.` };

export default function AboutPage() {
  return (
    <TextPage title={`About ${site.name}`} intro="Home services that arrive on time, at a fixed price, done by people you can trust.">
      <p>
        Finding a good electrician, cleaner or AC technician should not take ten phone calls. Prices change on the doorstep, people do not turn up,
        and when something goes wrong there is nobody to call. We started {site.name} to fix that.
      </p>
      <h2>What we promise</h2>
      <ul>
        <li><strong>Fixed prices, shown upfront.</strong> You see the full price before you book. Prices include taxes.</li>
        <li><strong>Verified professionals.</strong> Every professional is ID-checked and their skills are tested before they take a job.</li>
        <li><strong>On your schedule.</strong> Pick a time slot that suits you, and reschedule for free up to 2 hours before.</li>
        <li><strong>{site.warrantyDays}-day warranty.</strong> If the same problem comes back within {site.warrantyDays} days of the visit, we fix it again at no charge.</li>
      </ul>
      <h2>How we work with professionals</h2>
      <p>
        The people who visit your home are independent professionals who partner with us. They choose the jobs they want, keep {site.partnerSharePercent}% of
        the service price, and get support from our team. Fair pay and respect lead to better work, and better work is what keeps customers coming back.
      </p>
      <p>
        Are you a skilled professional? <Link href="/partner/join">Join us</Link>.
      </p>
      <h2>Where we are</h2>
      <p>
        We are based in {site.officeAddress} and serve customers across Telangana and Andhra Pradesh. Write to us at{" "}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </TextPage>
  );
}
