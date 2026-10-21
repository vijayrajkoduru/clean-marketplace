import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { workPhotoUrl } from "./work-photos";

/**
 * Cached reads for the "Our work" gallery. Refreshed when an admin changes an item
 * (updateTag("portfolio")).
 */

export type WorkItem = {
  id: string;
  title: string;
  description: string;
  image: string;
  beforeImage: string | null;
  width: number;
  height: number;
  category: { slug: string; name: string } | null;
  service: { slug: string; name: string } | null;
  city: string | null;
  /** ISO date the work was done, if the admin entered it. */
  doneOn: string | null;
  featured: boolean;
};

const select = {
  id: true,
  title: true,
  description: true,
  image: true,
  beforeImage: true,
  width: true,
  height: true,
  doneOn: true,
  featured: true,
  category: { select: { slug: true, name: true } },
  service: { select: { slug: true, name: true } },
  city: { select: { name: true } },
} as const;

type Row = {
  id: string;
  title: string;
  description: string;
  image: string;
  beforeImage: string | null;
  width: number;
  height: number;
  doneOn: Date | null;
  featured: boolean;
  category: { slug: string; name: string } | null;
  service: { slug: string; name: string } | null;
  city: { name: string } | null;
};

function toItem(r: Row): WorkItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    image: workPhotoUrl(r.image),
    beforeImage: r.beforeImage ? workPhotoUrl(r.beforeImage) : null,
    width: r.width,
    height: r.height,
    category: r.category,
    service: r.service,
    city: r.city?.name ?? null,
    doneOn: r.doneOn ? r.doneOn.toISOString() : null,
    featured: r.featured,
  };
}

/** Published work, newest first. Featured items come first when `featuredFirst` is set. */
export async function getWork({ category, limit = 60, featuredFirst = false }: { category?: string; limit?: number; featuredFirst?: boolean } = {}): Promise<WorkItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("portfolio");
  const rows = await db.portfolioItem.findMany({
    where: { active: true, ...(category ? { category: { slug: category } } : {}) },
    orderBy: featuredFirst ? [{ featured: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }],
    take: limit,
    select,
  });
  return rows.map(toItem);
}

export async function getWorkItem(id: string): Promise<WorkItem | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("portfolio");
  const row = await db.portfolioItem.findFirst({ where: { id, active: true }, select });
  return row ? toItem(row) : null;
}

/** Categories that have published work, for the filter on the gallery page. */
export async function getWorkCategories(): Promise<{ slug: string; name: string; count: number }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("portfolio");
  const groups = await db.portfolioItem.groupBy({ by: ["categoryId"], where: { active: true, categoryId: { not: null } }, _count: { _all: true } });
  if (!groups.length) return [];
  const cats = await db.category.findMany({ where: { id: { in: groups.map((g) => g.categoryId!) } }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } });
  return cats.map((c) => ({ slug: c.slug, name: c.name, count: groups.find((g) => g.categoryId === c.id)?._count._all ?? 0 }));
}

/** How many items are published. The gallery links stay hidden while this is 0. */
export async function countWork(): Promise<number> {
  "use cache";
  cacheLife("hours");
  cacheTag("portfolio");
  return db.portfolioItem.count({ where: { active: true } });
}
