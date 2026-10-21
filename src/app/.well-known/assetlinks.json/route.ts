/**
 * Digital Asset Links: tells Android that the Play Store app may open this site full screen,
 * without a browser bar. Set ANDROID_APP_PACKAGE and ANDROID_CERT_SHA256 in .env.
 */
export function GET() {
  const pkg = process.env.ANDROID_APP_PACKAGE?.trim();
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  const body =
    pkg && fingerprints.length
      ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fingerprints } }]
      : [];
  return Response.json(body);
}
