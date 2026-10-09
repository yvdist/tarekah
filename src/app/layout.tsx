import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face. SOFT is what makes it warm; opsz keeps large sizes crisp.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const DESCRIPTION =
  "Catat ke mana saja kamu melamar, kapan harus follow-up, dan sudah sejauh mana jalanmu. Tenang, rapi, dan tanpa menghakimi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Tarékah", template: "%s · Tarékah" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Tarékah",
    title: "Tarékah: setiap lamaran adalah satu léngkah",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

// Kertas, in each theme: the browser chrome around the page on a phone.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#14131f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      lang="id"
      // Tells Next.js the smooth scrolling in globals.css is for in-page
      // links, so it is switched off during route changes.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
