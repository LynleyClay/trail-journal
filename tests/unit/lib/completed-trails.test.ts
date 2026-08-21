import { describe, it, expect } from 'vitest';
import { completedTrailPathsFromRoutes, isCurrentRoute } from '@/lib/completed-trails';

describe('completed trails', () => {
  const waypoints = [
    { lat: 35, lng: -83 },
    { lat: 35.1, lng: -83.1 },
  ];

  it('turns a completed current route into a map path', () => {
    const paths = completedTrailPathsFromRoutes([
      { id: 'route-1', name: 'Smokies', status: 'completed', waypoints },
      { id: 'route-2', name: 'Still hiking', status: 'active', waypoints },
    ]);
    expect(paths).toEqual([
      {
        id: 'route-1',
        name: 'Smokies',
        path: [
          [35, -83],
          [35.1, -83.1],
        ],
      },
    ]);
  });

  it('keeps in-progress routes on Current Routes', () => {
    expect(isCurrentRoute('active')).toBe(true);
    expect(isCurrentRoute('completed')).toBe(false);
  });
});
