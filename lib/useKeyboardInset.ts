"use client";

import { useEffect, useState } from "react";

/**
 * Height in px currently covered by the on-screen keyboard.
 *
 * iOS Safari does not resize the layout viewport when the keyboard opens, so
 * `window.innerHeight` is unchanged and a `position: fixed` composer ends up
 * underneath the keyboard. The visualViewport API is the only reliable
 * source of truth (docs/ARCHITECTURE.md §12.3).
 *
 * Returns 0 where visualViewport is unsupported, where the keyboard is closed,
 * and during SSR — so callers can apply the value unconditionally.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // What the layout viewport has that the visual viewport cannot show.
      const covered = window.innerHeight - (vv.height + vv.offsetTop);
      // Small values are address-bar jitter, not a keyboard.
      setInset(covered > 80 ? Math.round(covered) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
