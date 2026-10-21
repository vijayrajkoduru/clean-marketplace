import "server-only";
import { io } from "next/cache";
import { db } from "./db";

/** The user's active Plus membership, or null. */
export async function activePlus(userId: string) {
  await io();
  return db.membership.findFirst({
    where: { userId, status: "ACTIVE", endsAt: { gt: new Date() } },
    orderBy: { endsAt: "desc" },
  });
}
