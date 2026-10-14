import { Model } from "@/components/model";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stokhastik Garden",
  description: "Espace de réflexion",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}

        <Model
          url="/models/2026-09-22-vending-machine-foret-daimonji-trail.ply"
          position={[-1.5713629190625278, 1.495487007130471, 4.252692142611583]}
          target={[
            0.21421883804388286, 0.9180186020625465, -0.24367372908056883,
          ]}
          fullscreen
        />
      </body>
    </html>
  );
}
