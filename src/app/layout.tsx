import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
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
        <Script id="tj-sw-bust" strategy="beforeInteractive">
          {`(function(){try{if(localStorage.getItem('tj-sw-bust-v6')==='1')return;localStorage.setItem('tj-sw-bust-v6','1');}catch(e){return;}var p=[];if(navigator.serviceWorker)p.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister();}));}));if(window.caches)p.push(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return /trail-journal-(app|static|runtime)-/.test(x);}).map(function(x){return caches.delete(x);}));}));if(p.length)Promise.all(p).then(function(){location.reload();});})();`}
        </Script>
        <Script src="/offline-draft.js?v=8" strategy="afterInteractive" />
        <ServiceWorkerRegistration />
        <SiteHeader siteName={config.name} />
        {children}
      </body>
    </html>
  );
}
