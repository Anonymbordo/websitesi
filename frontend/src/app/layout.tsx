import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/layout/Layout";
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "Mikrokurs - Online Eğitim Platformu",
  description: "Mikrokurs ile sınav hazırlıklarınızı hızlandırın: deneme sınavları, değerlendirme raporları ve AI destekli geri bildirimlerle başarıya ulaşın.",
  keywords: "online sınav, sınav, sınav hazırlık, deneme sınavı, değerlendirme, online değerlendirme, AI sınav",
  openGraph: {
    title: "Mikrokurs - Online Eğitim Platformu",
    description: "Mikrokurs ile sınav hazırlıklarınızı hızlandırın: deneme sınavları, değerlendirme raporları ve AI destekli geri bildirimlerle başarıya ulaşın.",
    type: "website",
    locale: "tr_TR",
    images: [
      {
        url: '/mikrokurs-og.svg',
        width: 1200,
        height: 630,
        alt: 'Mikrokurs - Sınav hazırlık ve deneme sınavları'
      }
    ]
  },
  icons: {
    icon: '/mikrokurs-icon.svg',
    shortcut: '/mikrokurs-icon.svg',
    apple: '/mikrokurs-icon.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(229, 231, 235, 0.5)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              style: {
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1px solid #10b981',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #ef4444',
              },
            },
          }}
        />
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
}
