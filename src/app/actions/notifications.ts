"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getAdminUser, getCurrentUser, type SessionArea } from "@/lib/auth";

/** Marks the notifications of the website user, or of the admin panel user, as read. */
export async function markAllRead(area: SessionArea = "site"): Promise<void> {
  const user = area === "admin" ? await getAdminUser() : await getCurrentUser();
  if (!user) return;
  const r = await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  if (r.count) refresh();
}
