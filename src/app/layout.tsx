import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { NetworkStatusToast } from "@/components/pwa/network-status-toast";
import { Toaster } from "@/components/ui/sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteConfig.locale}
      className={`${plusJakartaSans.variable} ${syne.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <SerwistProvider swUrl="/serwist/sw.js">
          <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
            <main className="flex flex-1 flex-col">{children}</main>
            <InstallPrompt />
            <NetworkStatusToast />
            <Toaster />
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
