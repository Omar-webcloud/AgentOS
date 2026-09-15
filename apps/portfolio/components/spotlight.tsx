"use client";

import { useEffect } from "react";

/**
 * The reference site lights up the area around the cursor ("follows your
 * cursor"). We track the pointer and expose it as CSS custom properties that
 * `.spotlight` in globals.css consumes.
 */
export function Spotlight() {
  useEffect(() => {
    let frame = 0;

    function onMove(event: PointerEvent) {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const root = document.documentElement;
        root.style.setProperty("--spot-x", `${event.clientX}px`);
        root.style.setProperty("--spot-y", `${event.clientY}px`);
      });
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div aria-hidden className="spotlight pointer-events-none fixed inset-0 z-0" />;
}
