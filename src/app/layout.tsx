import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import ViewerSwitcher from "@/components/ViewerSwitcher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jamboree: where musicians find each other",
  description: "Find a jam tonight, or open your door to one. Any genre, wherever, whenever.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight">Jamboree</span>
              <span className="hidden text-sm text-stone-500 sm:inline">Where musicians find each other.</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-4">
              <Link href="/" className="text-sm font-medium hover:underline">
                This week
              </Link>
              <Link href="/post" className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600">
                Post a jam
              </Link>
              <Suspense fallback={<span className="text-sm text-stone-400">Loading…</span>}>
                <ViewerSwitcher />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
          Prototype with demo data. Everything resets when the server restarts.
        </footer>
      </body>
    </html>
  );
}
