import type { Metadata, Viewport } from 'next';
import './globals.css';
import { readConfig } from '@/lib/config';
import { SiteHeader } from '@/components/SiteHeader';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'Trail Journal',
  description: 'Notes from the trail',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trail Journal',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = readConfig();

  return (
    <html lang="en" className="h-full">
      <body className="h-screen flex flex-col bg-white text-stone-900 antialiased overflow-y-auto">
        <ServiceWorkerRegistration />
        <SiteHeader siteName={config.name} />
        {children}
      </body>
    </html>
  );
}
