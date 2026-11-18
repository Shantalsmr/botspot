import type { Metadata, Viewport } from "next";
import { Chakra_Petch } from "next/font/google";
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

// Tipografia de titulos: Chakra Petch (esquinas cortadas como las letras del logo, tecnica pero legible).
// El texto normal va en Figtree.
const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
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
  themeColor: "#0a0c0f",
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
