'use client';

import type { Waypoint } from '@/lib/routes';
import { haversineMiles } from '@/lib/routes';

type Props = {
  waypoints: Waypoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

export function WaypointList({
  waypoints,
  selectedId,
  onSelect,
  onRename,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  let cumulative = 0;

  return (
    <ol className="space-y-1 overflow-y-auto flex-1 min-h-0">
      {waypoints.map((w, i) => {
        const prev = waypoints[i - 1];
        const leg = prev ? haversineMiles(prev, w) : 0;
        cumulative += leg;
        if (w.kind === 'shape') return null;
        const prevStop = [...waypoints.slice(0, i)].reverse().find((p) => p.kind !== 'shape');
        const displayLeg = prevStop ? haversineMiles(prevStop, w) : 0;
        const stopNumber = waypoints.slice(0, i + 1).filter((p) => p.kind !== 'shape').length;
        const isFirstStop = stopNumber === 1;
        return (
          <li
            key={w.id}
            className={`flex items-stretch gap-1 rounded-lg border ${
              selectedId === w.id ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-white'
            }`}
          >
            <button
              type="button"
              className="flex flex-1 items-start gap-2 px-2 py-2 text-left min-w-0"
              onClick={() => onSelect(w.id)}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold shrink-0">
                {stopNumber}
              </span>
              <span className="min-w-0 flex-1">
                <input
                  className="w-full font-medium text-sm text-stone-900 bg-transparent focus:outline-none"
                  value={w.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onRename(w.id, e.target.value)}
                  aria-label="Waypoint name"
                />
                <span className="block text-xs text-stone-500">
                  {isFirstStop
                    ? 'Start · 0 mi'
                    : `+${displayLeg.toFixed(0)} mi · ${cumulative.toFixed(0)} mi total`}
                </span>
                {w.note && (
                  <span className="block text-xs text-stone-400 truncate">{w.note}</span>
                )}
              </span>
            </button>
            <div className="flex flex-col border-l border-stone-200">
              <button
                type="button"
                className="px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => onMoveUp(w.id)}
              >
                ↑
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                aria-label="Move down"
                disabled={i === waypoints.length - 1}
                onClick={() => onMoveDown(w.id)}
              >
                ↓
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                aria-label="Remove waypoint"
                onClick={() => onRemove(w.id)}
              >
                ×
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
