import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/layout/Layout";

export const metadata: Metadata = {
  title: "EğitimPlatformu - Online Eğitim ve Kurs Platformu",
  description: "Yapay zeka destekli kişiselleştirilmiş öğrenme deneyimi ile binlerce kurs ve uzman eğitmenlerden öğrenin. Sertifikalı online eğitimler, canlı dersler ve interaktif öğrenme.",
  keywords: "online eğitim, kurs, öğrenme, sertifika, uzaktan eğitim, yapay zeka, eğitmen",
  openGraph: {
    title: "EğitimPlatformu - Online Eğitim ve Kurs Platformu",
    description: "Yapay zeka destekli kişiselleştirilmiş öğrenme deneyimi ile binlerce kurs ve uzman eğitmenlerden öğrenin.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="font-sans antialiased">
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
}
