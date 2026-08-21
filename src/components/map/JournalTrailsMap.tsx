'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import type { Post } from '@/lib/posts';
import type { CompletedTrailPath } from '@/lib/completed-trails';
import { LONG_TRAILS, TRAIL_REGIONS } from '@/lib/long-trails';
import { uid } from '@/lib/routes';
import MapView from '@/components/MapViewLoader';

type JournalTrailsMapProps = {
  posts: Post[];
  trailGeoJsons: Record<string, FeatureCollection>;
  completedRoutes: CompletedTrailPath[];
  defaultCenter: [number, number];
  defaultZoom: number;
  completedTrailIds: string[];
  canEdit: boolean;
};

export function JournalTrailsMap({
  posts,
  trailGeoJsons,
  completedRoutes,
  defaultCenter,
  defaultZoom,
  completedTrailIds,
  canEdit,
}: JournalTrailsMapProps) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<'pick' | 'draw'>('pick');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [hikeName, setHikeName] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LONG_TRAILS.filter((trail) => {
      if (!q) return true;
      return (
        trail.name.toLowerCase().includes(q) ||
        trail.abbrev.toLowerCase().includes(q) ||
        trail.region.toLowerCase().includes(q)
      );
    });
  }, [query]);

  async function toggleLongTrail(id: string) {
    setError('');
    setSaving(true);
    const next = completedTrailIds.includes(id)
      ? completedTrailIds.filter((item) => item !== id)
      : [...completedTrailIds, id];
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trailsCompleted: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not update trails');
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveDrawnHike() {
    if (draft.length < 2) {
      setError('Tap at least two points on the map.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const waypoints = draft.map((point, index) => ({
        id: uid('hike'),
        name: index === 0 ? 'Start' : index === draft.length - 1 ? 'Finish' : `Point ${index + 1}`,
        lat: point[0],
        lng: point[1],
      }));
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hikeName.trim() || 'Custom hike',
          waypoints,
          connectedTrailIds: [],
          status: 'completed',
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save that hike');
        return;
      }
      setDraft([]);
      setHikeName('');
      setMode('pick');
      setPanelOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="absolute inset-0">
        <MapView
          posts={posts}
          trailGeoJsons={trailGeoJsons}
          completedRoutes={completedRoutes}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <MapView
        posts={posts}
        trailGeoJsons={trailGeoJsons}
        completedRoutes={completedRoutes}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        drawMode={mode === 'draw'}
        draftPath={draft}
        onDrawClick={(lat, lng) => setDraft((prev) => [...prev, [lat, lng]])}
      />

      {!panelOpen && mode !== 'draw' && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute top-3 left-3 z-[1100] rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          Add trails
        </button>
      )}

      {mode === 'draw' && (
        <div className="absolute bottom-3 left-3 right-3 z-[1100] rounded-lg border border-stone-200 bg-white p-3 shadow-sm space-y-2">
          <p className="text-sm font-medium text-stone-900">Draw your hike</p>
          <p className="text-xs text-stone-500">Tap the map to trace the path you walked.</p>
          <input
            type="text"
            value={hikeName}
            onChange={(e) => setHikeName(e.target.value)}
            placeholder="Name this hike"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDraft((prev) => prev.slice(0, -1))}
              disabled={draft.length === 0}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 disabled:opacity-50"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => void saveDrawnHike()}
              disabled={saving || draft.length < 2}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to my map'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft([]);
                setMode('pick');
                setPanelOpen(true);
                setError('');
              }}
              className="rounded-md px-3 py-1.5 text-xs text-stone-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {panelOpen && mode === 'pick' && (
        <div className="absolute inset-x-0 top-0 z-[1100] max-h-[55%] overflow-y-auto border-b border-stone-200 bg-white p-4 shadow-sm lg:inset-y-0 lg:right-auto lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-medium text-stone-900">Add trails</p>
              <p className="text-xs text-stone-500">Any long trail, or draw your own.</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-sm text-stone-500 hover:text-stone-800"
            >
              Close
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode('draw');
              setPanelOpen(false);
              setError('');
            }}
            className="mb-3 w-full rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
          >
            Draw my own
          </button>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trails…"
            className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="space-y-3">
            {TRAIL_REGIONS.map((region) => {
              const group = filtered.filter((trail) => trail.region === region);
              if (group.length === 0) return null;
              return (
                <div key={region}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">
                    {region}
                  </p>
                  <ul className="space-y-1">
                    {group.map((trail) => {
                      const added = completedTrailIds.includes(trail.id);
                      return (
                        <li key={trail.id}>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void toggleLongTrail(trail.id)}
                            className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                              added
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : 'border-stone-200 bg-white hover:bg-stone-50'
                            }`}
                          >
                            <span className="font-medium">{trail.abbrev}</span>
                            <span className="text-stone-500"> · {trail.name}</span>
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
      )}
    </div>
  );
}
