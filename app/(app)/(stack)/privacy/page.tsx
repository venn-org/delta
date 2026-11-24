import { DocSection } from "@/components/DocSection";
import { SubpageHeader } from "@/components/SubpageHeader";

/**
 * /privacy — Privacy & safety. Public: no sign-in needed, so it can be linked
 * from anywhere.
 *
 * Every claim here describes a rule the server enforces today
 * (docs/ARCHITECTURE.md §6). Anything not built yet is described as coming,
 * not as done — a privacy page that overstates is worse than a short one.
 */
export default function PrivacyPage() {
  return (
    <div className="relative min-h-full bg-canvas">
      <SubpageHeader
        backHref="/profile"
        backLabel="Back to profile"
        title="Privacy & safety"
        subtitle="What people can see about you, and how to stay safe meeting a flatmate."
      />

      <div className="flex flex-col gap-3 px-gutter pt-2 pb-8">
        <DocSection title="What your matches see">
          <p>
            Your name, age, work, area, your ideal Sunday and how your
            answers compare with theirs.
          </p>
          <p>
            People who haven&apos;t unlocked you see only your match %, one
            reason you match and your area. Your name is never sent to their
            phone, so it can&apos;t be uncovered by inspecting the page.
          </p>
        </DocSection>

        <DocSection title="What nobody sees">
          <ul>
            <li>
              <strong>Your phone number and email.</strong> They stay on our
              servers and are never shown to other users.
            </li>
            <li>
              <strong>Your exact address.</strong> We only show the
              neighbourhood.
            </li>
          </ul>
        </DocSection>

        <DocSection title="Who can message you">
          <p>
            Only someone you&apos;ve both said hi to. A chat opens after a
            mutual yes, never before.
          </p>
        </DocSection>

        <DocSection title="Your controls">
          <ul>
            <li>Change your profile and any answer from the Profile tab.</li>
            <li>
              Blocking, reporting, pausing your profile and deleting your
              account are on the way.
            </li>
          </ul>
        </DocSection>

        <DocSection title="Meeting safely">
          <ul>
            <li>Chat in the app first, and meet somewhere public.</li>
            <li>Visit the flat in daylight, and tell a friend where you&apos;re going.</li>
            <li>
              Never pay a deposit or token amount before you&apos;ve seen the
              flat and signed an agreement.
            </li>
            <li>We will never ask you for a sign-in code. Don&apos;t share one with anyone.</li>
            <li>If something feels off, it probably is. You can walk away.</li>
          </ul>
        </DocSection>
      </div>
    </div>
  );
}
