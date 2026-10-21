import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { NotificationList } from "@/components/notification-list";
import { strings } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: strings.notifications.metaTitle, robots: { index: false } };
}

async function MyNotifications() {
  const user = await requireUser("/notifications");
  return <NotificationList userId={user.id} area="site" />;
}

export default async function NotificationsPage() {
  const d = strings;
  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">{d.notifications.title}</h1>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface" />}>
        <MyNotifications />
      </Suspense>
    </div>
  );
}
