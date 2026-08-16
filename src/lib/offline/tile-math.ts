export type TileCoord = { z: number; x: number; y: number };

export type LatLngBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function lngToTileX(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** zoom);
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom);
}

export function tileUrl(z: number, x: number, y: number): string {
  const sub = ['a', 'b', 'c'][(x + y) % 3]!;
  return `https://${sub}.tile.opentopomap.org/${z}/${x}/${y}.png`;
}

export function enumerateTiles(bounds: LatLngBounds, minZoom: number, maxZoom: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lngToTileX(bounds.west, z);
    const xMax = lngToTileX(bounds.east, z);
    const yMin = latToTileY(bounds.north, z);
    const yMax = latToTileY(bounds.south, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  return tiles;
}

/** ~0.015° ≈ 1 mi padding around the route corridor */
export function boundsFromPoints(
  points: { lat: number; lng: number }[],
  paddingDeg = 0.015,
): LatLngBounds {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const p of points) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  return {
    north: north + paddingDeg,
    south: south - paddingDeg,
    east: east + paddingDeg,
    west: west - paddingDeg,
  };
}

export const OFFLINE_MIN_ZOOM = 10;
export const OFFLINE_MAX_ZOOM = 13;
export const MAX_OFFLINE_TILES = 2500;
