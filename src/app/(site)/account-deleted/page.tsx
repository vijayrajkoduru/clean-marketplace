import type { Metadata } from "next";
import Link from "next/link";
import { TextPage } from "@/components/text-page";
import { strings } from "@/strings";

export const metadata: Metadata = { title: strings.account.deletedMetaTitle, robots: { index: false } };

/** Shown after a customer deletes their account. */
export default function AccountDeletedPage() {
  const t = strings.account;
  return (
    <TextPage title={t.deletedTitle} intro={t.deletedText}>
      <p>
        <Link href="/" className="btn-primary no-underline">{t.backHome}</Link>
      </p>
    </TextPage>
  );
}
