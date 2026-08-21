export type CompletedTrailPath = {
  id: string;
  name: string;
  path: [number, number][];
};

export function toCompletedTrailPath(route: {
  id: string;
  name: string;
  status: string;
  waypoints: { lat: number; lng: number }[];
}): CompletedTrailPath | null {
  if (route.status !== 'completed' || route.waypoints.length < 2) return null;
  return {
    id: route.id,
    name: route.name,
    path: route.waypoints.map((w) => [w.lat, w.lng]),
  };
}

export function completedTrailPathsFromRoutes(
  routes: Array<{
    id: string;
    name: string;
    status: string;
    waypoints: { lat: number; lng: number }[];
  }>,
): CompletedTrailPath[] {
  return routes
    .map(toCompletedTrailPath)
    .filter((path): path is CompletedTrailPath => path != null);
}

export function isCurrentRoute(status: string): boolean {
  return status !== 'completed';
}
