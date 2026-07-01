import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/lib/posts';

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
  const coverSrc = `/photos/${post.slug}/${post.coverPhoto}`;

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
        <Image
          src={coverSrc}
          alt={post.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
        {post.trail && (
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {post.trail}
          </span>
        )}
        <h2 className="text-lg font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
          {post.title}
        </h2>
        <time className="text-sm text-stone-500" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
        <p className="text-sm text-stone-600 line-clamp-3">{post.excerpt}</p>
      </div>
    </Link>
  );
}
