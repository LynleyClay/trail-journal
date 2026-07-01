import { getPublishedPosts } from '@/lib/posts';
import { readConfig } from '@/lib/config';
import { PostCard } from '@/components/PostCard';

export default async function HomePage() {
  const config = readConfig();
  const posts = await getPublishedPosts();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-stone-900">{config.name}</h1>
        <p className="text-sm text-stone-500 mt-0.5">{config.tagline}</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-stone-500 text-center py-20">No trips yet — check back soon.</p>
      ) : (
        <div className="grid gap-8">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
