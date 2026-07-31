import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EVOTASKS — Tasks",
  description: "A ClickUp-style task list built with Next.js, TypeScript, and Tailwind CSS.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EvoTasks",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e2231a",
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("evotasks.theme");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Bump SEED_VERSION whenever seed data (users, tasks, teams, ...) changes
// shape or content in a way that's incompatible with previously-cached demo
// data (e.g. renaming/removing seed users). Runs synchronously before any
// service reads localStorage, so a stale cache never causes mismatched ids,
// missing users, or "changes don't show up" confusion — it just quietly
// reseeds. Keeps session/theme so this never signs anyone out.
const SEED_VERSION = "11";
const SEED_RESET_SCRIPT = `(function(){try{var v="${SEED_VERSION}";var k="evotasks.seedVersion";if(localStorage.getItem(k)!==v){var keys=Object.keys(localStorage);for(var i=0;i<keys.length;i++){var key=keys[i];if(key.indexOf("evotasks.")===0&&key!=="evotasks.session.v1"&&key!=="evotasks.theme"&&key!=="evotasks.locale"){localStorage.removeItem(key);}}localStorage.setItem(k,v);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SEED_RESET_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Shared request cache: every hook that reads the same SWR key (users,
            tasks, teams, ...) reuses one in-flight fetch and one cached
            result, instead of each component instance fetching independently
            — this is what collapses dozens of duplicate API calls per page
            load down to one per resource. revalidateIfStale: false is the
            important one — without it, SWR still re-fetches on every new
            mount of a key (just deduped within dedupingInterval), which
            isn't enough when mounts are staggered by data-dependent
            rendering. Hooks that need fresh data opt in per-call via
            `refreshInterval` (chat, badge counts) instead. */}
        <SWRConfig
          value={{ revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false, dedupingInterval: 60000 }}
        >
          <ToastProvider>
            <AuthProvider>
              <LanguageProvider>
                <AppShell>{children}</AppShell>
              </LanguageProvider>
            </AuthProvider>
          </ToastProvider>
        </SWRConfig>
      </body>
    </html>
  );
}
