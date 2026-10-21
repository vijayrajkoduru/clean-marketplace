/**
 * A same-site path to return to after login, or "/". Rejects absolute URLs,
 * protocol-relative "//host" and "/\host" (browsers treat "\" as "/"), and control characters.
 */
export function safeNext(raw: unknown): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return "/";
  return v.slice(0, 300);
}

/** A path inside the admin panel to return to after the admin login, or "/admin". */
export function safeAdminNext(raw: unknown): string {
  const v = safeNext(raw);
  return /^\/admin(\/|\?|$)/.test(v) && !v.startsWith("/admin/login") ? v : "/admin";
}
