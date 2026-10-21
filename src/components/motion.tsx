"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals elements marked with data-reveal as they scroll into view, by setting data-shown
 * (the styles are in globals.css). Also picks up elements added later, such as streamed
 * content and pages opened with client navigation. Rendered once, in the root layout.
 *
 * Give every data-reveal element suppressHydrationWarning: streamed content can scroll into
 * view, and get data-shown, before React hydrates it, which React would otherwise report as
 * a mismatch.
 */
export function RevealObserver() {
  useEffect(() => {
    const show = (el: Element) => el.setAttribute("data-shown", "");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          show(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const watch = (root: ParentNode) => root.querySelectorAll("[data-reveal]:not([data-shown])").forEach((el) => io.observe(el));
    watch(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-reveal]:not([data-shown])")) io.observe(n);
          watch(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

/** Cycles through words with a soft blur-in, for the hero headline. The first word is server rendered. */
export function RotatingWords({ words, interval = 2400, className = "" }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className={`inline-grid ${className}`} aria-live="off">
      {/* The longest word keeps the width steady while the words change. */}
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">
        {words.reduce((a, b) => (b.length > a.length ? b : a), "")}
      </span>
      <span key={i} className="col-start-1 row-start-1 animate-word-in">
        {words[i]}
      </span>
    </span>
  );
}

/** Counts up to a number when it scrolls into view. Shows the real number without JavaScript. */
export function CountUp({ value, suffix = "", duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
