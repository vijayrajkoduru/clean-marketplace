"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeftRight } from "lucide-react";

/**
 * A before and after photo comparison. Drag (or use the arrow keys) to move the divider.
 * The first time it scrolls into view, the divider sweeps once to show that it moves.
 */
export function BeforeAfter({
  before,
  after,
  alt,
  width,
  height,
  labels,
}: {
  before: string;
  after: string;
  alt: string;
  width: number;
  height: number;
  labels: { before: string; after: string; compare: string };
}) {
  const [pos, setPos] = useState(50);
  const touched = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          if (touched.current) return;
          const p = Math.min(1, (now - start) / 1800);
          // 50 -> 72 -> 28 -> 50, eased.
          setPos(50 + 22 * Math.sin(p * Math.PI * 2) * (1 - p * 0.15));
          if (p < 1) frame = requestAnimationFrame(tick);
          else setPos(50);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={box}
      className="relative mx-auto select-none overflow-hidden rounded-[2rem] bg-surface shadow-xl shadow-brand-900/10"
      // Tall photos are capped at 78% of the screen height, keeping their shape.
      style={{ aspectRatio: `${width} / ${height}`, width: `min(100%, calc(78vh * ${width} / ${height}))` }}
    >
      <Image src={after} alt={`${alt}, after`} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt={`${alt}, before`} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
      </div>
      <span className="glass absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">{labels.before}</span>
      <span className="absolute right-4 top-4 rounded-full bg-brand-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">{labels.after}</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.35)]" style={{ left: `${pos}%` }} aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-700 shadow-xl ring-4 ring-white/40">
          <ArrowLeftRight className="size-5" />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(e) => {
          touched.current = true;
          setPos(Number(e.target.value));
        }}
        aria-label={labels.compare}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
