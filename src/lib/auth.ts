import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const SESSION_COOKIE = "clean_session";
const SESSION_DAYS = 30;

export type Role = "CUSTOMER" | "PARTNER" | "ADMIN";
export type SessionUser = { id: string; phone: string; name: string | null; role: Role };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The signed-in user for this request, or null. Reads the session cookie. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // The session check reads the clock, so it must only run for a real request.
  await io();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, phone: true, name: true, role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return { ...session.user, role: session.user.role as Role };
});

/** Redirects to the login page when nobody is signed in. */
export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(role: "ADMIN" | "PARTNER", next: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.role !== role && user.role !== "ADMIN") redirect("/");
  return user;
}

/** Creates a session row and sets the cookie. Call only from a Server Action. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the session row and cookie. Call only from a Server Action. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => /^[6-9]\d{9}$/.test(p));
}
