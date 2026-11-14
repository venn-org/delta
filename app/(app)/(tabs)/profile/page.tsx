import { BgBlobs } from "@/components/BgBlobs";
import { Avatar } from "@/components/Avatar";
import { ListRow } from "@/components/ListRow";
import { createClient } from "@/lib/supabase/server";
import { requireStage } from "@/server/auth";
import { signOutAction } from "./actions";

/**
 * /profile — the account screen. PLACEHOLDER, with one real control.
 *
 * Settings proper (edit answers, verification, notifications, delete account)
 * is a later phase. What is here now is the identity header, so the screen is
 * not a lie about who is signed in, and sign-out — which is real because
 * every other way out of a session is a devtools trip.
 *
 * Nothing private is read: display name and area only. Phone and email live
 * in `private_contacts` and never come to the client (§4.1).
 */
export const instant = false;

export default async function ProfilePage() {
  await requireStage("app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, occupation, role")
    .eq("id", user!.id)
    .single();

  const name = profile?.display_name?.trim() || "You";

  return (
    <div className="relative min-h-full bg-canvas">
      <BgBlobs />

      <div className="relative z-10 flex flex-col gap-5 px-gutter py-6">
        <header className="flex items-center gap-3.5">
          <Avatar name={name} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[24px] leading-tight font-bold tracking-[-0.03em] text-ink">
              {name}
            </h1>
            <p className="truncate text-[13.5px] text-slate">
              {profile?.occupation ??
                (profile?.role === "haver"
                  ? "Has a place"
                  : "Looking for a place")}
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
            {"// Account"}
          </p>

          {/*
            Not links yet. A row that navigates nowhere is a worse answer than
            a row that says it is coming, so these are inert on purpose —
            ListRow drops the chevron when it has no destination.
          */}
          <ListRow title="Edit your answers" subtitle="Coming next" />
          <ListRow title="Get verified" subtitle="Coming next" />
          <ListRow title="Notifications" subtitle="Coming next" />
        </section>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full cursor-pointer rounded-row bg-white px-4 py-3 text-left text-[15px] font-semibold text-danger"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
