"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const EXIT_MS = 300;

/**
 * Bottom sheet — used for the paywall, the report/block flow and settings.
 *
 * Built on <dialog> so focus trapping, Escape and inertness of the background
 * come from the platform rather than hand-rolled key handling.
 *
 * Motion: `showModal()` and `close()` are both instant, so the panel is
 * animated by toggling `data-open` a frame AFTER the dialog enters the top
 * layer, and the real `close()` is deferred until the exit transition has
 * finished. A timeout backs up `transitionend`, because under
 * prefers-reduced-motion transitions are disabled globally and that event
 * would never arrive — leaving the sheet stuck open.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    let raf: number;
    let timer: ReturnType<typeof setTimeout>;

    if (open) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
      // Next frame: the dialog is now in the top layer with its closed
      // styles applied, so flipping the attribute produces a transition
      // rather than an instant jump.
      raf = requestAnimationFrame(() => setShown(true));
    } else if (dialog.open) {
      setShown(false);

      // Captured now: by cleanup time the ref may point elsewhere.
      const panel = panelRef.current;

      const finish = () => {
        if (dialog.open) dialog.close();
        document.body.style.overflow = "";
      };

      const onEnd = (e: TransitionEvent) => {
        if (e.target === panel && e.propertyName === "transform") finish();
      };

      panel?.addEventListener("transitionend", onEnd);
      timer = setTimeout(finish, EXIT_MS + 60);

      return () => {
        panel?.removeEventListener("transitionend", onEnd);
        clearTimeout(timer);
      };
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open]);

  // Release the scroll lock if the sheet unmounts mid-animation.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      data-open={shown ? "" : undefined}
      onCancel={(e) => {
        // Escape: let our exit animation run instead of the instant close.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="venn-sheet m-0 mt-auto w-full max-w-[390px] bg-transparent p-0 min-[861px]:mx-auto min-[861px]:mb-0"
    >
      <div
        ref={panelRef}
        className={cn(
          "pb-safe scroll-contain max-h-[85dvh] overflow-y-auto bg-paper px-5 pt-3 pb-6",
          "[border-radius:24px_24px_0_0]",
          "transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          // Mutually exclusive: both on the element at once would leave the
          // winner to stylesheet order rather than to this condition.
          shown ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-9 rounded-pill bg-mist"
        />
        {title && (
          <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.03em] text-ink">
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  );
}
