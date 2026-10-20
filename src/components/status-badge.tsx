const STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-saffron-50 text-amber-800",
  CONFIRMED: "bg-brand-50 text-brand-800",
  ASSIGNED: "bg-sky-50 text-sky-800",
  ON_THE_WAY: "bg-indigo-50 text-indigo-800",
  IN_PROGRESS: "bg-violet-50 text-violet-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-700",
};

const LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Professional assigned",
  ON_THE_WAY: "On the way",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? (status === "APPROVED" ? "bg-emerald-50 text-emerald-800" : status === "PENDING" ? "bg-saffron-50 text-amber-800" : "bg-surface text-muted");
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{LABELS[status] ?? status}</span>;
}
