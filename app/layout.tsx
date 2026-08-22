import type { Metadata, Viewport } from "next";
import { Playfair_Display, Lora } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: BRAND.metadata.menuTitle,
  description: BRAND.metadata.menuDescription,
  formatDetection: { telephone: false, date: false, address: false, email: false },
  applicationName: BRAND.metadata.appName,
  appleWebApp: {
    capable: true,
    title: BRAND.metadata.appName,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.palette.deep,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${playfair.variable} ${lora.variable}`}>{children}</body>
    </html>
  );
}
