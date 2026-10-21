import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { NotificationList } from "@/components/notification-list";
import { PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Notifications" };

async function AdminNotificationsContent() {
  const admin = await requireAdmin("/admin/notifications");
  return (
    <div className="max-w-3xl">
      <PageTitle title="Notifications" />
      <NotificationList userId={admin.id} area="admin" />
    </div>
  );
}

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminNotificationsContent />
    </Suspense>
  );
}
