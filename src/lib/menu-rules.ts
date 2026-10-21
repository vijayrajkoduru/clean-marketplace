/**
 * Menu rules for per-plate services (catering), without database access, so the menu builder
 * in the browser shows the same limits and prices that the server checks.
 */

export type MenuDishView = { id: string; name: string; veg: boolean; extraPrice: number; /** Photo path, when there is one. */ image: string | null };

/** The file name a dish photo has: public/img/dishes/<slug>.jpg ("Buttermilk (majjiga)" -> "buttermilk-majjiga"). */
export function dishSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export type MenuCourseView = { id: string; name: string; fixed: boolean; dishes: MenuDishView[] };
export type MenuRuleView = { courseId: string; included: number; minPick: number; maxPick: number; extraPrice: number };
export type ServiceMenu = {
  courses: MenuCourseView[];
  /** Rules per package (variant id). */
  rules: Record<string, MenuRuleView[]>;
};

/** One course of a chosen menu, as stored on the booking and shown everywhere. */
export type MenuLine = { course: string; dishes: string[]; extra: number };

export type MenuCheck =
  | { ok: true; extraPerPlate: number; lines: MenuLine[]; dishIds: string[] }
  | { ok: false; error: string };

const plural = (n: number, one: string) => (n === 1 ? `1 ${one}` : `${n} ${one}s`);

/** Checks the dishes picked for a package and works out the extra per plate. */
export function checkMenu(menu: ServiceMenu, variantId: string, picked: string[]): MenuCheck {
  const rules = menu.rules[variantId];
  if (!rules?.length) return { ok: false, error: "This package has no menu yet." };
  const chosen = new Set(picked);
  const known = new Set<string>();
  const lines: MenuLine[] = [];
  const dishIds: string[] = [];
  let extraPerPlate = 0;
  for (const course of menu.courses) {
    for (const d of course.dishes) known.add(d.id);
    if (course.fixed) {
      if (course.dishes.length) lines.push({ course: course.name, dishes: course.dishes.map((d) => d.name), extra: 0 });
      continue;
    }
    const rule = rules.find((r) => r.courseId === course.id);
    const inCourse = course.dishes.filter((d) => chosen.has(d.id));
    if (!rule) {
      if (inCourse.length) return { ok: false, error: `${course.name} are not part of this package.` };
      continue;
    }
    const lower = course.name.toLowerCase();
    if (inCourse.length < rule.minPick) return { ok: false, error: `Pick at least ${plural(rule.minPick, "dish")} from ${lower}.` };
    if (inCourse.length > rule.maxPick) return { ok: false, error: `You can pick up to ${plural(rule.maxPick, "dish")} from ${lower}.` };
    const extraDishes = Math.max(0, inCourse.length - rule.included);
    const extra = extraDishes * rule.extraPrice + inCourse.reduce((n, d) => n + d.extraPrice, 0);
    extraPerPlate += extra;
    if (inCourse.length) lines.push({ course: course.name, dishes: inCourse.map((d) => d.name), extra });
    dishIds.push(...inCourse.map((d) => d.id));
  }
  for (const id of chosen) if (!known.has(id)) return { ok: false, error: "A dish you picked is no longer on the menu. Please choose again." };
  return { ok: true, extraPerPlate, lines, dishIds };
}

export function checkGuests(guests: number, minGuests: number, maxGuests: number): string | null {
  if (!Number.isInteger(guests) || guests < 1) return "Enter the number of guests.";
  if (minGuests && guests < minGuests) return `This package is for at least ${minGuests} guests.`;
  if (maxGuests && guests > maxGuests) return `For more than ${maxGuests} guests, please call us for a quote.`;
  return null;
}

/** The menu stored on a booking item, or [] when there is none. */
export function parseMenu(json: string | null | undefined): MenuLine[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? (v as MenuLine[]).filter((l) => l && typeof l.course === "string" && Array.isArray(l.dishes)) : [];
  } catch {
    return [];
  }
}
