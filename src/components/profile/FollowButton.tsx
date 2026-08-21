'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type FollowButtonProps = {
  username: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
};

export default function FollowButton({ username, initialFollowing, isLoggedIn }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggleFollow() {
    if (!isLoggedIn) {
      router.push(`/signup?returnTo=/u/${username}`);
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await fetch(`/api/follow?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
        setFollowing(false);
      } else {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        setFollowing(true);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggleFollow()}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        following
          ? 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
          : 'bg-stone-900 text-white hover:bg-stone-800'
      }`}
    >
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
