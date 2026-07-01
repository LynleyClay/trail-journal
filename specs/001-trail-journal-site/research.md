# Research: Trail Journal — Personal Hiking Blog

**Feature**: `001-trail-journal-site`
**Date**: 2026-07-01

---

## Decision 1: Leaflet.js + Next.js App Router Integration

**Decision**: Use `react-leaflet` v4 with `next/dynamic` and `{ ssr: false }` to
load all map components exclusively on the client.

**Rationale**: Leaflet requires `window` and `document` at import time; these globals
do not exist in the Next.js server-side render pass. Wrapping map components in
`next/dynamic` with `ssr: false` defers their import to the browser entirely,
preventing the "window is not defined" runtime error. `react-leaflet` v4 provides
React components (`<MapContainer>`, `<TileLayer>`, `<Marker>`, `<Popup>`,
`<GeoJSON>`) that map cleanly to Leaflet's imperative API.

**Pattern**:
```ts
// In page.tsx (Server Component) — map page or trip report page
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });
```

```ts
// In MapView.tsx (Client Component)
'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
```

**Tile provider**: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
Free, no API key, no rate-limit concerns for personal use. Attribution required
(included via `<TileLayer attribution="© OpenStreetMap contributors" />`).

**Default marker icon fix**: Next.js webpack breaks Leaflet's default PNG icon paths.
Fix once in a shared `leaflet-config.ts` that patches `L.Icon.Default.prototype._getIconUrl`
and sets `iconUrl`/`shadowUrl` manually using the `/` public path.

**GeoJSON trail overlays**: `react-leaflet` ships a `<GeoJSON>` component. Pass
trail data as props from the Server Component (read from `public/trails/*.geojson`
via `fs.readFileSync` in the server render) down to the Client Component.

**Alternatives considered**:
- Plain Leaflet (no React wrapper) — more manual imperative code; `react-leaflet`
  provides a cleaner component model with no meaningful downside.
- Mapbox GL JS — requires API key, violates "no paid services" constraint.
- MapLibre GL — viable free alternative but significantly more complex than Leaflet
  for simple marker/popup/GeoJSON use cases.

---

## Decision 2: GPS EXIF Extraction in the Browser

**Decision**: Use `exifr` (npm: `exifr`).

**Rationale**: `exifr` is the only actively maintained (2024) option with first-class
TypeScript types, full ES module support, and a one-liner GPS API that handles
degrees/minutes/seconds conversion automatically.

**Pattern**:
```ts
'use client';
import exifr from 'exifr';

async function extractGPS(file: File): Promise<{ lat: number; lng: number } | null> {
  const result = await exifr.gps(file); // { latitude, longitude } | undefined
  if (!result) return null;
  return { lat: result.latitude, lng: result.longitude };
}
```

**Key quirks**:
- `exifr.gps()` auto-converts DMS to decimal and applies hemisphere negation (S/W).
- HEIC photos from iOS require the full build (`exifr/dist/full.esm.mjs`); JPEG/PNG
  are covered by the default import.
- Always guard against `undefined` — screenshots and downloaded images often strip EXIF.

**Alternatives considered**:
- `piexifjs` — CommonJS only, no TypeScript types, stale since 2020, manual DMS math.
- `exif-js` — stale since 2019, returns raw DMS arrays requiring manual conversion.

---

## Decision 3: File-Based Content Storage

**Decision**: Store all content as flat files in the repository:
- `content/data/posts.json` — array of all post + photo metadata
- `content/posts/[slug].md` — Markdown body per post
- `public/photos/[slug]/` — photo image files
- `content/config.json` — site name, tagline, map default center + zoom

**Rationale**: Single-author personal blog; no concurrent writes; no query complexity.
A file-based approach eliminates a runtime dependency (SQLite/database), simplifies
Vercel deployment (static files are part of the build), and means the full content
history is tracked in git. Posts.json is the single source of truth for metadata.

**Atomic write pattern**: When the admin API writes `posts.json`, it uses a write-to-
temp-file + `fs.rename()` pattern to avoid partial-write corruption. The Markdown
body file is written atomically the same way.

**Alternatives considered**:
- SQLite + `better-sqlite3` — adds a runtime dependency, requires migration scripts,
  doesn't work on Vercel's read-only FS without additional config.
- PlanetScale / Supabase / Neon — paid or freemium, violates "no paid services"
  constraint for initial version.

---

## Decision 4: Admin Localhost Restriction

**Decision**: Next.js `middleware.ts` at the project root intercepts all requests to
`/admin/*` and `/api/*` routes; if the request does not originate from `127.0.0.1`
or `::1`, the middleware returns HTTP 403.

**Rationale**: The admin form must never be accessible from the public Vercel URL.
Vercel's read-only filesystem means API write routes would fail anyway, but an
explicit 403 provides defence-in-depth and gives the author a clear error if they
accidentally try to access the admin remotely.

**Pattern**:
```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.ip ?? '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '';
  if (!isLocalhost) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
```

---

## Decision 5: Markdown Rendering

**Decision**: `react-markdown` + `remark-gfm` for rendering post bodies on the
Trip Report page.

**Rationale**: `react-markdown` is a lightweight Server Component-compatible renderer.
`remark-gfm` adds GitHub-flavored Markdown support (tables, strikethrough, etc.).
No JavaScript ships to the client for rendered posts — pure HTML output.

**Admin editor**: `@uiw/react-md-editor` for the admin form's Markdown editor.
Provides a split-pane write/preview experience in a single focused package. Only
loaded on the client, only in the admin form.

---

## Decision 6: Trail GeoJSON Data

**Decision**: Source simplified GeoJSON files for PCT, CDT, and AT from publicly
available open-data repositories (e.g., the `pct-data` GitHub org for PCT, OpenStreetMap
exports for CDT and AT). Simplify geometries to reduce file size before committing
to the repo (target: ≤ 500 KB per trail file after simplification).

**Rationale**: Full-resolution trail GeoJSON files can be 50+ MB. Simplified versions
(using Mapshaper or a similar tool with Douglas-Peucker at a 0.001-degree tolerance)
produce files under 500 KB that render acceptably in Leaflet at typical zoom levels.

**One-time task**: Sourcing, simplifying, and committing these three files is a setup
task outside the regular feature implementation flow.
