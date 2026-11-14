// =============================================================================
// layout.tsx: the ROOT layout that wraps every page in the app
// =============================================================================
//
// In the App Router, `app/layout.tsx` is required. It renders the <html> and
// <body> tags, and `children` is whichever page is currently being shown.
// Anything placed here (fonts, global CSS, providers) applies to ALL pages.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import StoreProvider from "@/store/StoreProvider";
import "./globals.css";

// next/font downloads the fonts at build time and serves them from our own
// domain (faster, no request to Google at runtime). `variable` exposes each
// font as a CSS variable that Tailwind uses in globals.css.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `metadata` becomes the <title> and <meta name="description"> tags.
export const metadata: Metadata = {
  title: "Employee Management System",
  description: "Manage employees, departments and leave.",
};

// `LayoutProps<"/">` is a type Next.js generates for this route; it types
// `children` for us.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The nav bar is rendered by app/(app)/layout.tsx, only for
            logged-in pages, so the login page shows no navigation. */}
        {/* StoreProvider makes the Redux store available to every page and
            component below it. It wraps `children` here so all routes share
            the same store while the user navigates around the app.

            Why <Suspense>? This project has `cacheComponents: true` in
            next.config.ts, so Next.js tries to prerender pages at BUILD time.
            Creating a Redux store calls Math.random() internally (Redux uses
            random IDs), and Next.js refuses to bake a random value into
            static HTML. The Suspense boundary tells Next.js: "render this
            part on each request instead". The fallback (here: nothing) is
            what the static shell shows until the real content streams in. */}
        <Suspense fallback={null}>
          <StoreProvider>{children}</StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
