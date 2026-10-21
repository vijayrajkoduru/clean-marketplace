import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Professionals upload an ID proof and a photo (5 MB each) when they apply, and admins upload
    // "Our work" photos with an optional before photo (8 MB each).
    serverActions: { bodySizeLimit: "17mb" },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
