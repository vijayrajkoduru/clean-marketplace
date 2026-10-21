"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { uploadedFile } from "@/lib/uploads";
import * as work from "@/lib/partner-work";
import type { Result } from "@/lib/partner-work";

export type ApplyState = { ok?: boolean; error?: string };

export async function applyAsPartner(_: ApplyState, form: FormData): Promise<ApplyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in with your mobile number first." };
  const r = await work.applyAsPartner(user, {
    name: String(form.get("name") ?? ""),
    cityId: String(form.get("cityId") ?? ""),
    skills: form.getAll("skills").map(String),
    experienceYears: String(form.get("experienceYears") ?? ""),
    idProofType: String(form.get("idProofType") ?? "") as work.Application["idProofType"],
    idProofLast4: String(form.get("idProofLast4") ?? ""),
    bio: String(form.get("bio") ?? "") || undefined,
    idDoc: uploadedFile(form.get("idDoc")),
    photo: uploadedFile(form.get("photo")),
  });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: true };
}

const inactive: Result = { ok: false, error: "Your partner account is not active." };

async function run(job: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<Result>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return inactive;
  const r = await job(user);
  if (r.ok) refresh();
  return r;
}

export async function acceptJob(code: string): Promise<Result> {
  return run((user) => work.acceptJob(user, code));
}

export async function markOnTheWay(code: string): Promise<Result> {
  return run((user) => work.markOnTheWay(user, code));
}

export async function startJob(code: string, startCode: string): Promise<Result> {
  return run((user) => work.startJob(user, code, startCode));
}

export async function completeJob(code: string): Promise<Result> {
  return run((user) => work.completeJob(user, code));
}
