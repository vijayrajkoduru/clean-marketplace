"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { site } from "@/config/site";
import { strings, fmt } from "@/strings";

/** Floating "Chat with us" button that opens WhatsApp. Hidden until site.whatsappNumber is set. */
export function WhatsAppButton() {
  const pathname = usePathname();
  const t = strings.whatsapp;
  if (!site.whatsappNumber) return null;
  const text = encodeURIComponent(fmt(t.text, { name: site.name }));
  // Service pages have a cart bar at the bottom, so the button sits higher there.
  const raised = pathname.startsWith("/s/");
  return (
    <a
      href={`https://wa.me/${site.whatsappNumber}?text=${text}`}
      target="_blank"
      rel="noopener"
      aria-label={t.label}
      className={`fixed right-4 z-40 print:hidden inline-flex items-center gap-2 rounded-full bg-[#1f9d55] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-[#178a49] ${raised ? "bottom-24" : "bottom-5"}`}
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      <span className="hidden sm:inline">{t.short}</span>
    </a>
  );
}
