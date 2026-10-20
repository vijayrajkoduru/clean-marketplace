import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { reviewPartner } from "@/app/actions/admin";
import { formatDate, parseList } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ActionButton, PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Professionals" };

const TABS = [
  ["PENDING", "Applications"],
  ["APPROVED", "Active"],
  ["SUSPENDED", "Suspended"],
  ["REJECTED", "Rejected"],
] as const;

const ID_LABEL: Record<string, string> = { AADHAAR: "Aadhaar", PAN: "PAN", DRIVING_LICENCE: "Driving licence", VOTER_ID: "Voter ID" };

async function AdminPartnersContent({ searchParams }: PageProps<"/admin/partners">) {
  await requireRole("ADMIN", "/admin/partners");
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = TABS.some(([s]) => s === raw) ? (raw as string) : "PENDING";

  const [partners, categories, counts] = await Promise.all([
    db.partner.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, phone: true } },
        city: true,
        _count: { select: { jobs: { where: { status: "COMPLETED" } } } },
      },
    }),
    db.category.findMany({ select: { id: true, name: true } }),
    db.partner.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const countOf = new Map(counts.map((c) => [c.status, c._count._all]));
  const ratings = await db.review.groupBy({
    by: ["partnerId"],
    where: { partnerId: { in: partners.map((p) => p.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const ratingOf = new Map(ratings.map((r) => [r.partnerId, r]));

  return (
    <div>
      <PageTitle title="Professionals" />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Status">
        {TABS.map(([s, label]) => (
          <Link
            key={s}
            href={`/admin/partners?status=${s}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${status === s ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:border-brand-600"}`}
          >
            {label} ({countOf.get(s) ?? 0})
          </Link>
        ))}
      </nav>

      {partners.length ? (
        <ul className="grid gap-4 xl:grid-cols-2">
          {partners.map((p) => {
            const r = ratingOf.get(p.id);
            return (
              <li key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.user.name ?? "No name"}</p>
                    <p className="text-sm"><a href={`tel:+91${p.user.phone}`} className="text-brand-700">+91 {p.user.phone}</a> · {p.city.name}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted">Experience</dt><dd>{p.experienceYears} years</dd></div>
                  <div><dt className="text-xs text-muted">ID proof</dt><dd>{p.idProofType ? `${ID_LABEL[p.idProofType] ?? p.idProofType} ending ${p.idProofLast4}` : "-"}</dd></div>
                  <div><dt className="text-xs text-muted">Applied</dt><dd>{formatDate(p.createdAt)}</dd></div>
                  <div><dt className="text-xs text-muted">Jobs done</dt><dd>{p._count.jobs}{r?._avg.rating ? ` · ${r._avg.rating.toFixed(1)} from ${r._count._all}` : ""}</dd></div>
                </dl>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {parseList(p.skills).map((id) => <span key={id} className="chip">{catName.get(id) ?? "Unknown"}</span>)}
                </p>
                {p.bio ? <p className="mt-3 text-sm text-muted">{p.bio}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {p.status !== "APPROVED" ? (
                    <ActionButton action={reviewPartner.bind(null, p.id, "APPROVED")} label={p.status === "PENDING" ? "Approve" : "Reactivate"} className="btn-primary" confirmText="Have you verified this person's ID and skills on a call?" />
                  ) : (
                    <ActionButton action={reviewPartner.bind(null, p.id, "SUSPENDED")} label="Suspend" className="btn-outline text-danger" confirmText="Suspend this professional? They will stop seeing jobs." />
                  )}
                  {p.status === "PENDING" ? <ActionButton action={reviewPartner.bind(null, p.id, "REJECTED")} label="Reject" className="btn-ghost text-danger" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card p-8 text-center text-sm text-muted">Nobody here right now.</p>
      )}
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminPartners(props: PageProps<"/admin/partners">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminPartnersContent {...props} />
    </Suspense>
  );
}
