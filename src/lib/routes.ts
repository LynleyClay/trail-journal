export type Waypoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  note?: string;
};

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function routeStats(waypoints: Waypoint[]) {
  let miles = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    if (prev && curr) miles += haversineMiles(prev, curr);
  }
  return {
    miles,
    segments: Math.max(0, waypoints.length - 1),
    stops: waypoints.length,
  };
}

export function uid(prefix = 'wp') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
