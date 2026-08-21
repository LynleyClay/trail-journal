import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUserByUsername, toPublicUser } from '@/lib/users';
import { getPublishedPostsForUser } from '@/lib/posts';
import { readConfig } from '@/lib/config';
import { loadTrailGeoJsonsForUser } from '@/lib/trail-geojson';
import { getCurrentUser } from '@/lib/user-session';
import { isFollowing } from '@/lib/follows';
import MapView from '@/components/MapViewLoader';
import { PostCard } from '@/components/PostCard';
import ShareProfileButton from '@/components/profile/ShareProfileButton';
import FollowButton from '@/components/profile/FollowButton';
import { TrailNameForm } from '@/components/profile/TrailNameForm';

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return { title: 'Profile not found' };
  return {
    title: `${user.displayName} — Trail Journal`,
    description: `${user.displayName}'s hikes and journal entries`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) notFound();

  const config = readConfig();
  const posts = await getPublishedPostsForUser(user.id);
  const trailGeoJsons = loadTrailGeoJsonsForUser(user.trailsCompleted);
  const currentUser = await getCurrentUser();
  const publicUser = toPublicUser(user);
  const profileUrl = `/u/${user.username}`;
  const following =
    currentUser && currentUser.id !== user.id
      ? await isFollowing(currentUser.id, user.id)
      : false;

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <div className="border-b border-stone-200 bg-white px-4 py-6 shrink-0">
        <div className="mx-auto max-w-5xl flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500 mb-1">Hiker profile</p>
            <h1 className="text-2xl font-bold text-stone-900">{publicUser.displayName}</h1>
            <p className="text-sm text-stone-500 mt-1">/{publicUser.username}</p>
            {publicUser.trailsCompleted.length > 0 && (
              <p className="text-sm text-stone-600 mt-2">
                Trails hiked: {publicUser.trailsCompleted.map((id) => id.toUpperCase()).join(', ')}
              </p>
            )}
            {currentUser?.id === user.id && (
              <TrailNameForm initialTrailName={publicUser.displayName} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentUser?.id !== user.id && (
              <FollowButton
                username={user.username}
                initialFollowing={following}
                isLoggedIn={!!currentUser}
              />
            )}
            <ShareProfileButton url={profileUrl} />
            {currentUser?.id === user.id && (
              <Link
                href="/map"
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                My map
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[420px] relative">
        <MapView
          posts={posts}
          trailGeoJsons={trailGeoJsons}
          defaultCenter={config.map.defaultCenter}
          defaultZoom={config.map.defaultZoom}
        />
      </div>

      <section className="mx-auto w-full max-w-5xl px-4 py-10 shrink-0">
        <h2 className="text-lg font-bold text-stone-900 mb-6">Journal entries</h2>
        {posts.length === 0 ? (
          <p className="text-stone-500">No published entries yet.</p>
        ) : (
          <div className="grid gap-8">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
