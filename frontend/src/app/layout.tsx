import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/Cart";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/content/site";
import "./globals.css";

const figtree = localFont({
  src: "../fonts/Figtree-VariableFont_wght.ttf",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
});

// Tipografia de titulos: condensada, estilo deportivo/arena.
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["italic"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} – ${site.tagline}`,
    description: site.description,
    url: site.url,
    siteName: site.name,
    images: [{ url: "/images/hero-logo.jpg", width: 1584, height: 672 }],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <CartProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
