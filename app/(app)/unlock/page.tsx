import { BgBlobs } from "@/components/BgBlobs";
import { ButtonLink } from "@/components/Button";
import { requireStage } from "@/server/auth";

/**
 * /unlock — the paywall. PLACEHOLDER.
 *
 * Razorpay checkout is phase 5. The screen exists now because every locked
 * match card links here, and the alternative was a 404 on the one tap the
 * whole free tier is designed to produce.
 *
 * Outside the (tabs) group deliberately: checkout shows no TabBar.
 */
export const instant = false;

export default async function UnlockPage() {
  await requireStage("app");

  return (
    <div className="screen-h relative flex flex-col justify-center px-7 py-12">
      <BgBlobs />

      <div className="relative z-10">
        <p className="font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          {"// Unlock everyone"}
        </p>
        <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          One-time ₹99.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          Every match, their reasons and the chance to message them — paid once,
          not monthly. Payment itself is the next thing being built.
        </p>

        <ButtonLink href="/matches" variant="ghost" className="mt-7">
          Back to matches
        </ButtonLink>
      </div>
    </div>
  );
}
