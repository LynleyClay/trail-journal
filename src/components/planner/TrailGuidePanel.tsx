'use client';

import type { LongTrail } from '@/lib/long-trails';
import {
  stopsByKind,
  type TrailGuide,
  type TrailStop,
} from '@/lib/trail-guides';
import { distanceToRouteMiles } from '@/lib/route-proximity';
import type { Waypoint } from '@/lib/routes';

type TrailGuidePanelProps = {
  trail: LongTrail;
  guide: TrailGuide | null;
  connectedOrder: number | null;
  showStopsOnMap: boolean;
  routeWaypoints: Waypoint[];
  onBack: () => void;
  onConnect: () => void;
  onToggleShowStops: () => void;
};

function StopList({
  title,
  stops,
  routeWaypoints,
  iconClass,
}: {
  title: string;
  stops: TrailStop[];
  routeWaypoints: Waypoint[];
  iconClass: string;
}) {
  if (stops.length === 0) return null;
  const sorted = [...stops].sort((a, b) => (a.mile ?? 0) - (b.mile ?? 0));
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-2">
      <p className="text-xs font-semibold text-stone-800 mb-2 flex items-center gap-1">
        <span className={`inline-flex poi-marker__badge ${iconClass} scale-75 origin-left`}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <circle fill="currentColor" cx="12" cy="12" r="4" />
          </svg>
        </span>
        {title} ({sorted.length})
      </p>
      <ul className="text-xs text-stone-700 space-y-2">
        {sorted.map((stop) => {
          const dist =
            routeWaypoints.length >= 2
              ? distanceToRouteMiles(stop, routeWaypoints)
              : null;
          return (
            <li key={stop.id}>
              <span className="font-medium text-stone-900">{stop.name}</span>
              {stop.mile != null && (
                <span className="text-stone-500"> · ~mi {stop.mile.toLocaleString()}</span>
              )}
              {dist != null && (
                <span className="text-stone-500"> · ~{dist.toFixed(1)} mi from route</span>
              )}
              <p className="text-stone-600 mt-0.5 leading-snug">{stop.note}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TrailGuidePanel({
  trail,
  guide,
  connectedOrder,
  showStopsOnMap,
  routeWaypoints,
  onBack,
  onConnect,
  onToggleShowStops,
}: TrailGuidePanelProps) {
  const isConnected = connectedOrder !== null;
  const highlights = guide ? stopsByKind(guide.stops, 'highlight') : [];
  const resupply = guide ? stopsByKind(guide.stops, 'resupply') : [];
  const water = guide ? stopsByKind(guide.stops, 'water') : [];

  return (
    <div className="flex flex-col gap-3 pb-2">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-stone-600 hover:text-stone-900 text-left w-fit"
      >
        ← All trails
      </button>

      <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
        <div className="flex items-start gap-2">
          <span
            className="w-4 h-4 rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: trail.color }}
          />
          <div>
            <h2 className="font-bold text-stone-900">
              {trail.abbrev} · {trail.name}
            </h2>
            <p className="text-xs text-stone-500">
              {trail.miles.toLocaleString()} mi · {trail.termini[0]} → {trail.termini[1]}
            </p>
          </div>
        </div>

        {guide ? (
          <>
            <p className="text-sm text-stone-700 leading-relaxed">{guide.synopsis}</p>
            {(guide.bestSeason || guide.typicalDuration) && (
              <p className="text-xs text-stone-500">
                {guide.bestSeason && <span>Season: {guide.bestSeason}</span>}
                {guide.bestSeason && guide.typicalDuration && ' · '}
                {guide.typicalDuration && <span>{guide.typicalDuration}</span>}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-600">
            Trail guide coming soon. Tap two points on this trail on the map to use only a stretch,
            or add the full corridor below.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConnect}
          className="flex-1 min-w-[120px] rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          Add full trail
        </button>
        {guide && (
          <button
            type="button"
            onClick={onToggleShowStops}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              showStopsOnMap
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            {showStopsOnMap ? 'Hide stops' : 'Show on map'}
          </button>
        )}
      </div>
      <p className="text-xs text-stone-500">
        {isConnected
          ? `Already on your route (#${connectedOrder}). Tap two points on the map to use only a stretch.`
          : 'Prefer a section? Tap two points on this trail on the map instead of adding the whole thing.'}
      </p>

      {guide && (
        <div className="space-y-2">
          <StopList
            title="Popular points"
            stops={highlights}
            routeWaypoints={routeWaypoints}
            iconClass="poi-marker__badge--highlight"
          />
          <StopList
            title="Thru-hike resupply stops"
            stops={resupply}
            routeWaypoints={routeWaypoints}
            iconClass="poi-marker__badge--town"
          />
          <StopList
            title="Water"
            stops={water}
            routeWaypoints={routeWaypoints}
            iconClass="poi-marker__badge--water"
          />
        </div>
      )}
    </div>
  );
}
