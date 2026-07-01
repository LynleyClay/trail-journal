import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trail Journal',
  description: 'Notes from the trail',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
