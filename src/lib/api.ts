import "server-only";
import type { z } from "zod";
import { userForToken, type SessionUser } from "./auth";

/**
 * Helpers for the mobile app API under /api/v1. The app signs in with a bearer token
 * (Authorization: Bearer <token>) instead of the website's session cookie.
 */

/** Any origin may call the API: it uses bearer tokens, never cookies. */
export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { ...CORS_HEADERS, "cache-control": "no-store" } });
}

export function fail(error: string, status = 400): Response {
  return ok({ error }, status);
}

export function bearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

/** The signed-in app user, or null. */
export function apiUser(request: Request): Promise<SessionUser | null> {
  return userForToken(bearerToken(request));
}

/** Runs a handler for a signed-in user, or answers 401. */
export async function withUser(request: Request, handler: (user: SessionUser) => Promise<Response>): Promise<Response> {
  const user = await apiUser(request);
  if (!user) return fail("Please log in again.", 401);
  return handler(user);
}

/** The JSON body checked against a schema, or a 400 answer with the first problem. */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: fail("The request body must be JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { response: fail(parsed.error.issues[0]?.message ?? "Check the details.") };
  return { data: parsed.data };
}

/** A shared-logic result as an API answer. */
export function result(r: { ok: true } | { ok: false; error: string }, data: Record<string, unknown> = {}): Response {
  return r.ok ? ok({ ok: true, ...data }) : fail(r.error);
}

/** Answers the browser's CORS check. Each route exports it as OPTIONS. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
