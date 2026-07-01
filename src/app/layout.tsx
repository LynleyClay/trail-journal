import type { Metadata } from 'next';
import './globals.css';
import { readConfig } from '@/lib/config';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Trail Journal',
  description: 'Notes from the trail',
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
        <SiteHeader siteName={config.name} />
        {children}
      </body>
    </html>
  );
}
