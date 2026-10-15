import { BackgroundModel } from "@/components/background-model";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spiritual Stokhastik",
  description:
    "Spiritual Stokhastik est un projet de recherche mené par Nicolas Grosfort à la HEAD – Genève, sous la direction de Sabrina Calvo, prenant la forme d’un livre-jeu solitaire qui explore les liens entre anthropomorphisation, domination et entités computationnelles autonomes.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  initialScale: 1,
  width: "device-width",
  height: "device-height",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col overflow-x-clip">
        <main className="mx-auto w-full max-w-2xl px-4 py-8">{children}</main>
        <BackgroundModel />
      </body>
    </html>
  );
}
