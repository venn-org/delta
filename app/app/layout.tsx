import { PhoneFrame } from "@/components/PhoneFrame";

/**
 * Every /app route renders inside the phone shell: full-bleed up to 860px,
 * bezelled above it. The TabBar is NOT here — it is added per-route, since it
 * must not appear during onboarding, finding or checkout.
 */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
