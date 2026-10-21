"use client";

import { useEffect } from "react";
import { markAllRead } from "@/app/actions/notifications";
import type { SessionArea } from "@/lib/auth";

/** Marks the notifications as read a moment after the page is shown, so the header count clears. */
export function MarkRead({ area }: { area: SessionArea }) {
  useEffect(() => {
    const t = setTimeout(() => void markAllRead(area), 1500);
    return () => clearTimeout(t);
  }, [area]);
  return null;
}
