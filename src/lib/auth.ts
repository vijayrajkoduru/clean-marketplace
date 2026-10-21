import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const SESSION_COOKIE = "clean_session";
/**
 * The admin panel has its own login and cookie, so signing in to the website (for example as a
 * customer, to test a booking) in the same browser does not sign the admin out, and the reverse.
 */
export const ADMIN_COOKIE = "clean_admin_session";
const SESSION_DAYS = 30;

export type Role = "CUSTOMER" | "PARTNER" | "ADMIN";
export type SessionUser = { id: string; phone: string; name: string | null; role: Role };
/** Which login a session belongs to: the website (customers and professionals) or the admin panel. */
export type SessionArea = "site" | "admin";
const COOKIE: Record<SessionArea, string> = { site: SESSION_COOKIE, admin: ADMIN_COOKIE };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The user a session token belongs to, or null when the token is unknown or expired. */
export async function userForToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, phone: true, name: true, role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return { ...session.user, role: session.user.role as Role };
}

/** The signed-in user for this request, or null. Reads the session cookie. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // The session check reads the clock, so it must only run for a real request.
  await io();
  return userForToken((await cookies()).get(SESSION_COOKIE)?.value);
});

/** Redirects to the login page when nobody is signed in. */
export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** The admin signed in to the admin panel for this request, or null. Reads the admin cookie. */
export const getAdminUser = cache(async (): Promise<SessionUser | null> => {
  await io();
  const user = await userForToken((await cookies()).get(ADMIN_COOKIE)?.value);
  return user?.role === "ADMIN" ? user : null;
});

/** Redirects to the admin login page unless an admin is signed in to the admin panel. */
export async function requireAdmin(next: string): Promise<SessionUser> {
  const user = await getAdminUser();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Creates a session row. Only a hash of the token is stored. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
}

/** Ends the session that a token belongs to. */
export async function endSessionToken(token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Creates a session row and sets the cookie for that login. Call only from a Server Action. */
export async function startSession(userId: string, area: SessionArea = "site"): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  (await cookies()).set(COOKIE[area], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the session row and cookie of that login only. Call only from a Server Action. */
export async function endSession(area: SessionArea = "site"): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE[area])?.value;
  if (token) await endSessionToken(token);
  store.delete(COOKIE[area]);
}

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => /^[6-9]\d{9}$/.test(p));
}
