'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection } from 'geojson';
import type { Post } from '@/lib/posts';
import MapView from '@/components/MapViewLoader';
import RoutePlanner from '@/components/planner/RoutePlannerLoader';
import MyCurrentRoutes from '@/components/active/MyCurrentRoutesLoader';

type MapTab = 'journal' | 'planner' | 'active';

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
  active: {
    label: 'My Current Routes',
    description: 'Approved routes with resupply towns, water sources, and live GPS tracking.',
  },
};

function tabFromParam(tab: string | null): MapTab {
  if (tab === 'planner') return 'planner';
  if (tab === 'active') return 'active';
  return 'journal';
}

function tabUrl(tab: MapTab, routeId?: string): string {
  if (tab === 'journal') return '/map';
  if (tab === 'planner') return '/map?tab=planner';
  return routeId ? `/map?tab=active&route=${routeId}` : '/map?tab=active';
}

export default function MapPageTabs({
  posts,
  trailGeoJsons,
  defaultCenter,
  defaultZoom,
}: MapPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const routeParam = searchParams.get('route');
  const [activeTab, setActiveTab] = useState<MapTab>(() => tabFromParam(tabParam));

  useEffect(() => {
    setActiveTab(tabFromParam(tabParam));
  }, [tabParam]);

  const switchTab = useCallback(
    (tab: MapTab, routeId?: string) => {
      setActiveTab(tab);
      router.replace(tabUrl(tab, routeId), { scroll: false });
    },
    [router],
  );

  const handleRouteApproved = useCallback(
    (routeId: string) => {
      switchTab('active', routeId);
    },
    [switchTab],
  );

  const copy = TAB_COPY[activeTab];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="border-b border-stone-200 bg-white px-4 py-3 shrink-0">
        <h1 className="text-lg font-bold text-stone-900">Trail Map</h1>
        <p className="text-sm text-stone-500 mb-3">{copy.description}</p>
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1 w-fit"
          role="tablist"
          aria-label="Map views"
        >
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
        {activeTab === 'journal' && (
          <MapView
            posts={posts}
            trailGeoJsons={trailGeoJsons}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
          />
        )}
        {activeTab === 'planner' && (
          <RoutePlanner
            defaultCenter={defaultCenter}
            onRouteApproved={handleRouteApproved}
          />
        )}
        {activeTab === 'active' && (
          <MyCurrentRoutes defaultCenter={defaultCenter} initialRouteId={routeParam} />
        )}
      </div>
    </div>
  );
}
