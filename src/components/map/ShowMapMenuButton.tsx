'use client';

export function ShowMapMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="pointer-events-auto absolute top-3 left-1/2 z-[1100] -translate-x-1/2 lg:hidden rounded-full border border-stone-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-stone-800 shadow-md"
      onClick={onClick}
    >
      Show menu
    </button>
  );
}
