/**
 * A same-site path to return to after login, or "/". Rejects absolute URLs,
 * protocol-relative "//host" and "/\host" (browsers treat "\" as "/"), and control characters.
 */
export function safeNext(raw: unknown): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return "/";
  return v.slice(0, 300);
}
