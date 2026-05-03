import type { Metadata } from "next";
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
  description: "Seu caixa organizadinho para gerenciar grupos rotativos com transparência.",
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
          Pular para o conteudo principal
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
