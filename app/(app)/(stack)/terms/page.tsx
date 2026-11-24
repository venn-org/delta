import Link from "next/link";
import { DocSection } from "@/components/DocSection";
import { SubpageHeader } from "@/components/SubpageHeader";

/**
 * /terms — Terms & conditions. Public: no sign-in needed.
 *
 * DRAFT. The bracketed values (company name, contact address, jurisdiction)
 * and the payment terms are placeholders awaiting legal review — see
 * docs/HANDOFF.md, "Placeholders to confirm".
 */
export default function TermsPage() {
  return (
    <div className="relative min-h-full bg-canvas">
      <SubpageHeader
        backHref="/profile"
        backLabel="Back to profile"
        title="Terms & conditions"
        subtitle="Draft · last updated 25 November 2026"
      />

      <div className="flex flex-col gap-3 px-gutter pt-2 pb-8">
        <DocSection title="1. Who we are">
          <p>
            Venn is operated by [Company name] (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;). By creating an account you agree to these terms.
          </p>
        </DocSection>

        <DocSection title="2. Who can use Venn">
          <ul>
            <li>You must be at least 18.</li>
            <li>One account per person, using your own name and details.</li>
            <li>You&apos;re responsible for keeping your sign-in secure.</li>
          </ul>
        </DocSection>

        <DocSection title="3. What Venn does, and doesn't">
          <p>
            We suggest people you might live well with, based on your answers.
            We don&apos;t own, list or rent out flats, aren&apos;t a party to
            any agreement you make with another user, and can&apos;t promise a
            match or a successful tenancy.
          </p>
          <p>
            We don&apos;t verify everyone. A verified badge means we checked
            what it says; it isn&apos;t a guarantee about the person.
          </p>
        </DocSection>

        <DocSection title="4. How you agree to behave">
          <ul>
            <li>Be honest in your profile and answers.</li>
            <li>No harassment, hate, threats or discrimination.</li>
            <li>No scams, spam, or asking for money outside a proper rental agreement.</li>
            <li>Don&apos;t collect or share other users&apos; details.</li>
          </ul>
          <p>We may suspend or remove accounts that break these rules.</p>
        </DocSection>

        <DocSection title="5. Payments">
          <p>
            Your top matches are free. Seeing everyone is a one-time payment of
            [₹99]. It isn&apos;t a subscription. [Refund policy to be
            confirmed.]
          </p>
        </DocSection>

        <DocSection title="6. Your content">
          <p>
            You own what you write. You let us show it to your matches and use
            it to run the service, as described in{" "}
            <Link href="/privacy" className="font-semibold text-blue no-underline">
              Privacy &amp; safety
            </Link>
            .
          </p>
        </DocSection>

        <DocSection title="7. Liability">
          <p>
            Venn is provided as is. To the extent the law allows, we aren&apos;t
            liable for what happens between users, including disputes over
            rent, deposits or conduct.
          </p>
        </DocSection>

        <DocSection title="8. Changes and contact">
          <p>
            We may update these terms and will tell you in the app when we do.
            These terms are governed by the laws of India; [jurisdiction].
            Questions: [support email].
          </p>
        </DocSection>
      </div>
    </div>
  );
}
