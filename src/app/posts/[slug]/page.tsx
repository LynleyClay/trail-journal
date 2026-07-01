import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as fs from 'fs';
import * as path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FeatureCollection } from 'geojson';
import { getPostBySlug } from '@/lib/posts';
import { PhotoGallery } from '@/components/PhotoGallery';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

function loadTrailGeoJson(trail: string | undefined): FeatureCollection | undefined {
  if (!trail) return undefined;
  const filePath = path.join(process.cwd(), 'public', 'trails', `${trail.toLowerCase()}.geojson`);
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as FeatureCollection;
  } catch {
    return undefined;
  }
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TripReportPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const trailGeoJson = loadTrailGeoJson(post.trail);
  const gpsPhotos = post.photos.filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
  );
  const showMap = trailGeoJson !== undefined || gpsPhotos.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link href="/" className="text-sm text-emerald-700 hover:underline">
            ← Trail Journal
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          {post.trail && (
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {post.trail}
            </span>
          )}
          <h1 className="text-3xl font-bold text-stone-900">{post.title}</h1>
          <time className="text-sm text-stone-500" dateTime={post.date}>
            {formatDate(post.date)}
          </time>
        </div>

        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-stone-100">
          <Image
            src={`/photos/${post.slug}/${post.coverPhoto}`}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        <article className="prose prose-stone max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body ?? ''}</ReactMarkdown>
        </article>

        {post.photos.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Photos</h2>
            <PhotoGallery slug={post.slug} photos={post.photos} />
          </section>
        )}

        {showMap && (
          <section>
            <h2 className="text-xl font-semibold text-stone-800 mb-4">On the Trail</h2>
            <MiniMap trailGeoJson={trailGeoJson} photos={post.photos} />
          </section>
        )}
      </main>
    </div>
  );
}
