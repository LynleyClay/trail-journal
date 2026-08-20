import type { MetadataRoute } from 'next';
import { readConfig } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  const config = readConfig();

  return {
    name: config.name,
    short_name: config.name,
    description: config.tagline,
    start_url: '/hike.html',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    shortcuts: [
      {
        name: 'My map',
        url: '/map?tab=active',
      },
      {
        name: 'Journal',
        url: '/',
      },
    ],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
