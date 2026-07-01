import Link from 'next/link';
import { getPublishedPosts } from '@/lib/posts';
import { readConfig } from '@/lib/config';
import { PostCard } from '@/components/PostCard';

export default function HomePage() {
  const config = readConfig();
  const posts = getPublishedPosts();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{config.name}</h1>
            <p className="text-sm text-stone-500 mt-0.5">{config.tagline}</p>
          </div>
          <nav>
            <Link
              href="/map"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              Map →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {posts.length === 0 ? (
          <p className="text-stone-500 text-center py-20">No trips yet — check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
