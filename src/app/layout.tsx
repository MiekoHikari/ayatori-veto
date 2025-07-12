import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/theme-provider";
import { TopNavigation } from "~/components/top-navigation";
import { AuthProvider } from "~/components/auth-provider";
import { Toaster } from "~/components/ui/sonner";

import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "Strinova Map Veto",
  description: "Map Veto for Competitive Strinova Gaming (Developed by @Sn0_y in Discord)",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange>
          <AuthProvider>
            <TRPCReactProvider>
              <Analytics />
              <SpeedInsights />
              <TopNavigation />
              <main className="min-h-screen bg-background">
                {children}
              </main>
              <Toaster />
            </TRPCReactProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
