'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection } from 'geojson';
import type { Post } from '@/lib/posts';
import MapView from '@/components/MapViewLoader';
import RoutePlanner from '@/components/planner/RoutePlannerLoader';
import MyCurrentRoutes from '@/components/active/MyCurrentRoutesLoader';
import { ShowMapMenuButton } from '@/components/map/ShowMapMenuButton';
import { TramilyHikerList, type TramilyHiker } from '@/components/profile/TramilyHikerList';
import type { CompletedTrailPath } from '@/lib/completed-trails';

type MapTab = 'journal' | 'friends' | 'planner' | 'active';

type MapPageTabsProps = {
  myPosts: Post[];
  friendsPosts: Post[];
  trailGeoJsons: Record<string, FeatureCollection>;
  completedRoutes?: CompletedTrailPath[];
  defaultCenter: [number, number];
  defaultZoom: number;
  isLoggedIn: boolean;
  ownerDisplayName: string;
  hikers: TramilyHiker[];
};

const TAB_COPY: Record<MapTab, { label: string; description: string }> = {
  journal: {
    label: 'My Trails',
    description: "Trails I've hiked, with photos and journal entries pinned to where they happened. Finish a current route to add it here.",
  },
  friends: {
    label: 'Tramily',
    description: 'Hikers in your tramily — trail family — and their journal entries on the map.',
  },
  planner: {
    label: 'Plan Routes',
    description: 'Stitch long trails together to plan future hikes.',
  },
  active: {
    label: 'My Current Routes',
    description: 'Approved routes with a climb profile, resupply towns, water, and live GPS.',
  },
};

function tabFromParam(tab: string | null): MapTab {
  if (tab === 'friends' || tab === 'tramily') return 'friends';
  if (tab === 'planner') return 'planner';
  if (tab === 'active') return 'active';
  return 'journal';
}

function signupHref(returnTo: string): string {
  return `/signup?returnTo=${encodeURIComponent(returnTo)}`;
}

function GuestPrompt({ returnTo, children }: { returnTo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 text-center text-stone-500 text-sm">
      <p>
        {children}{' '}
        <Link href={signupHref(returnTo)} className="text-emerald-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function tabUrl(tab: MapTab, routeId?: string): string {
  if (tab === 'journal') return '/map';
  if (tab === 'friends') return '/map?tab=tramily';
  if (tab === 'planner') return '/map?tab=planner';
  return routeId ? `/map?tab=active&route=${routeId}` : '/map?tab=active';
}

export default function MapPageTabs({
  myPosts,
  friendsPosts,
  trailGeoJsons,
  completedRoutes = [],
  defaultCenter,
  defaultZoom,
  isLoggedIn,
  ownerDisplayName,
  hikers = [],
}: MapPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const routeParam = searchParams.get('route');
  const [activeTab, setActiveTab] = useState<MapTab>(() => tabFromParam(tabParam));
  const canCollapseMenu = activeTab === 'planner' || activeTab === 'active' || activeTab === 'friends';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const tab = tabFromParam(tabParam);
    const phone = window.matchMedia('(max-width: 1023px)').matches;
    return !(phone && (tab === 'planner' || tab === 'active' || tab === 'friends'));
  });

  useEffect(() => {
    setActiveTab(tabFromParam(tabParam));
  }, [tabParam]);

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 1023px)').matches;
    if (phone && (activeTab === 'planner' || activeTab === 'active' || activeTab === 'friends')) {
      setMobileMenuOpen(false);
      return;
    }
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

  const journalPosts = activeTab === 'friends' ? friendsPosts : myPosts;
  const journalDescription = isLoggedIn
    ? TAB_COPY[activeTab].description
    : activeTab === 'journal'
      ? `${ownerDisplayName}'s trails, with photos and journal entries pinned to where they happened.`
      : TAB_COPY[activeTab].description;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {!isLoggedIn && (
        <div className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          You&apos;re looking at {ownerDisplayName}&apos;s public map.{' '}
          <Link href={signupHref('/map')} className="font-medium underline hover:text-emerald-700">
            Create an account
          </Link>{' '}
          to add your own routes and posts.
        </div>
      )}
      <div
        className={`border-b border-stone-200 bg-white px-4 py-3 shrink-0 ${
          canCollapseMenu && !mobileMenuOpen ? 'hidden lg:block' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-stone-900">Trail Map</h1>
            <p className="text-sm text-stone-500 mb-3">{journalDescription}</p>
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
              <GuestPrompt returnTo="/map?tab=tramily">
                Create an account to add hikers as tramily and see their trails here.
              </GuestPrompt>
            ) : activeTab === 'friends' ? (
              <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
                <aside
                  className={`w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-50 p-4 flex flex-col gap-3 min-h-0 max-h-[40vh] lg:max-h-none overflow-y-auto ${
                    mobileMenuOpen ? '' : 'hidden lg:flex'
                  }`}
                >
                  <p className="text-sm font-medium text-stone-900">Your tramily</p>
                  <p className="text-sm text-stone-600">
                    Add hikers as tramily to pin their journal on this map.
                  </p>
                  <TramilyHikerList hikers={hikers} isLoggedIn={isLoggedIn} />
                </aside>
                <section className={`flex-1 relative min-h-0 ${mobileMenuOpen ? 'min-h-[280px] lg:min-h-0' : ''}`}>
                  {!mobileMenuOpen && (
                    <ShowMapMenuButton onClick={() => setMobileMenuOpen(true)} />
                  )}
                  {friendsPosts.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-stone-500 text-sm">
                      {hikers.some((hiker) => hiker.inTramily)
                        ? 'No journal entries from your tramily yet.'
                        : 'Add hikers as tramily to see their trails on the map.'}
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <MapView
                        posts={friendsPosts}
                        trailGeoJsons={trailGeoJsons}
                        defaultCenter={defaultCenter}
                        defaultZoom={defaultZoom}
                      />
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="flex-1 relative min-h-0">
                <div className="absolute inset-0">
                  <MapView
                    posts={journalPosts}
                    trailGeoJsons={trailGeoJsons}
                    completedRoutes={completedRoutes}
                    defaultCenter={defaultCenter}
                    defaultZoom={defaultZoom}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === 'planner' &&
          (isLoggedIn ? (
            <RoutePlanner
              defaultCenter={defaultCenter}
              onRouteApproved={handleRouteApproved}
              mobileMenuOpen={mobileMenuOpen}
              onShowMobileMenu={() => setMobileMenuOpen(true)}
            />
          ) : (
            <GuestPrompt returnTo="/map?tab=planner">
              Create an account to plan routes and pin them on your own map.
            </GuestPrompt>
          ))}
        {activeTab === 'active' && (
          <MyCurrentRoutes
            defaultCenter={defaultCenter}
            initialRouteId={routeParam}
            mobileMenuOpen={mobileMenuOpen}
            onShowMobileMenu={() => setMobileMenuOpen(true)}
            onHideMobileMenu={() => setMobileMenuOpen(false)}
            isLoggedIn={isLoggedIn}
            ownerDisplayName={ownerDisplayName}
          />
        )}
      </div>
    </div>
  );
}
