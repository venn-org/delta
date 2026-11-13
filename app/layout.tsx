import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

// Display — headlines, the venn wordmark. Always paired with -0.03em tracking.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// UI — every piece of interface and chat text.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Mono — uppercase eyebrows and step labels at 11px / 0.12em.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Venn — find a flatmate who lives like you",
  description:
    "Answer ten questions about how you live. Venn finds people who live the same way.",
  applicationName: "Venn",
  appleWebApp: {
    capable: true,
    title: "Venn",
    statusBarStyle: "default",
  },
};

// viewport-fit=cover is what makes env(safe-area-inset-*) resolve to real
// values on notched devices. Without it the TabBar sits under the home
// indicator. User scaling stays enabled — disabling it is an accessibility
// failure, and the 16px input rule already prevents focus-zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#335CFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${hanken.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
