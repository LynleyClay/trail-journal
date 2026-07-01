import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/lib/posts';
import { photoUrl } from '@/lib/photo-url';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/posts/${post.slug}`} className="group flex gap-6 items-start">
      <div className="w-40 h-28 rounded-lg overflow-hidden bg-stone-200 flex-shrink-0 flex items-center justify-center">
        {post.coverPhoto ? (
          <Image
            src={photoUrl(post.slug, post.coverPhoto)}
            alt={post.title}
            width={160}
            height={112}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-3xl">🥾</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {post.trail && (
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {post.trail}
            </span>
          )}
          <time className="text-xs text-stone-400" dateTime={post.date}>
            {formatDate(post.date)}
          </time>
        </div>
        <h2 className="text-lg font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
          {post.title}
        </h2>
        <p className="mt-1 text-sm text-stone-600 line-clamp-2">{post.excerpt}</p>
      </div>
    </Link>
  );
}
