import { ok, preflight } from "@/lib/api";
import { getWork, getWorkCategories } from "@/lib/portfolio";

export const OPTIONS = preflight;

/**
 * Photos from "Our work", newest first (featured first when no category is given), and the
 * categories that have photos. ?category=<slug> filters, ?limit=<n> caps (default 60).
 * Image paths are relative to the website.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || undefined;
  const limit = Math.min(60, Math.max(1, Math.floor(Number(url.searchParams.get("limit")) || 60)));
  const [items, categories] = await Promise.all([getWork({ category, limit, featuredFirst: !category }), getWorkCategories()]);
  return ok({ items, categories });
}
