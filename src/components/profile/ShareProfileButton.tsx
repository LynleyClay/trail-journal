'use client';

import { useState } from 'react';

type ShareProfileButtonProps = {
  url: string;
};

export default function ShareProfileButton({ url }: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Trail Journal profile', url });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
    >
      {copied ? 'Link copied!' : 'Share profile'}
    </button>
  );
}
