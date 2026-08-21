'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { GpsPosition } from './useLiveGps';
import {
  areaPath,
  elevationAtMiles,
  formatFeet,
  gradeColor,
  gradeSegments,
  linePath,
  milesOfX,
  profileLayout,
  remainingClimbFt,
  xOfMiles,
  yOfFt,
  type ElevationProfile as ElevationProfileData,
} from '@/lib/elevation';

export function RouteViewToggle({
  view,
  onChange,
}: {
  view: 'map' | 'climb';
  onChange: (view: 'map' | 'climb') => void;
}) {
  return (
    <div
      className="pointer-events-auto flex overflow-hidden rounded-full border border-stone-200 bg-white/95 shadow-md"
      role="tablist"
      aria-label="Route view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === 'map'}
        className={`px-3.5 py-2 text-sm font-medium ${
          view === 'map' ? 'bg-emerald-700 text-white' : 'text-stone-700'
        }`}
        onClick={() => onChange('map')}
      >
        Map
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'climb'}
        className={`px-3.5 py-2 text-sm font-medium ${
          view === 'climb' ? 'bg-emerald-700 text-white' : 'text-stone-700'
        }`}
        onClick={() => onChange('climb')}
      >
        Climb
      </button>
    </div>
  );
}

type ElevationProfileViewProps = {
  profile: ElevationProfileData;
  gpsMiles?: number | null;
  inspectMiles?: number | null;
  gps?: GpsPosition | null;
  compact?: boolean;
  onExpand?: () => void;
};

export function ElevationProfileView({
  profile,
  gpsMiles,
  inspectMiles = null,
  compact = false,
  onExpand,
}: ElevationProfileViewProps) {
  const clipId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [scrubMiles, setScrubMiles] = useState<number | null>(null);
  const [size, setSize] = useState({ width: compact ? 640 : 900, height: compact ? 92 : 280 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observe = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return;
      setSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
    observe();
    const observer = new ResizeObserver(observe);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact]);

  const width = size.width;
  const height = size.height;
  const layout = useMemo(() => profileLayout(profile, width, height), [profile, width, height]);
  const area = useMemo(() => areaPath(profile, layout), [profile, layout]);
  const ridgeline = useMemo(() => linePath(profile, layout), [profile, layout]);
  const segments = useMemo(() => gradeSegments(profile, layout), [profile, layout]);
  const high = profile.samples.reduce(
    (best, sample) => (sample.elevationFt > best.elevationFt ? sample : best),
    profile.samples[0]!,
  );
  const youMiles = gpsMiles ?? null;
  const inspect = inspectMiles != null ? elevationAtMiles(profile, inspectMiles) : null;
  const markerMiles = scrubMiles ?? inspectMiles ?? youMiles;
  const marker = markerMiles != null ? elevationAtMiles(profile, markerMiles) : null;
  const remaining = youMiles != null ? remainingClimbFt(profile, youMiles) : profile.gainFt;
  const youX = youMiles != null ? xOfMiles(layout, youMiles) : null;
  const totalMiles = layout.totalMiles;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * layout.width;
      setScrubMiles(milesOfX(layout, x));
    },
    [layout],
  );

  const mileTicks = useMemo(() => {
    if (totalMiles <= 0) return [];
    const step = totalMiles > 40 ? 10 : totalMiles > 16 ? 5 : totalMiles > 6 ? 2 : 1;
    const ticks: number[] = [0];
    for (let m = step; m < totalMiles - 0.2; m += step) ticks.push(m);
    ticks.push(totalMiles);
    return ticks;
  }, [totalMiles]);

  const elevTicks = useMemo(() => {
    const span = layout.yMax - layout.yMin;
    const step = span > 4000 ? 1000 : span > 1600 ? 500 : 250;
    const start = Math.ceil(layout.yMin / step) * step;
    const ticks: number[] = [];
    for (let ft = start; ft <= layout.yMax; ft += step) ticks.push(ft);
    return ticks;
  }, [layout.yMax, layout.yMin]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${compact ? '' : 'bg-stone-50'}`}>
      {!compact && (
        <div className="shrink-0 px-4 pt-3 pb-1 space-y-1">
          <p className="text-sm font-medium text-stone-900">
            +{formatFeet(profile.gainFt)} climb
            <span className="font-normal text-stone-500">
              {' '}
              · −{formatFeet(profile.lossFt)} · {totalMiles.toFixed(1)} mi
            </span>
          </p>
          <p className="text-xs text-stone-500">
            {youMiles != null
              ? `You are at mile ${youMiles.toFixed(1)} · ${formatFeet(elevationAtMiles(profile, youMiles).elevationFt)} · ${formatFeet(remaining)} still to climb`
              : 'Steeper stretches turn orange, then red. Turn on GPS to see where you are.'}
          </p>
        </div>
      )}

      <div
        ref={wrapRef}
        role={compact ? 'button' : 'img'}
        tabIndex={compact ? 0 : undefined}
        className={`relative min-h-0 flex-1 outline-none ${compact ? 'cursor-pointer' : 'cursor-crosshair'}`}
        onClick={compact ? onExpand : undefined}
        onKeyDown={
          compact
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onExpand?.();
                }
              }
            : undefined
        }
        aria-label={
          compact
            ? 'Open full climb profile'
            : `Elevation profile, ${formatFeet(profile.gainFt)} of climb over ${totalMiles.toFixed(1)} miles`
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={
            compact
              ? undefined
              : (event) => {
                  (event.target as Element).setPointerCapture?.(event.pointerId);
                  setFromClientX(event.clientX);
                }
          }
          onPointerMove={
            compact
              ? undefined
              : (event) => {
                  if (event.buttons === 0 && scrubMiles == null) return;
                  if (event.buttons !== 0) setFromClientX(event.clientX);
                }
          }
          onPointerUp={compact ? undefined : () => setScrubMiles(null)}
          onPointerLeave={compact ? undefined : () => setScrubMiles(null)}
        >
          <defs>
            <linearGradient id={`${clipId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.12" />
            </linearGradient>
            <clipPath id={`${clipId}-done`}>
              {youX != null && (
                <rect x="0" y="0" width={youX} height={height} />
              )}
            </clipPath>
          </defs>

          {elevTicks.map((ft) => (
            <g key={ft}>
              <line
                x1={layout.pad.left}
                x2={width - layout.pad.right}
                y1={yOfFt(layout, ft)}
                y2={yOfFt(layout, ft)}
                stroke="#e7e5e4"
                strokeWidth="1"
              />
              {!compact && (
                <text
                  x={layout.pad.left - 6}
                  y={yOfFt(layout, ft) + 3}
                  textAnchor="end"
                  className="fill-stone-400"
                  fontSize="11"
                >
                  {Math.round(ft).toLocaleString('en-US')}
                </text>
              )}
            </g>
          ))}

          <path d={area} fill={`url(#${clipId}-fill)`} />
          {youX != null && (
            <path d={area} fill="#a8a29e" fillOpacity="0.35" clipPath={`url(#${clipId}-done)`} />
          )}
          <path d={ridgeline} fill="none" stroke="#57534e" strokeWidth={compact ? 2 : 2.4} />
          {segments.map((segment, i) => (
            <path
              key={i}
              d={segment.d}
              fill="none"
              stroke={gradeColor(segment.grade)}
              strokeWidth={compact ? 2.2 : 3.2}
              strokeLinecap="round"
            />
          ))}

          {high && !compact && (
            <g>
              <circle cx={xOfMiles(layout, high.miles)} cy={yOfFt(layout, high.elevationFt)} r="3.5" fill="#c2410c" />
              <text
                x={xOfMiles(layout, high.miles)}
                y={yOfFt(layout, high.elevationFt) - 8}
                textAnchor="middle"
                className="fill-orange-800"
                fontSize="11"
                fontWeight="600"
              >
                {formatFeet(high.elevationFt)}
              </text>
            </g>
          )}

          {youX != null && (
            <g>
              <line
                x1={youX}
                x2={youX}
                y1={layout.pad.top}
                y2={layout.pad.top + layout.innerHeight}
                stroke="#16a34a"
                strokeWidth="2"
              />
              <circle
                cx={youX}
                cy={yOfFt(layout, elevationAtMiles(profile, youMiles ?? 0).elevationFt)}
                r={compact ? 4 : 6}
                fill="#16a34a"
                stroke="#fff"
                strokeWidth="2"
              />
            </g>
          )}

          {inspect && (
            <g>
              <line
                x1={xOfMiles(layout, inspect.miles)}
                x2={xOfMiles(layout, inspect.miles)}
                y1={layout.pad.top}
                y2={layout.pad.top + layout.innerHeight}
                stroke="#9a3412"
                strokeWidth={compact ? 2 : 2.5}
              />
              <circle
                cx={xOfMiles(layout, inspect.miles)}
                cy={yOfFt(layout, inspect.elevationFt)}
                r={compact ? 5 : 7}
                fill="#c2410c"
                stroke="#fff"
                strokeWidth="2"
              />
            </g>
          )}

          {marker && !compact && scrubMiles != null && (
            <g>
              <line
                x1={xOfMiles(layout, marker.miles)}
                x2={xOfMiles(layout, marker.miles)}
                y1={layout.pad.top}
                y2={layout.pad.top + layout.innerHeight}
                stroke="#44403c"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <circle
                cx={xOfMiles(layout, marker.miles)}
                cy={yOfFt(layout, marker.elevationFt)}
                r="5"
                fill="#44403c"
                stroke="#fff"
                strokeWidth="2"
              />
            </g>
          )}

          {mileTicks.map((miles) => (
            <text
              key={miles}
              x={xOfMiles(layout, miles)}
              y={height - 8}
              textAnchor="middle"
              className="fill-stone-400"
              fontSize={compact ? '10' : '11'}
            >
              {miles === 0 ? '0' : `${miles.toFixed(miles >= 10 && miles !== totalMiles ? 0 : 1)}`}
              {miles === totalMiles ? ' mi' : ''}
            </text>
          ))}
        </svg>
        {inspect && compact && (
          <p className="pointer-events-none absolute left-2 right-2 top-1 text-center text-[11px] font-semibold text-stone-800">
            Mile {inspect.miles.toFixed(1)} · {formatFeet(inspect.elevationFt)}
          </p>
        )}
      </div>

      {!compact && marker && (
        <p className="shrink-0 px-4 pb-3 text-xs text-stone-600">
          Mile {marker.miles.toFixed(1)} · {formatFeet(marker.elevationFt)}
          {youMiles != null && scrubMiles == null ? ` · ${formatFeet(remaining)} still to climb` : ''}
        </p>
      )}
    </div>
  );
}
