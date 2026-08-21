import Link from 'next/link';
import FollowButton from '@/components/profile/FollowButton';

export type TramilyHiker = {
  username: string;
  displayName: string;
  inTramily: boolean;
};

type TramilyHikerListProps = {
  hikers: TramilyHiker[];
  isLoggedIn: boolean;
};

export function TramilyHikerList({ hikers, isLoggedIn }: TramilyHikerListProps) {
  if (hikers.length === 0) {
    return (
      <p className="text-sm text-stone-600 bg-white rounded-lg border border-stone-200 px-3 py-2">
        When other hikers create accounts, they show up here so you can add them as tramily — trail
        family.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {hikers.map((hiker) => (
        <li key={hiker.username}>
          <div
            className={`rounded-lg border px-3 py-2 ${
              hiker.inTramily
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-stone-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <Link href={`/u/${hiker.username}`} className="min-w-0 hover:text-emerald-800">
                <span className="block text-sm font-medium text-stone-900">{hiker.displayName}</span>
                <span className="block text-xs text-stone-500">@{hiker.username}</span>
              </Link>
              <FollowButton
                username={hiker.username}
                initialFollowing={hiker.inTramily}
                isLoggedIn={isLoggedIn}
                compact
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
