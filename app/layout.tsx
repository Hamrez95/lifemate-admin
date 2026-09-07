import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaRegistrar } from "@/src/components/pwa/PwaRegistrar";
import { AppearanceBootstrap, AppearanceProvider } from "@/src/components/ui/AppearanceProvider";
import { DirectionBootstrap, DirectionProvider } from "@/src/components/ui/DirectionProvider";

import "./globals.css";
import "./design-system.css";
import "./admin-auth.css";
import "./admin-auth-enhanced.css";
import "./admin-auth-founder.css";
import "./pwa.css";

export const metadata: Metadata = {
  applicationName: "LifeMate Command Center",
  title: {
    default: "LifeMate Command Center",
    template: "%s | LifeMate Command Center",
  },
  description: "Internal management command center for the LifeMate ecosystem.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-icon/192", type: "image/png", sizes: "192x192" },
      { url: "/pwa-icon/512", type: "image/png", sizes: "512x512" },
    ],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#12343a",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AppearanceBootstrap />
        <DirectionBootstrap />
        <DirectionProvider>
          <AppearanceProvider>
            {children}
            <PwaRegistrar />
          </AppearanceProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
