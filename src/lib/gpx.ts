// Parses a GPX file's track/route points into [lat, lng] pairs (matching
// Leaflet's coordinate order directly, so no conversion is needed to render
// it as a Polyline). Runs client-side via the browser's built-in DOMParser.

export class GpxParseError extends Error {}

export function parseGpx(xmlText: string): [number, number][] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new GpxParseError('That file is not valid GPX/XML.');
  }

  const points: [number, number][] = [];
  const pointEls = doc.querySelectorAll('trkpt, rtept');
  pointEls.forEach((el) => {
    const lat = parseFloat(el.getAttribute('lat') ?? '');
    const lng = parseFloat(el.getAttribute('lon') ?? '');
    if (!isNaN(lat) && !isNaN(lng)) points.push([lat, lng]);
  });

  if (points.length === 0) {
    throw new GpxParseError('No track points found in that GPX file.');
  }

  return points;
}

function perpendicularDistance(
  point: [number, number],
  start: [number, number],
  end: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(x - projX, y - projY);
}

// Ramer-Douglas-Peucker simplification, same approach used for the long
// trail reference lines — keeps point counts reasonable while preserving
// the route's shape. Default tolerance (~5.5m) suits a single hike's track,
// which needs more fidelity than a whole-country reference line.
export function simplifyRoute(points: [number, number][], epsilon = 0.00005): [number, number][] {
  if (points.length < 3) return points;

  const start = points[0]!;
  const end = points[points.length - 1]!;
  let maxDist = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRoute(points.slice(0, index + 1), epsilon);
    const right = simplifyRoute(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}
