import Link from "next/link";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import type { SessionArea } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { MarkRead } from "./mark-read";
import { strings } from "@/strings";

/** A user's latest notifications, marked as read shortly after they are shown. */
export async function NotificationList({ userId, area }: { userId: string; area: SessionArea }) {
  const d = strings;
  const items = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = items.some((n) => !n.readAt);
  if (!items.length) {
    return (
      <div className="card mt-6 p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700"><Bell className="size-6" aria-hidden="true" /></div>
        <p className="mt-4 font-semibold">{d.notifications.none}</p>
        <p className="mt-1 text-sm text-muted">{d.notifications.noneText}</p>
      </div>
    );
  }
  return (
    <>
      {unread ? <MarkRead area={area} /> : null}
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((n) => {
          const body = (
            <>
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-brand-600"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={`block ${n.readAt ? "font-medium" : "font-bold"}`}>{n.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{n.body}</span>
                <span className="mt-1 block text-xs text-muted">{formatDateTime(n.createdAt)}</span>
              </span>
            </>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} className="flex gap-3 p-4 hover:bg-surface">{body}</Link>
              ) : (
                <div className="flex gap-3 p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
