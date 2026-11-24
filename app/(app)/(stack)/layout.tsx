/**
 * The shell for screens pushed on top of a tab: match detail, the profile
 * sub-pages, Privacy & safety and Terms.
 *
 * A route group, so it adds no path segment. It exists for the same reason
 * the (tabs) layout does: the column has to own the scroll. Inside the
 * desktop PhoneFrame the screen is a fixed-height box with overflow hidden,
 * so a page that relies on the document scrolling is simply cut off at the
 * bezel. `screen-h` sizes this to the viewport on a phone and to the frame
 * above 861px, and the inner div scrolls — which is also what a `sticky`
 * action bar (match detail) pins itself against.
 *
 * No TabBar: these screens carry their own back button.
 */
export default function StackLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="screen-h flex flex-col">
      <div className="scroll-contain min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
