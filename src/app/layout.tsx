import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { readConfig } from '@/lib/config';
import { SiteHeader } from '@/components/SiteHeader';
import { PhoneBottomNav } from '@/components/PhoneBottomNav';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { getCurrentPublicUser } from '@/lib/user-session';

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
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = readConfig();
  const user = await getCurrentPublicUser();

  return (
    <html lang="en" className="h-full">
      <body className="h-dvh flex flex-col bg-white text-stone-900 antialiased overflow-hidden">
        <Script id="tj-sw-bust" strategy="beforeInteractive">
          {`(function(){try{if(localStorage.getItem('tj-sw-bust-v7')==='1')return;localStorage.setItem('tj-sw-bust-v7','1');}catch(e){return;}var p=[];if(navigator.serviceWorker)p.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister();}));}));if(window.caches)p.push(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return /trail-journal-(app|static|runtime)-/.test(x);}).map(function(x){return caches.delete(x);}));}));if(p.length)Promise.all(p).then(function(){location.reload();});})();`}
        </Script>
        <Script src="/offline-draft.js?v=9" strategy="afterInteractive" />
        <ServiceWorkerRegistration />
        <div className="lg:hidden shrink-0 bg-white h-[env(safe-area-inset-top)]" />
        <SiteHeader siteName={config.name} user={user} />
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</div>
        <PhoneBottomNav isLoggedIn={!!user} />
      </body>
    </html>
  );
}
