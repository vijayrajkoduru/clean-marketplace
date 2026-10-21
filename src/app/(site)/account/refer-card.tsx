"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { strings } from "@/strings";

export function ReferLink({ url, text }: { url: string; text: string }) {
  const t = strings.account;
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input readOnly value={url} className="input bg-surface font-mono text-xs" aria-label={t.referLink} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn-outline shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy className="size-4" aria-hidden="true" /> {copied ? t.copied : t.copy}
        </button>
      </div>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener" className="btn mt-3 bg-[#1f9d55] text-white hover:bg-[#178a49]">
        <MessageCircle className="size-4" aria-hidden="true" /> {t.shareWhatsapp}
      </a>
    </div>
  );
}
