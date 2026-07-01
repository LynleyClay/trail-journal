import Image from 'next/image';
import type { Photo } from '@/lib/posts';

interface PhotoGalleryProps {
  slug: string;
  photos: Photo[];
}

export function PhotoGallery({ slug, photos }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo, i) => (
        <div key={`${photo.filename}-${i}`} className="overflow-hidden rounded-lg bg-stone-100">
          {photo.caption ? (
            <figure>
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={`/photos/${slug}/${photo.filename}`}
                  alt={photo.caption}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <figcaption className="px-3 py-2 text-xs text-stone-500">{photo.caption}</figcaption>
            </figure>
          ) : (
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={`/photos/${slug}/${photo.filename}`}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
