import { cn } from "@/lib/cn";

/**
 * The two drifting blue/violet blurred circles behind every app screen.
 *
 * Blur radius is capped at 30px on purpose: large blur radii are the most
 * reliable way to tank frame rate on mid-range Android, and this sits behind
 * scrolling content (docs/ARCHITECTURE.md §12.3). Verify on a real budget
 * device, not an emulator.
 */
export function BgBlobs({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-50 overflow-hidden",
        className,
      )}
    >
      <div
        className="venn-blob-a absolute rounded-full bg-blue opacity-[0.09] blur-[30px] will-change-transform"
        style={{ width: 429, height: 429, left: -175, top: -156 }}
      />
      <div
        className="venn-blob-b absolute rounded-full bg-violet opacity-[0.09] blur-[30px] will-change-transform"
        style={{ width: 390, height: 390, right: -160, bottom: -140 }}
      />
    </div>
  );
}
