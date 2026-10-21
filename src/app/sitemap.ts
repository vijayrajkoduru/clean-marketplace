import type { MetadataRoute } from "next";
import { getCategorySlugs, getCities, getServiceSlugs } from "@/lib/catalog";
import { getWork } from "@/lib/portfolio";

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, services, cities, work] = await Promise.all([getCategorySlugs(), getServiceSlugs(), getCities(), getWork()]);
  const pages = ["", "/services", "/plus", "/partner/join", "/about", "/help", "/contact", "/terms", "/privacy", "/refund-policy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...categories.map((s) => ({ url: `${base}/c/${s}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...services.map((s) => ({ url: `${base}/s/${s}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...cities.map((c) => ({ url: `${base}/in/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...(work.length ? [{ url: `${base}/our-work`, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    ...work.map((x) => ({ url: `${base}/our-work/${x.id}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...cities.flatMap((c) => categories.map((s) => ({ url: `${base}/in/${c.slug}/${s}`, changeFrequency: "weekly" as const, priority: 0.7 }))),
  ];
}
