import { NextResponse, connection, type NextRequest } from "next/server";
import { notFound } from "next/navigation";
import {
  devLoginEnabled,
  devSignOut,
  signInAsDevUser,
  type DevState,
} from "@/server/auth/dev";

/**
 * ⚠️ DEV-ONLY — /dev/login
 *
 *   /dev/login                  sign in, onboarding finished → the app
 *   /dev/login?state=onboarding sign in, nothing claimed     → the chat
 *   /dev/login?out=1            sign out again
 *
 * 404s unless NODE_ENV is not production AND ENABLE_DEV_LOGIN=true. notFound()
 * rather than a 403: a route that denies you is a route you know is there.
 *
 * Outside the (app) route group because it renders nothing — it sets cookies
 * and redirects, which is a route handler's job and not a page's.
 */
export async function GET(request: NextRequest) {
  // Without this the handler prerenders at build time, baking in whichever
  // answer devLoginEnabled() gave then — including a permanent 404. The
  // check has to run per request, against the running environment.
  await connection();

  if (!devLoginEnabled()) notFound();

  const url = new URL(request.url);

  if (url.searchParams.get("out") === "1") {
    await devSignOut();
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const state: DevState =
    url.searchParams.get("state") === "onboarding" ? "onboarding" : "active";

  const result = await signInAsDevUser(state);
  if (!result.ok) {
    return NextResponse.json(
      { error: "dev login failed", detail: result.error },
      { status: 500 },
    );
  }

  // Straight to "/", which resolves the stage and puts them wherever this
  // state actually belongs — so the dev login exercises the real routing
  // cycle rather than side-stepping it.
  return NextResponse.redirect(new URL("/", url.origin));
}
