import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Private uploads (professionals' ID proofs and photos). They are stored outside the
 * public folder, in UPLOAD_DIR or ./storage/uploads, and only admins can open them.
 */
// turbopackIgnore keeps the build from tracing the whole project because of these runtime paths.
const DIR = resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads"));
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const KINDS = [
  { ext: "jpg", type: "image/jpeg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", type: "image/png", test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", type: "image/webp", test: (b: Buffer) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { ext: "pdf", type: "application/pdf", test: (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
] as const;

const NAME_RE = /^[a-z0-9]+-[a-z]+-[a-f0-9]{16}\.(jpg|png|webp|pdf)$/;

export type SaveResult = { ok: true; name: string } | { ok: false; error: string };

/**
 * The uploaded file in a form field, or null when the field is empty. Checks the shape
 * rather than `instanceof File`, because the server's form parser can use its own File class.
 */
export function uploadedFile(v: FormDataEntryValue | null): File | null {
  if (!v || typeof v === "string") return null;
  const f = v as File;
  return typeof f.arrayBuffer === "function" && typeof f.size === "number" && f.size > 0 ? f : null;
}

/** Checks the file by its content (not its name) and saves it under a random name. */
export async function saveUpload(file: File, prefix: string): Promise<SaveResult> {
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Files must be 5 MB or smaller." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = KINDS.find((k) => k.test(buf));
  if (!kind) return { ok: false, error: "Upload a JPG, PNG or WEBP photo, or a PDF." };
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const name = `${safePrefix}-${randomBytes(8).toString("hex")}.${kind.ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(join(/* turbopackIgnore: true */ DIR, name), buf, { flag: "wx" });
  return { ok: true, name };
}

/** Reads a stored upload. Only names this module created are accepted. */
export async function readUpload(name: string): Promise<{ data: Buffer; type: string } | null> {
  if (!NAME_RE.test(name)) return null;
  try {
    const data = await readFile(join(/* turbopackIgnore: true */ DIR, name));
    const ext = name.split(".").pop();
    return { data, type: KINDS.find((k) => k.ext === ext)?.type ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function removeUpload(name: string | null | undefined): Promise<void> {
  if (name && NAME_RE.test(name)) await unlink(join(/* turbopackIgnore: true */ DIR, name)).catch(() => {});
}
