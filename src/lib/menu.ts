import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db";
import { dishSlug, type ServiceMenu } from "./menu-rules";

const PHOTO_FILE = /^([a-z0-9-]+)(?:\.v(\d+))?\.jpg$/;

/**
 * The dish photo files in public/img/dishes, as one string. Read on every call (it is a small
 * folder) and passed into the cached menu, so a photo added or renamed shows at once.
 */
export function dishPhotoFiles(): string {
  try {
    return readdirSync(join(/* turbopackIgnore: true */ process.cwd(), "public", "img", "dishes")).filter((f) => PHOTO_FILE.test(f)).sort().join("|");
  } catch {
    return "";
  }
}

/**
 * Dish photos by dish slug: <slug>.jpg, or a newer version saved as <slug>.v2.jpg,
 * <slug>.v3.jpg... The highest version wins. A replaced photo needs a new file name, because
 * the site caches resized photos by their address.
 */
function dishPhotos(files: string): Map<string, string> {
  const best = new Map<string, { file: string; version: number }>();
  for (const file of files ? files.split("|") : []) {
    const m = PHOTO_FILE.exec(file);
    if (!m) continue;
    const version = m[2] ? Number(m[2]) : 1;
    const seen = best.get(m[1]);
    if (!seen || version > seen.version) best.set(m[1], { file, version });
  }
  return new Map([...best].map(([slug, { file }]) => [slug, `/img/dishes/${file}`]));
}

export { checkGuests, checkMenu, dishSlug, parseMenu, type MenuCheck, type MenuCourseView, type MenuDishView, type MenuLine, type MenuRuleView, type ServiceMenu } from "./menu-rules";

/**
 * Menus for per-plate services (catering). A service's menu has courses ("Veg curries") with
 * dishes; each package (a per-plate variant) has a rule per course: how many dishes are in the
 * plate price, the fewest and most the customer may pick, and the extra per plate for each dish
 * beyond the included ones. Fixed courses (salad, papad...) are always served in full.
 *
 * The same checks run in the cart, the quote, and when the booking is placed, so a menu sent
 * from a browser or the app is never trusted as is.
 */

/** The menu of a service, or null when it has none. Cached with the catalogue. */
export async function getServiceMenu(serviceId: string, photoFiles = dishPhotoFiles()): Promise<ServiceMenu | null> {
  return serviceMenu(serviceId, photoFiles);
}

async function serviceMenu(serviceId: string, photoFiles: string): Promise<ServiceMenu | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const courses = await db.menuCourse.findMany({
    where: { serviceId },
    orderBy: { sortOrder: "asc" },
    include: {
      dishes: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, veg: true, extraPrice: true } },
      rules: { select: { variantId: true, courseId: true, included: true, minPick: true, maxPick: true, extraPrice: true } },
    },
  });
  if (!courses.length) return null;
  const photos = dishPhotos(photoFiles);
  const rules: ServiceMenu["rules"] = {};
  for (const c of courses) {
    for (const r of c.rules) (rules[r.variantId] ??= []).push({ courseId: r.courseId, included: r.included, minPick: r.minPick, maxPick: r.maxPick, extraPrice: r.extraPrice });
  }
  return {
    courses: courses.map((c) => ({ id: c.id, name: c.name, fixed: c.fixed, dishes: c.dishes.map((d) => ({ ...d, image: photos.get(dishSlug(d.name)) ?? null })) })),
    rules,
  };
}
