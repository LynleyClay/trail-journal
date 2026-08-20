import { PostForm } from '@/components/PostForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ draft?: string; view?: string }>;
}

export default async function AdminNewPostPage({ searchParams }: PageProps) {
  const { draft, view } = await searchParams;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">New Post</h1>
      <p className="text-sm text-stone-500 mb-6">
        Write a trip report, or tap View drafts to open one you saved on this phone.
      </p>
      <PostForm
        mode="create"
        localDraftId={draft}
        initialView={view === 'drafts' ? 'drafts' : 'write'}
      />
    </main>
  );
}
