import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

/**
 * Photos for the public "Our work" gallery. They live next to the private uploads, in a
 * separate "work" folder, and are served by /media/work/[name]. The private ID proofs are
 * never reachable through that route.
 *
 * Every photo is re-encoded on upload: turned the right way up, shrunk to at most 2000 px and
 * saved as JPEG without metadata, so the GPS location and camera details a phone stores in a
 * photo (for example, of a customer's home) are not published.
 */
// turbopackIgnore keeps the build from tracing the whole project because of these runtime paths.
const DIR = resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads"), "work");
export const MAX_WORK_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 2000;
const NAME_RE = /^work-[a-f0-9]{16}\.jpg$/;

export type WorkPhoto = { name: string; width: number; height: number };

export async function saveWorkPhoto(file: File): Promise<{ ok: true; photo: WorkPhoto } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "The photo is empty." };
  if (file.size > MAX_WORK_PHOTO_BYTES) return { ok: false, error: "Photos must be 8 MB or smaller." };
  const input = Buffer.from(await file.arrayBuffer());
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    format = undefined;
  }
  if (format !== "jpeg" && format !== "png" && format !== "webp") {
    return { ok: false, error: "Upload a JPG, PNG or WEBP photo. For iPhone photos, choose JPG (Most Compatible) in the camera settings." };
  }
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const name = `work-${randomBytes(8).toString("hex")}.jpg`;
  await mkdir(DIR, { recursive: true });
  await writeFile(join(/* turbopackIgnore: true */ DIR, name), data, { flag: "wx" });
  return { ok: true, photo: { name, width: info.width, height: info.height } };
}

export async function readWorkPhoto(name: string): Promise<Buffer | null> {
  if (!NAME_RE.test(name)) return null;
  try {
    return await readFile(join(/* turbopackIgnore: true */ DIR, name));
  } catch {
    return null;
  }
}

export async function removeWorkPhoto(name: string | null | undefined): Promise<void> {
  if (name && NAME_RE.test(name)) await unlink(join(/* turbopackIgnore: true */ DIR, name)).catch(() => {});
}

/** The public address of a stored work photo. */
export function workPhotoUrl(name: string): string {
  return `/media/work/${name}`;
}
