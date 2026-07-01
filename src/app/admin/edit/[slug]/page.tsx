import { notFound } from 'next/navigation';
import { getPostForEdit } from '@/lib/posts';
import { photoUrl } from '@/lib/photo-url';
import { PostForm } from '@/components/PostForm';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminEditPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostForEdit(slug);
  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-800 mb-8">Edit Post</h1>
      <PostForm
        mode="edit"
        slug={post.slug}
        initialData={{
          title: post.title,
          date: post.date,
          excerpt: post.excerpt,
          body: post.body ?? '',
          trail: post.trail ?? '',
          coverPhoto: post.coverPhoto,
          photos: post.photos.map((p) => ({
            ...p,
            url: photoUrl(post.slug, p.filename),
            previewUrl: photoUrl(post.slug, p.filename),
          })),
        }}
      />
    </main>
  );
}
