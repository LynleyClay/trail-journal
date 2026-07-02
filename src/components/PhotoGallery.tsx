'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/lib/posts';
import { photoUrl } from '@/lib/photo-url';
import { Lightbox } from './Lightbox';

interface PhotoGalleryProps {
  slug: string;
  photos: Photo[];
}

export function PhotoGallery({ slug, photos }: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const openPhoto = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, i) => (
          <div key={`${photo.filename}-${i}`} className="overflow-hidden rounded-lg bg-stone-100">
            {photo.caption ? (
              <figure>
                <button
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  aria-label={`View larger photo: ${photo.caption}`}
                  className="relative block aspect-[4/3] w-full cursor-zoom-in"
                >
                  <Image
                    src={photoUrl(slug, photo.filename)}
                    alt={photo.caption}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </button>
                <figcaption className="px-3 py-2 text-xs text-stone-500">{photo.caption}</figcaption>
              </figure>
            ) : (
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                aria-label={`View larger photo ${i + 1}`}
                className="relative block aspect-[4/3] w-full cursor-zoom-in"
              >
                <Image
                  src={photoUrl(slug, photo.filename)}
                  alt={`Photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </button>
            )}
          </div>
        ))}
      </div>

      <Lightbox
        src={openPhoto ? photoUrl(slug, openPhoto.filename) : ''}
        alt={openPhoto?.caption ?? 'Photo'}
        isOpen={openPhoto !== null}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
