import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mossion | Design the unseen",
  description: "Generate breathtaking procedural art and animations purely from text prompts.",
  keywords: ["abstract motion", "background generator", "stock video", "AI video", "motion graphics", "procedural animation"],
};

import Navbar from "@/components/Navbar";
import { DownloadQueueProvider } from "@/components/DownloadQueueProvider";
import { RegisterSW } from "@/lib/registerSW";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body>
        <RegisterSW />
        <DownloadQueueProvider>
          <Navbar />
          {children}
        </DownloadQueueProvider>
      </body>
    </html>
  );
}

