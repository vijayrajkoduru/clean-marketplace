"use server";

import { cookies, headers } from "next/headers";
import { REFERRAL_COOKIE } from "@/lib/wallet";
import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { clientIp, issueLoginCode, PHONE_RE } from "@/lib/otp";
import { signInWithCode } from "@/lib/login";
import { safeAdminNext, safeNext } from "@/lib/safe-next";

export type LoginState = {
  step: "phone" | "code";
  phone?: string;
  error?: string;
  devCode?: string;
  next?: string;
};


export async function requestCode(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "").replace(/\D/g, "").slice(-10);
  const next = safeNext(form.get("next"));
  if (!PHONE_RE.test(phone)) return { step: "phone", next, error: "Enter a 10-digit mobile number that starts with 6, 7, 8 or 9." };
  const r = await issueLoginCode(phone, clientIp(await headers()));
  if (!r.ok) return { step: "phone", phone, next, error: r.error };
  return { step: "code", phone, next, devCode: r.devCode };
}

export async function confirmCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const next = safeNext(form.get("next"));
  if (!PHONE_RE.test(phone)) return { step: "phone", next, error: "Enter your mobile number again." };
  const store = await cookies();
  const r = await signInWithCode(phone, code, store.get(REFERRAL_COOKIE)?.value);
  if (!r.ok) return { ...prev, step: "code", phone, next, error: r.error };
  store.delete(REFERRAL_COOKIE);
  await startSession(r.userId);
  redirect(next);
}

/** The admin panel login: the same SMS code, but only admin numbers get in, with the admin session. */
export async function confirmAdminCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const next = safeAdminNext(form.get("next"));
  if (!PHONE_RE.test(phone)) return { step: "phone", next, error: "Enter your mobile number again." };
  const r = await signInWithCode(phone, code);
  if (!r.ok) return { ...prev, step: "code", phone, next, error: r.error };
  if (r.role !== "ADMIN") return { ...prev, step: "code", phone, next, error: "This number is not an admin. Admin numbers are set in ADMIN_PHONES." };
  await startSession(r.userId, "admin");
  redirect(next);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

/** Signs out of the admin panel only. The website login in this browser stays as it is. */
export async function adminLogout(): Promise<void> {
  await endSession("admin");
  redirect("/admin/login");
}
