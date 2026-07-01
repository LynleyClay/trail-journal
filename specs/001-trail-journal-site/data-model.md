# Data Model: Trail Journal — Personal Hiking Blog

**Feature**: `001-trail-journal-site`
**Date**: 2026-07-01

All persistent data lives as files in the repository. There is no runtime database.

---

## File: `content/data/posts.json`

Single source of truth for all post and photo metadata. The file is a JSON array of
`Post` objects. An empty site starts with an empty array `[]`.

### Post Object

```ts
type Trail = 'PCT' | 'CDT' | 'AT';

interface Photo {
  filename: string;      // e.g. "photo-001.jpg" — relative to public/photos/[slug]/
  caption?: string;      // optional display caption
  lat?: number;          // decimal degrees, positive = N, negative = S
  lng?: number;          // decimal degrees, positive = E, negative = W
}

interface Post {
  id: string;            // same as slug; unique, URL-safe
  slug: string;          // URL segment: /posts/[slug]
  title: string;         // display name of the hike
  date: string;          // ISO 8601 date: "YYYY-MM-DD" (date hiked, not published)
  excerpt: string;       // short summary shown on post cards; plain text, no Markdown
  coverPhoto: string;    // filename of the cover photo, e.g. "cover.jpg"
                         // references public/photos/[slug]/[coverPhoto]
  trail?: Trail;         // which long trail this hike is on, if any
  published: boolean;    // false = draft; only published posts appear on public pages
  photos: Photo[];       // ordered list of all photos for this post
}
```

### Example

```json
[
  {
    "id": "cascade-loops-june-2026",
    "slug": "cascade-loops-june-2026",
    "title": "Cascade Loops",
    "date": "2026-06-15",
    "excerpt": "Three days of alpine lakes and ridge walks in the North Cascades.",
    "coverPhoto": "cover.jpg",
    "trail": "PCT",
    "published": true,
    "photos": [
      {
        "filename": "cover.jpg",
        "caption": "Morning light on the ridge",
        "lat": 48.7231,
        "lng": -121.4563
      },
      {
        "filename": "photo-001.jpg",
        "lat": 48.7198,
        "lng": -121.4521
      },
      {
        "filename": "photo-002.jpg",
        "caption": "Camp at Glacier Lake"
      }
    ]
  }
]
```

### Validation Rules

- `id` and `slug` MUST be identical, URL-safe (lowercase letters, digits, hyphens
  only), and unique across all posts.
- `date` MUST match `YYYY-MM-DD` format.
- `coverPhoto` MUST reference a filename that exists in `photos[]`.
- `lat` MUST be in the range [-90, 90]; `lng` MUST be in the range [-180, 180].
- `excerpt` MUST be plain text (no Markdown, no HTML).
- If both `lat` and `lng` are present, both MUST be valid numbers.

---

## File: `content/posts/[slug].md`

One Markdown file per post. The filename matches `slug` exactly (e.g.,
`cascade-loops-june-2026.md`). Contains only the long-form story body — no
frontmatter, no metadata. All metadata lives in `posts.json`.

---

## Directory: `public/photos/[slug]/`

One directory per post, named by slug. Contains all image files referenced in the
post's `photos[]` array, including the cover photo. Files are served by Next.js
static file serving at `/photos/[slug]/[filename]`.

**Supported formats**: JPEG, PNG, WebP. HEIC files should be converted before upload.

---

## File: `content/config.json`

Site-level configuration. Edited manually or via a future admin settings page.

```ts
interface SiteConfig {
  name: string;        // e.g. "Trail Journal"
  tagline: string;     // e.g. "Notes from the trail"
  map: {
    defaultCenter: [number, number];  // [lat, lng]
    defaultZoom: number;              // Leaflet zoom level (1–18)
  };
}
```

### Example

```json
{
  "name": "Trail Journal",
  "tagline": "Notes from the trail",
  "map": {
    "defaultCenter": [47.5, -120.5],
    "defaultZoom": 7
  }
}
```

---

## Static Assets: `public/trails/`

Three pre-loaded GeoJSON files, one per long trail. Each is a GeoJSON
`FeatureCollection` containing one or more `LineString` or `MultiLineString`
features representing the trail corridor.

| File | Trail | Target size (simplified) |
|------|-------|--------------------------|
| `pct.geojson` | Pacific Crest Trail | ≤ 500 KB |
| `cdt.geojson` | Continental Divide Trail | ≤ 500 KB |
| `at.geojson` | Appalachian Trail | ≤ 500 KB |

Sourced from public open-data repositories (OSM exports, pct-data GitHub org, etc.)
and simplified with Mapshaper or equivalent at 0.001-degree tolerance before commit.

---

## Slug Generation Rules

1. Start with the post title, lowercase, replace spaces with hyphens, strip
   non-alphanumeric characters except hyphens.
2. Append the year and month from the `date` field: `[title-slug]-[YYYY-MM]`.
3. Truncate to 80 characters maximum.
4. Check `posts.json` for uniqueness. If collision, append `-2`, `-3`, etc.

**Example**: title "Cascade Loops", date "2026-06-15" → `cascade-loops-2026-06`.
