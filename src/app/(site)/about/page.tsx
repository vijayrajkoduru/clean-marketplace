import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { TextPage } from "@/components/text-page";
import { strings, fmt } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  const t = strings.about;
  return { title: t.metaTitle, description: fmt(t.metaDescription, { name: site.name }) };
}

export default async function AboutPage() {
  const d = strings;
  const t = d.about;
  const w = { warranty: site.warrantyDays };
  return (
    <TextPage title={fmt(t.title, { name: site.name })} intro={t.intro}>
      <p>{fmt(t.story, { name: site.name })}</p>
      <h2>{t.promiseTitle}</h2>
      <ul>
        {t.promises.map((p) => (
          <li key={p.b}><strong>{fmt(p.b, w)}</strong> {fmt(p.t, w)}</li>
        ))}
      </ul>
      <h2>{t.prosTitle}</h2>
      <p>{fmt(t.pros, { share: site.partnerSharePercent })}</p>
      <p>
        {t.joinQuestion} <Link href="/partner/join">{t.join}</Link>.
      </p>
      <h2>{t.whereTitle}</h2>
      <p>
        {fmt(t.where, { address: site.officeAddress })}{" "}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </TextPage>
  );
}
