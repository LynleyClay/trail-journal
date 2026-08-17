import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchPlaces } from '@/lib/geocode';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchPlaces', () => {
  it('returns empty array for short queries without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchPlaces('a')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps nominatim results to geocode rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            place_id: 42,
            name: 'Springer Mountain',
            display_name: 'Springer Mountain, Fannin County, Georgia, USA',
            lat: '34.6268',
            lon: '-84.1938',
            type: 'peak',
          },
        ],
      }),
    );

    const results = await searchPlaces('Springer Mountain');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      placeId: 42,
      name: 'Springer Mountain',
      lat: 34.6268,
      lng: -84.1938,
    });
  });
});
