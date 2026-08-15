import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ToasterProvider from "@/components/system/toaster-provider";
import { prisma } from "@/lib/prisma";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const DEFAULT_TITLE = "SKYNOVA CRM";
const DEFAULT_DESCRIPTION = "SKYNOVA CRM";

// العنوان والوصف والأيقونة تُقرأ من الإعدادات العامة (قابلة للتعديل من /dashboard/settings)
export async function generateMetadata(): Promise<Metadata> {
  let siteTitle: string | null = null;
  let siteDescription: string | null = null;
  let favicon: string | null = null;

  try {
    const settings = await prisma.generalSetting.findFirst({
      orderBy: { id: "asc" },
      select: { siteTitle: true, siteDescription: true, favicon: true },
    });
    siteTitle = settings?.siteTitle?.trim() || null;
    siteDescription = settings?.siteDescription?.trim() || null;
    favicon = settings?.favicon?.trim() || null;
  } catch (error) {
    console.error("generateMetadata settings error:", error);
  }

  const title = siteTitle || DEFAULT_TITLE;

  return {
    title,
    description: siteDescription || DEFAULT_DESCRIPTION,
    manifest: "/manifest.webmanifest",
    icons: favicon
      ? {
          icon: [{ url: favicon }],
          apple: [{ url: favicon }],
          shortcut: [{ url: favicon }],
        }
      : {
          icon: [
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
          ],
          apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
        },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
          <AuthProvider>
          <ToasterProvider />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
