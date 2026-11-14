import { PhoneFrame } from "@/components/PhoneFrame";

/**
 * Every app screen renders inside the phone shell: full-bleed up to 860px,
 * bezelled above it.
 *
 * This is a route group, so it adds no path segment — the screens live at `/`,
 * `/onboarding`, `/signin` and so on. The group exists only to draw the line
 * between the app proper and the pages that must not be framed: `/kit`, the
 * component gallery, and the root `not-found`.
 *
 * The TabBar is NOT here. It is added per-route, since it must not appear
 * during onboarding, finding or checkout.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
