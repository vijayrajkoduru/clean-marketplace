import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { parseList } from "./format";
import { dishPhotoFiles, getServiceMenu } from "./menu";

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
  /** "plate": the price is per guest (catering) and the customer picks a menu. */
  unit: "job" | "plate";
  minGuests: number;
  maxGuests: number;
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
  /** "plate" when the starting price is per guest. */
  priceUnit: "job" | "plate";
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
  // The database stores the unit as plain text.
  variants: (Omit<Variant, "unit"> & { unit: string })[];
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
    priceUnit: cheapest?.unit === "plate" ? "plate" : "job",
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
    select: { id: true, name: true, price: true, mrp: true, durationMins: true, unit: true, minGuests: true, maxGuests: true },
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
  return serviceBySlug(slug, dishPhotoFiles());
}

/** Cached per slug and per set of dish photo files, so new dish photos show without a restart. */
async function serviceBySlug(slug: string, photoFiles: string) {
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
      unit: v.unit === "plate" ? ("plate" as const) : ("job" as const),
      minGuests: v.minGuests,
      maxGuests: v.maxGuests,
    })),
    menu: await getServiceMenu(s.id, photoFiles),
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

export type ServiceReviews = {
  average: number;
  count: number;
  stars: { star: number; count: number }[];
  latest: { id: string; rating: number; comment: string | null; name: string; date: string }[];
};

/** Ratings and recent comments for a service. Names are shortened to first name and initial. */
export async function getServiceReviews(serviceId: string): Promise<ServiceReviews | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const where = { booking: { items: { some: { serviceId } } } };
  const [grouped, latest] = await Promise.all([
    db.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    db.review.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 30,
      select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
    }),
  ]);
  const count = grouped.reduce((n, g) => n + g._count._all, 0);
  if (!count) return null;
  const sum = grouped.reduce((n, g) => n + g.rating * g._count._all, 0);
  const shortName = (name: string | null) => {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "Customer";
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
  };
  // Reviews with a comment first, newest first within each group.
  const sorted = [...latest].sort((a, b) => Number(Boolean(b.comment)) - Number(Boolean(a.comment)));
  return {
    average: Math.round((sum / count) * 10) / 10,
    count,
    stars: [5, 4, 3, 2, 1].map((star) => ({ star, count: grouped.find((g) => g.rating === star)?._count._all ?? 0 })),
    latest: sorted.slice(0, 8).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      name: shortName(r.user.name),
      date: r.createdAt.toISOString(),
    })),
  };
}

export async function getCity(slug: string): Promise<CityOption | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("cities");
  return db.city.findFirst({ where: { slug, active: true }, select: { id: true, slug: true, name: true, state: true } });
}
