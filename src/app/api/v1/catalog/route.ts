import { ok, preflight } from "@/lib/api";
import { getAllServices, getCategories, getFeaturedServices } from "@/lib/catalog";

export const OPTIONS = preflight;

/** Categories, every active service (as cards) and the most booked services. Image paths are relative to the website. */
export async function GET() {
  const [categories, services, featured] = await Promise.all([getCategories(), getAllServices(), getFeaturedServices()]);
  return ok({ categories, services, featured: featured.map((s) => s.slug) });
}
