import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Caixa dos Amigos",
  description: "Controle caixas, pagamentos, membros e rodízios como gerente.",
  applicationName: "Caixa dos Amigos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Caixa dos Amigos",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#064E2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("font-sans", geistSans.variable)}
    >
      <body className={`${geistSans.variable} ${geistMono.variable} theme min-h-screen bg-background antialiased`}>
        <a href="#main-content" className="skip-link">
          Pular para o conte?do principal
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
