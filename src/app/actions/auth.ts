"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminPhones, endSession, startSession } from "@/lib/auth";
import { issueLoginCode, PHONE_RE, verifyLoginCode } from "@/lib/otp";
import { safeNext } from "@/lib/safe-next";

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
  const h = await headers();
  // Behind nginx, the last X-Forwarded-For entry is the address nginx saw; earlier ones can be forged.
  const ip = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ?? h.get("x-real-ip") ?? "unknown";
  const r = await issueLoginCode(phone, ip);
  if (!r.ok) return { step: "phone", phone, next, error: r.error };
  return { step: "code", phone, next, devCode: r.devCode };
}

export async function confirmCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const next = safeNext(form.get("next"));
  if (!PHONE_RE.test(phone)) return { step: "phone", next, error: "Enter your mobile number again." };
  if (code.length !== 6) return { ...prev, step: "code", phone, next, error: "Enter the 6-digit code from the SMS." };
  const r = await verifyLoginCode(phone, code);
  if (!r.ok) return { ...prev, step: "code", phone, next, error: r.error };

  const makeAdmin = adminPhones().includes(phone);
  const user = await db.user.upsert({
    where: { phone },
    update: makeAdmin ? { role: "ADMIN" } : {},
    create: { phone, role: makeAdmin ? "ADMIN" : "CUSTOMER" },
  });
  await startSession(user.id);
  redirect(next);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
