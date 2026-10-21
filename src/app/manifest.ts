import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** Lets phones install the site as an app from the browser menu (Add to Home screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}: ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b685a",
    categories: ["lifestyle", "shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My bookings", url: "/bookings" },
      { name: "All services", url: "/services" },
    ],
  };
}
