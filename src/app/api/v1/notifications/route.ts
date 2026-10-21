import { db } from "@/lib/db";
import { ok, preflight, withUser } from "@/lib/api";

export const OPTIONS = preflight;

/** The latest notifications, newest first. */
export async function GET(request: Request) {
  return withUser(request, async (user) => {
    const rows = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
    return ok({
      unread: rows.filter((n) => !n.readAt).length,
      notifications: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: Boolean(n.readAt), at: n.createdAt.toISOString() })),
    });
  });
}

/** Marks every notification as read. */
export async function POST(request: Request) {
  return withUser(request, async (user) => {
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return ok({ ok: true });
  });
}
