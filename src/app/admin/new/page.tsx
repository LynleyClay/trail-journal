import { PostForm } from '@/components/PostForm';

export default function AdminNewPostPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-800 mb-8">New Post</h1>
      <PostForm mode="create" />
    </main>
  );
}
