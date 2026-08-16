'use client';

import {
  getGuideStopCounts,
  getGuideStopsForTrails,
  hasTrailGuide,
  stopsByKind,
} from '@/lib/trail-guides';
import { getTrailById } from '@/lib/long-trails';

type RouteGuideInsightProps = {
  connectedTrailIds: string[];
};

export function RouteGuideInsight({ connectedTrailIds }: RouteGuideInsightProps) {
  const guidedIds = connectedTrailIds.filter((id) => hasTrailGuide(id));
  if (guidedIds.length === 0) return null;

  const counts = getGuideStopCounts(guidedIds);
  const total = counts.highlights + counts.resupply + counts.water;
  if (total === 0) return null;

  const stops = getGuideStopsForTrails(guidedIds).sort((a, b) => (a.mile ?? 0) - (b.mile ?? 0));

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-2 shrink-0">
      <p className="text-xs font-semibold text-emerald-900">
        From trails on your route: {counts.resupply} resupply stops · {counts.water} water ·{' '}
        {counts.highlights} highlights
      </p>
      <ul className="text-xs text-stone-700 max-h-36 overflow-y-auto space-y-2">
        {(['highlight', 'resupply', 'water'] as const).flatMap((kind) =>
          stopsByKind(stops, kind).map((stop) => {
            const trailId = guidedIds.find((id) => stop.id.startsWith(`${id}-`));
            const trail = trailId ? getTrailById(trailId) : null;
            return (
              <li key={stop.id}>
                <span className="font-medium">{stop.name}</span>
                {trail && <span className="text-stone-500"> · {trail.abbrev}</span>}
                <span className="text-stone-500">
                  {' '}
                  · {kind === 'highlight' ? 'Highlight' : kind === 'resupply' ? 'Resupply' : 'Water'}
                </span>
                <p className="text-stone-600 mt-0.5 leading-snug">{stop.note}</p>
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
}
