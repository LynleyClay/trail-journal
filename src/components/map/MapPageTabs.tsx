'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection } from 'geojson';
import type { Post } from '@/lib/posts';
import MapView from '@/components/MapViewLoader';
import RoutePlanner from '@/components/planner/RoutePlannerLoader';
import MyCurrentRoutes from '@/components/active/MyCurrentRoutesLoader';

type MapTab = 'journal' | 'friends' | 'planner' | 'active';

type MapPageTabsProps = {
  myPosts: Post[];
  friendsPosts: Post[];
  trailGeoJsons: Record<string, FeatureCollection>;
  defaultCenter: [number, number];
  defaultZoom: number;
  isLoggedIn: boolean;
};

const TAB_COPY: Record<MapTab, { label: string; description: string }> = {
  journal: {
    label: 'My Trails',
    description: "Trails I've hiked, with photos and journal entries pinned to where they happened.",
  },
  friends: {
    label: "Friends' Trails",
    description: 'Public journal entries from hikers you follow.',
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
  if (tab === 'friends') return 'friends';
  if (tab === 'planner') return 'planner';
  if (tab === 'active') return 'active';
  return 'journal';
}

function tabUrl(tab: MapTab, routeId?: string): string {
  if (tab === 'journal') return '/map';
  if (tab === 'friends') return '/map?tab=friends';
  if (tab === 'planner') return '/map?tab=planner';
  return routeId ? `/map?tab=active&route=${routeId}` : '/map?tab=active';
}

export default function MapPageTabs({
  myPosts,
  friendsPosts,
  trailGeoJsons,
  defaultCenter,
  defaultZoom,
  isLoggedIn,
}: MapPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const routeParam = searchParams.get('route');
  const [activeTab, setActiveTab] = useState<MapTab>(() => tabFromParam(tabParam));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true);
  const canCollapseMenu = activeTab === 'planner' || activeTab === 'active';

  useEffect(() => {
    setActiveTab(tabFromParam(tabParam));
  }, [tabParam]);

  useEffect(() => {
    setMobileMenuOpen(true);
  }, [activeTab]);

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
  const journalPosts = activeTab === 'friends' ? friendsPosts : myPosts;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div
        className={`border-b border-stone-200 bg-white px-4 py-3 shrink-0 ${
          canCollapseMenu && !mobileMenuOpen ? 'hidden lg:block' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-stone-900">Trail Map</h1>
            <p className="text-sm text-stone-500 mb-3">{copy.description}</p>
          </div>
          {canCollapseMenu && (
            <button
              type="button"
              className="lg:hidden shrink-0 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
              aria-expanded={mobileMenuOpen}
            >
              See map
            </button>
          )}
        </div>
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
        {(activeTab === 'journal' || activeTab === 'friends') && (
          <>
            {activeTab === 'friends' && !isLoggedIn ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-stone-500 text-sm">
                <p>
                  Create an account and follow other hikers to see their trails here.{' '}
                  <Link href="/signup?returnTo=/map?tab=friends" className="text-emerald-700 hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            ) : activeTab === 'friends' && friendsPosts.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-stone-500 text-sm">
                Follow hikers from their public profiles to see their entries here.
              </div>
            ) : (
              <MapView
                posts={journalPosts}
                trailGeoJsons={trailGeoJsons}
                defaultCenter={defaultCenter}
                defaultZoom={defaultZoom}
              />
            )}
          </>
        )}
        {activeTab === 'planner' && (
          <RoutePlanner
            defaultCenter={defaultCenter}
            onRouteApproved={handleRouteApproved}
            mobileMenuOpen={mobileMenuOpen}
            onShowMobileMenu={() => setMobileMenuOpen(true)}
          />
        )}
        {activeTab === 'active' && (
          <MyCurrentRoutes
            defaultCenter={defaultCenter}
            initialRouteId={routeParam}
            mobileMenuOpen={mobileMenuOpen}
            onShowMobileMenu={() => setMobileMenuOpen(true)}
          />
        )}
      </div>
    </div>
  );
}
