import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { APP_NAME, APP_TAGLINE, APP_MOTTO } from "@/lib/constants/app";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | ${APP_TAGLINE}`,
  description: APP_MOTTO,
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#090c12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased selection:bg-blue-900/40 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
