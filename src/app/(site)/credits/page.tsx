import type { Metadata } from "next";
import credits from "@/config/photo-credits.json";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Photo credits", robots: { index: false } };

type Credit = { file: string; title: string; author: string; license: string; licenseUrl?: string; source: string };

export default function CreditsPage() {
  const list = credits as Credit[];
  return (
    <TextPage title="Photo credits" intro="Photos on this site come from Wikimedia Commons and are used under the licences shown.">
      {list.length ? (
        <ul>
          {list.map((c) => (
            <li key={c.file}>
              <a href={c.source} rel="noopener" target="_blank">{c.title}</a> by {c.author},{" "}
              {c.licenseUrl ? <a href={c.licenseUrl} rel="noopener license" target="_blank">{c.license}</a> : c.license}. Used on {c.file}.
            </li>
          ))}
        </ul>
      ) : (
        <p>All images on this site are our own.</p>
      )}
    </TextPage>
  );
}
