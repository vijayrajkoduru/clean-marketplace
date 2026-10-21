import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { site } from "@/config/site";
import { ServiceWorker } from "@/components/service-worker";
import { RevealObserver } from "@/components/motion";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: "website", siteName: site.name, title: `${site.name}: ${site.tagline}`, description: site.description, locale: "en_IN" },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0b685a" };

/** Adds js-motion before the first paint, so reveal animations start hidden only when JavaScript runs. */
const MOTION_SCRIPT = "document.documentElement.classList.add('js-motion')";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The script above changes the html class, hence suppressHydrationWarning.
    <html lang="en-IN" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
        <RevealObserver />
      </body>
    </html>
  );
}
