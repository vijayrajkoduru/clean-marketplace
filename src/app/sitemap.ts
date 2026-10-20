import type { MetadataRoute } from "next";
import { getCategorySlugs, getServiceSlugs } from "@/lib/catalog";

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, services] = await Promise.all([getCategorySlugs(), getServiceSlugs()]);
  const pages = ["", "/services", "/partner/join", "/about", "/help", "/contact", "/terms", "/privacy", "/refund-policy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...categories.map((s) => ({ url: `${base}/c/${s}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...services.map((s) => ({ url: `${base}/s/${s}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
