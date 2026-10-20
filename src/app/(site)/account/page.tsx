import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCities } from "@/lib/catalog";
import { AddAddressForm, DeleteAddressButton, ProfileForm } from "./account-forms";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

async function AccountView() {
  const user = await requireUser("/account");
  const [profile, addresses, cities] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } }),
    db.address.findMany({ where: { userId: user.id }, include: { city: true }, orderBy: { createdAt: "desc" } }),
    getCities(),
  ]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Profile</h2>
        <ProfileForm name={profile?.name ?? ""} email={profile?.email ?? ""} phone={profile?.phone ?? user.phone} />
      </section>
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Saved addresses</h2>
        {addresses.length ? (
          <ul className="mt-4 space-y-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3.5 text-sm">
                <span>
                  <span className="font-semibold">{a.label}</span>
                  <span className="block text-muted">{[a.line1, a.line2, a.landmark, `${a.city.name} ${a.pincode}`].filter(Boolean).join(", ")}</span>
                </span>
                <DeleteAddressButton id={a.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No saved addresses yet.</p>
        )}
        <AddAddressForm cities={cities.map((c) => ({ id: c.id, name: c.name, state: c.state }))} />
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="container-page max-w-5xl py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">My account</h1>
      <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-2xl bg-surface" />}>
        <AccountView />
      </Suspense>
    </div>
  );
}
