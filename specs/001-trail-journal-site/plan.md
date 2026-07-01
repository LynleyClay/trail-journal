# Implementation Plan: Trail Journal — Personal Hiking Blog

**Branch**: `001-trail-journal-site` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-trail-journal-site/spec.md`

## Summary

Build a four-page personal hiking blog (Home, Map, Trip Report, Admin/New Post) using
Next.js 14 App Router with TypeScript, Tailwind CSS, and Leaflet.js for interactive
maps. Content is stored as Markdown files and a JSON metadata file directly in the
repository — no database required. Photos live in `public/photos/`. The site deploys
to Vercel via GitHub; the admin form is a local-dev-only tool that writes files to
disk and is inaccessible on Vercel (read-only filesystem enforces the localhost
constraint automatically, backed by Next.js middleware as an explicit gate).

## Technical Context

**Language/Version**: TypeScript 5.x, `strict: true`, `noUncheckedIndexedAccess: true`

**Primary Dependencies**:
- `next` 14+ (App Router)
- `react` / `react-dom` 18+
- `tailwindcss` + `autoprefixer` + `postcss`
- `react-leaflet` + `leaflet` (interactive maps, client-side only)
- `react-markdown` + `remark-gfm` (Markdown rendering on trip report pages)
- `exifr` (GPS EXIF extraction from photos in the browser)
- `@uiw/react-md-editor` (Markdown editor in admin form)
- `vitest` + `@testing-library/react` + `@testing-library/user-event` (testing)

**Storage**:
- Post metadata + photo metadata: `content/data/posts.json`
- Post body text: `content/posts/[slug].md`
- Uploaded photos: `public/photos/[slug]/`
- Trail GeoJSON (PCT, CDT, AT): `public/trails/`
- Site config (name, tagline, map center): `content/config.json`

**Testing**: Vitest + React Testing Library (unit and integration); tests in `tests/`
mirroring `src/`

**Target Platform**: Node.js 20 LTS (local dev); Vercel Edge/Serverless (deployment)

**Project Type**: Web application (SSR + static generation via Next.js)

**Performance Goals**: Home page and Map page interactive within 4 seconds on 4G;
Lighthouse performance score ≥ 80 on mobile

**Constraints**:
- No paid services (Leaflet + OpenStreetMap tiles are free; Vercel free tier)
- Admin routes inaccessible outside localhost; file-write API routes will fail on
  Vercel by design (read-only FS) — middleware provides an explicit 403 as a
  defence-in-depth measure
- No per-hike GPX routes; trail display uses static GeoJSON for PCT/CDT/AT only
- Mobile-responsive at 375px minimum viewport width

**Scale/Scope**: Single author, personal use; ~50–200 posts over the lifetime of the
site; ~10 photos per post on average

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First (TDD) | ✅ GATE | Test files MUST be written and confirmed failing before any implementation task begins. Tests live in `tests/` mirroring `src/`. |
| II. Data Integrity | ✅ | File writes use atomic patterns (write to temp path, rename); `posts.json` validated with Zod schemas before write; no silent overwrites — slug collision appends `-2`, `-3`, etc. |
| III. TypeScript Strict Mode | ✅ | `tsconfig.json` MUST include `"strict": true` and `"noUncheckedIndexedAccess": true`. |
| IV. Simplicity | ✅ | No database justified: single-author blog with file-based content is the simplest architecture and matches the Vercel + GitHub deployment model. No abstractions introduced until 3+ concrete instances exist. |
| V. Privacy by Default | ✅ | No analytics, no third-party tracking. GPS coordinates in `posts.json` are not logged; no sensitive fields appear in server logs. |

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-trail-journal-site/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-routes.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
content/
├── config.json                     # Site name, tagline, map default center + zoom
├── data/
│   └── posts.json                  # All post metadata + photo arrays (source of truth)
└── posts/
    └── [slug].md                   # Markdown body per post

public/
├── photos/
│   └── [slug]/                     # All photos for a post
│       ├── cover.jpg
│       └── photo-001.jpg
└── trails/
    ├── pct.geojson                 # Simplified PCT line (static asset)
    ├── cdt.geojson                 # Simplified CDT line
    └── at.geojson                  # Simplified AT line

src/
├── app/
│   ├── layout.tsx                  # Root layout (Tailwind, font)
│   ├── page.tsx                    # Home (/)
│   ├── map/
│   │   └── page.tsx                # Map (/map) — SSR shell, map loads client-side
│   ├── posts/
│   │   └── [slug]/
│   │       └── page.tsx            # Trip Report (/posts/[slug])
│   ├── admin/
│   │   └── new/
│   │       └── page.tsx            # Admin new post form (/admin/new)
│   └── api/
│       ├── posts/
│       │   └── route.ts            # POST: create/update post (localhost only)
│       └── upload/
│           └── route.ts            # POST: save photo file (localhost only)
├── components/
│   ├── PostCard.tsx                # Home page post card
│   ├── PhotoGallery.tsx            # Trip report photo grid
│   ├── Lightbox.tsx                # Full-screen photo overlay
│   ├── MapView.tsx                 # Full-page Leaflet map (Client Component)
│   ├── MiniMap.tsx                 # Per-post Leaflet mini-map (Client Component)
│   └── MarkdownEditor.tsx          # Admin markdown editor (Client Component)
├── lib/
│   ├── posts.ts                    # Read posts.json; write post files (admin only)
│   ├── slug.ts                     # Slug generation + collision resolution
│   └── config.ts                   # Read content/config.json
└── middleware.ts                   # Block non-localhost /admin/* and /api/* routes

tests/
├── unit/
│   ├── lib/
│   │   ├── posts.test.ts
│   │   └── slug.test.ts
│   └── components/
│       ├── PostCard.test.tsx
│       └── Lightbox.test.tsx
└── integration/
    └── api/
        └── posts.test.ts
```

**Structure Decision**: Single project layout. Next.js App Router provides built-in
routing for all four pages. Content (markdown + JSON) lives in `content/` at the repo
root, separate from `src/` code. Public static assets (photos, trail GeoJSON) are
in `public/`. This matches Next.js conventions and deploys cleanly to Vercel.

## Complexity Tracking

> No constitution violations — this table is intentionally empty.
