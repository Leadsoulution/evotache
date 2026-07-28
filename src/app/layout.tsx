import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/hooks/useAuth";
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
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("evotasks.theme");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Bump SEED_VERSION whenever seed data (users, tasks, teams, ...) changes
// shape or content in a way that's incompatible with previously-cached demo
// data (e.g. renaming/removing seed users). Runs synchronously before any
// service reads localStorage, so a stale cache never causes mismatched ids,
// missing users, or "changes don't show up" confusion — it just quietly
// reseeds. Keeps session/theme so this never signs anyone out.
const SEED_VERSION = "9";
const SEED_RESET_SCRIPT = `(function(){try{var v="${SEED_VERSION}";var k="evotasks.seedVersion";if(localStorage.getItem(k)!==v){var keys=Object.keys(localStorage);for(var i=0;i<keys.length;i++){var key=keys[i];if(key.indexOf("evotasks.")===0&&key!=="evotasks.session.v1"&&key!=="evotasks.theme"){localStorage.removeItem(key);}}localStorage.setItem(k,v);}}catch(e){}})();`;

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
        <ToastProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
