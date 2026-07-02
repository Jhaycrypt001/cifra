"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GLYPHS = "0123456789ABCDEF•$".split("");

/**
 * Renders `value` as if it were decrypting: characters scramble through random
 * ciphertext glyphs and resolve left-to-right. Loops when `loop` is set.
 */
export function CipherText({
  value,
  className,
  durationMs = 1200,
  loop = false,
  loopDelayMs = 2200,
}: {
  value: string;
  className?: string;
  durationMs?: number;
  loop?: boolean;
  loopDelayMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number>();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let start: number | null = null;

    const run = () => {
      start = null;
      const target = value;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / durationMs, 1);
        const settled = Math.floor(p * target.length);
        let out = "";
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          if (ch === " " || ch === "," || ch === ".") out += ch;
          else if (i < settled) out += ch;
          else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setDisplay(out);
        if (p < 1) {
          frame.current = requestAnimationFrame(step);
        } else {
          setDisplay(target);
          if (loop) timer.current = setTimeout(run, loopDelayMs);
        }
      };
      frame.current = requestAnimationFrame(step);
    };

    run();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, durationMs, loop, loopDelayMs]);

  return <span className={cn("num tabular-nums", className)}>{display}</span>;
}
