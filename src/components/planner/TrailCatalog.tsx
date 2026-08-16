'use client';

import type { LongTrail } from '@/lib/long-trails';
import { TRAIL_REGIONS } from '@/lib/long-trails';

type Props = {
  trails: LongTrail[];
  connectedIds: string[];
  highlightedId: string | null;
  onConnect: (id: string) => void;
  onHover: (id: string | null) => void;
  filter: string;
  onFilterChange: (value: string) => void;
};

export function TrailCatalog({
  trails,
  connectedIds,
  highlightedId,
  onConnect,
  onHover,
  filter,
  onFilterChange,
}: Props) {
  const q = filter.trim().toLowerCase();
  const filtered = trails.filter((t) => {
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.abbrev.toLowerCase().includes(q) ||
      t.region.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <input
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        type="search"
        placeholder="Search trails…"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        aria-label="Search long trails"
      />

      <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1">
        {TRAIL_REGIONS.map((region) => {
          const group = filtered.filter((t) => t.region === region);
          if (group.length === 0) return null;
          return (
            <div key={region} className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
                {region}
              </p>
              <ul className="space-y-1">
                {group.map((trail) => {
                  const connected = connectedIds.includes(trail.id);
                  const order = connected ? connectedIds.indexOf(trail.id) + 1 : null;
                  return (
                    <li key={trail.id}>
                      <button
                        type="button"
                        className={`w-full flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-sm transition-colors ${
                          connected
                            ? 'border-emerald-300 bg-emerald-50'
                            : highlightedId === trail.id
                              ? 'border-stone-400 bg-stone-50'
                              : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                        onClick={() => onConnect(trail.id)}
                        onMouseEnter={() => onHover(trail.id)}
                        onMouseLeave={() => onHover(null)}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: trail.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-stone-900">
                            {trail.abbrev}
                            {order !== null && (
                              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs">
                                {order}
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-stone-500 truncate">
                            {trail.name} · {trail.miles.toLocaleString()} mi
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
