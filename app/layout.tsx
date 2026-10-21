import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";
import { Navbar } from "@/app/components/navbar";
import { GeoBanner } from "@/app/components/GeoBanner";
import { Footer } from "@/app/components/Footer";
import { UploadModal } from "@/app/components/UploadModal";

const logoFont = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "MAGMA — Comunidad Creativa CDMX",
  description: "Plataforma dark para artistas en Ciudad de México",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${logoFont.variable} ${GeistPixelSquare.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <GeoBanner />
        {children}
        <Footer />
        <UploadModal />
      </body>
    </html>
  );
}
