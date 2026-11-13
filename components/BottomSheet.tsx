"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Bottom sheet — used for the paywall, the report/block flow and settings.
 *
 * Built on <dialog> so focus trapping, Escape and inertness of the background
 * come from the platform rather than hand-rolled key handling.
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

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Stops the page behind the sheet from scrolling on touch.
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself) dismisses.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-[390px] bg-transparent p-0 backdrop:bg-black/40",
        "min-[861px]:mx-auto min-[861px]:mb-0",
      )}
    >
      <div
        className={cn(
          "pb-safe scroll-contain max-h-[85dvh] overflow-y-auto bg-paper px-5 pt-3 pb-6",
          "[border-radius:24px_24px_0_0]",
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
