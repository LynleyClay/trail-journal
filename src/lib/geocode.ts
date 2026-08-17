export type GeocodeResult = {
  placeId: number;
  name: string;
  label: string;
  lat: number;
  lng: number;
  type?: string;
};

const USER_AGENT = 'TrailJournal/1.0 (https://trail-journal-inky.vercel.app)';

function shortLabel(displayName: string, name: string): string {
  if (displayName.length <= 60) return displayName;
  const parts = displayName.split(',').map((p) => p.trim());
  const head = [name, ...parts.slice(1, 3)].filter(Boolean).join(', ');
  return head.length <= 60 ? head : `${name}, ${parts[1] ?? ''}`.trim();
}

export async function searchPlaces(query: string, limit = 8): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?format=json` +
    `&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=0`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{
    place_id: number;
    name?: string;
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
    class?: string;
  }>;

  return rows.flatMap((row) => {
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return [];
    const name = row.name?.trim() || row.display_name.split(',')[0]?.trim() || 'Place';
    return [
      {
        placeId: row.place_id,
        name,
        label: shortLabel(row.display_name, name),
        lat,
        lng,
        type: row.type ?? row.class,
      },
    ];
  });
}
