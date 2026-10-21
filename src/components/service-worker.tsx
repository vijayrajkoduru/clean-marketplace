"use client";

import { useEffect } from "react";

/** Registers public/sw.js in production, so the installed app shows an offline screen instead of an error. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
