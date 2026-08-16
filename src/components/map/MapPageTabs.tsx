'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection } from 'geojson';
import type { Post } from '@/lib/posts';
import MapView from '@/components/MapViewLoader';
import RoutePlanner from '@/components/planner/RoutePlannerLoader';

type MapTab = 'journal' | 'planner';

type MapPageTabsProps = {
  posts: Post[];
  trailGeoJsons: Record<string, FeatureCollection>;
  defaultCenter: [number, number];
  defaultZoom: number;
};

const TAB_COPY: Record<MapTab, { label: string; description: string }> = {
  journal: {
    label: 'My Trails',
    description: "Trails I've hiked, with photos and journal entries pinned to where they happened.",
  },
  planner: {
    label: 'Plan Routes',
    description: 'Stitch long trails together to plan future hikes.',
  },
};

export default function MapPageTabs({
  posts,
  trailGeoJsons,
  defaultCenter,
  defaultZoom,
}: MapPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: MapTab = tabParam === 'planner' ? 'planner' : 'journal';
  const [activeTab, setActiveTab] = useState<MapTab>(initialTab);

  useEffect(() => {
    setActiveTab(tabParam === 'planner' ? 'planner' : 'journal');
  }, [tabParam]);

  const switchTab = useCallback(
    (tab: MapTab) => {
      setActiveTab(tab);
      const url = tab === 'planner' ? '/map?tab=planner' : '/map';
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const copy = TAB_COPY[activeTab];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="border-b border-stone-200 bg-white px-4 py-3 shrink-0">
        <h1 className="text-lg font-bold text-stone-900">Trail Map</h1>
        <p className="text-sm text-stone-500 mb-3">{copy.description}</p>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-1 w-fit" role="tablist" aria-label="Map views">
          {(Object.keys(TAB_COPY) as MapTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              onClick={() => switchTab(tab)}
            >
              {TAB_COPY[tab].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {activeTab === 'journal' ? (
          <MapView
            posts={posts}
            trailGeoJsons={trailGeoJsons}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
          />
        ) : (
          <RoutePlanner defaultCenter={defaultCenter} />
        )}
      </div>
    </div>
  );
}
