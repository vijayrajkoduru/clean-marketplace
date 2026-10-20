import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { parseList } from "./format";

/**
 * Cached catalogue reads. They are part of the prerendered pages and are
 * refreshed when an admin edits the catalogue (updateTag("catalog")).
 */

export type Variant = {
  id: string;
  name: string;
  price: number;
  mrp: number | null;
  durationMins: number;
};

export type ServiceCardData = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  image: string | null;
  categorySlug: string;
  categoryName: string;
  fromPrice: number;
  fromMrp: number | null;
  durationMins: number;
  rating: number | null;
  ratingCount: number;
  featured: boolean;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  image: string | null;
  serviceCount: number;
  fromPrice: number | null;
};

type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  image: string | null;
  featured: boolean;
  ratingSum: number;
  ratingCount: number;
  category: { slug: string; name: string; image: string | null };
  variants: Variant[];
};

function toCard(s: ServiceRow): ServiceCardData {
  const cheapest = [...s.variants].sort((a, b) => a.price - b.price)[0];
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    summary: s.summary,
    image: s.image ?? s.category.image,
    categorySlug: s.category.slug,
    categoryName: s.category.name,
    fromPrice: cheapest?.price ?? 0,
    fromMrp: cheapest?.mrp ?? null,
    durationMins: cheapest?.durationMins ?? 60,
    rating: s.ratingCount ? Math.round((s.ratingSum / s.ratingCount) * 10) / 10 : null,
    ratingCount: s.ratingCount,
    featured: s.featured,
  };
}

const serviceCardSelect = {
  id: true,
  slug: true,
  name: true,
  summary: true,
  image: true,
  featured: true,
  ratingSum: true,
  ratingCount: true,
  category: { select: { slug: true, name: true, image: true } },
  variants: {
    where: { active: true },
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, name: true, price: true, mrp: true, durationMins: true },
  },
};

export async function getCategories(): Promise<CategorySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const cats = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        where: { active: true },
        select: { variants: { where: { active: true }, select: { price: true } } },
      },
    },
  });
  return cats.map((c) => {
    const prices = c.services.flatMap((s) => s.variants.map((v) => v.price));
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      icon: c.icon,
      image: c.image,
      serviceCount: c.services.length,
      fromPrice: prices.length ? Math.min(...prices) : null,
    };
  });
}

export async function getCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const c = await db.category.findFirst({
    where: { slug, active: true },
    include: {
      services: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: serviceCardSelect },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    icon: c.icon,
    image: c.image,
    services: c.services.map(toCard),
  };
}

export async function getService(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const s = await db.service.findFirst({
    where: { slug, active: true, category: { active: true } },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!s) return null;
  const related = await db.service.findMany({
    where: { categoryId: s.categoryId, active: true, NOT: { id: s.id } },
    orderBy: { sortOrder: "asc" },
    take: 4,
    select: serviceCardSelect,
  });
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    summary: s.summary,
    description: s.description,
    image: s.image ?? s.category.image,
    includes: parseList(s.includes),
    excludes: parseList(s.excludes),
    faqs: parseList<{ q: string; a: string }>(s.faqs),
    rating: s.ratingCount ? Math.round((s.ratingSum / s.ratingCount) * 10) / 10 : null,
    ratingCount: s.ratingCount,
    category: { slug: s.category.slug, name: s.category.name, icon: s.category.icon },
    variants: s.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      mrp: v.mrp,
      durationMins: v.durationMins,
    })),
    related: related.map(toCard),
  };
}

export async function getFeaturedServices(): Promise<ServiceCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const rows = await db.service.findMany({
    where: { active: true, featured: true, category: { active: true } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take: 12,
    select: serviceCardSelect,
  });
  return rows.map(toCard);
}

/** Every active service, grouped by category, for the all-services page and search. */
export async function getAllServices(): Promise<ServiceCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const rows = await db.service.findMany({
    where: { active: true, category: { active: true } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: serviceCardSelect,
  });
  return rows.map(toCard);
}

export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const rows = await db.category.findMany({ where: { active: true }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

export async function getServiceSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const rows = await db.service.findMany({ where: { active: true }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

export type CityOption = { id: string; slug: string; name: string; state: string };

export async function getCities(): Promise<CityOption[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cities");
  return db.city.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, state: true },
  });
}
