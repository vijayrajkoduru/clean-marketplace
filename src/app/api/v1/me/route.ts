import { z } from "zod";
import { ok, preflight, readBody, result, withUser } from "@/lib/api";
import { accountView } from "@/lib/app-views";
import { deleteAccount, saveProfile } from "@/lib/profile";

export const OPTIONS = preflight;

/** The signed-in user's account: profile, Plus, credit, referral link and professional status. */
export async function GET(request: Request) {
  return withUser(request, async (user) => ok(await accountView(user)));
}

/** Updates the name and email. */
export async function PATCH(request: Request) {
  return withUser(request, async (user) => {
    const body = await readBody(request, z.object({ name: z.string(), email: z.string().default("") }));
    if ("response" in body) return body.response;
    return result(await saveProfile(user, body.data));
  });
}

/** Deletes the account (see deleteAccount). The app's token stops working at once. */
export async function DELETE(request: Request) {
  return withUser(request, async (user) => result(await deleteAccount(user)));
}
