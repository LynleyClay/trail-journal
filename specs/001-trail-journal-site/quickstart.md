# Quickstart & Validation Guide: Trail Journal — Personal Hiking Blog

**Feature**: `001-trail-journal-site`
**Date**: 2026-07-01

This guide describes how to set up a local development environment and validate that
each user story works end-to-end. It is a run guide, not an implementation tutorial —
it assumes the feature has been implemented per `plan.md` and `tasks.md`.

---

## Prerequisites

- Node.js 20 LTS (`node --version` shows `v20.x.x`)
- npm 10+
- Git

---

## Initial Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/trail-journal.git
cd trail-journal

# 2. Install dependencies
npm install

# 3. Verify TypeScript compiles with no errors
npm run typecheck

# 4. Verify linting passes
npm run lint

# 5. Run the test suite (all tests should pass)
npm test

# 6. Start the dev server
npm run dev
# → http://localhost:3000
```

### One-time content setup

```bash
# Create the content directory structure
mkdir -p content/posts content/data public/photos public/trails

# Initialise empty posts list
echo '[]' > content/data/posts.json

# Add site config
cat > content/config.json << 'EOF'
{
  "name": "Trail Journal",
  "tagline": "Notes from the trail",
  "map": {
    "defaultCenter": [47.5, -120.5],
    "defaultZoom": 7
  }
}
EOF

# Add simplified GeoJSON files for PCT, CDT, AT to public/trails/
# (Source and simplify these separately — see research.md Decision 6)
# public/trails/pct.geojson
# public/trails/cdt.geojson
# public/trails/at.geojson
```

---

## Validation Scenarios

### US1 — Home Page: Browse Recent Trip Reports

**Setup**: Ensure `content/data/posts.json` contains at least one published post and
one draft post. A cover photo must exist at `public/photos/[slug]/[coverPhoto]`.

**Steps**:
1. Open http://localhost:3000
2. Verify the site name ("Trail Journal") and tagline appear in the header.
3. Verify the published post appears as a card with: cover photo, trail name, date,
   and excerpt.
4. Verify the draft post does NOT appear in the list.
5. Verify cards are ordered newest-first when multiple published posts exist.
6. Verify a link to the Map page is present and navigates to `/map`.
7. Resize browser to 375px width — verify no horizontal scroll and all content is
   readable.

**Expected outcome**: Published posts appear; drafts are hidden; layout is usable at
mobile width.

---

### US2 — Trip Report: Read a Full Post

**Setup**: Published post with at least two photos, one with GPS coordinates, tagged
to a trail (e.g., PCT).

**Steps**:
1. Click a post card on the home page (or navigate directly to `/posts/[slug]`).
2. Verify trail name and date appear at the top.
3. Verify a full-width cover photo loads without error.
4. Verify the story body renders as formatted HTML (paragraphs, headings, etc.).
5. Verify the photo gallery shows all photos with captions where present.
6. Verify the mini-map appears and shows: the PCT trail line and a marker for the
   GPS-tagged photo.
7. Navigate to a post with no GPS photos and no trail tag — verify the mini-map
   section is absent.
8. Resize to 375px — verify cover photo, gallery, and mini-map are all usable.

**Expected outcome**: All content sections render; mini-map appears only when
relevant; mobile layout is correct.

---

### US3 — Map Page: Explore Hikes

**Setup**: Two published posts; at least one post has photos with GPS coordinates.
Trail GeoJSON files present in `public/trails/`.

**Steps**:
1. Navigate to http://localhost:3000/map
2. Verify the map loads centred on the configured region.
3. Verify one post marker (larger) appears per published post.
4. Click a post marker — verify popup shows: trail name, date, thumbnail, link to
   full post.
5. Click the link in the popup — verify it navigates to the correct trip report.
6. Verify smaller photo markers appear for photos with GPS coordinates.
7. Click a photo marker — verify the lightbox opens with the photo.
8. Press Escape or click outside the lightbox — verify the map is still interactive.
9. Verify PCT, CDT, and AT trail lines are visible as overlays on the map.

**Expected outcome**: All markers, popups, and trail lines render; lightbox opens and
closes cleanly; map remains functional after interactions.

---

### US4 — Admin: Create and Publish a New Post

**Setup**: Dev server running on localhost. No posts exist (or start from a clean
state).

**Steps**:
1. Navigate to http://localhost:3000/admin/new — verify the form loads.
2. Attempt to access the same URL from a different device or public IP — verify HTTP
   403 is returned (or the connection is refused).
3. Fill in all form fields: trail name, date, excerpt, markdown body, trail selector
   (PCT), cover photo upload.
4. Upload two photos:
   - One JPEG with GPS EXIF data — verify lat/lng fields are auto-populated.
   - One JPEG without GPS data — verify lat/lng fields remain empty.
5. Add a caption to one photo.
6. Click "Save as Draft" — verify the post does NOT appear at `/` or `/map`.
7. Navigate back to `/admin/new` or an edit page, open the draft, and click "Publish".
8. Navigate to `/` — verify the newly published post appears as a card.
9. Navigate to `/posts/[slug]` — verify all uploaded content is visible.
10. Navigate to `/map` — verify the new post marker appears.

**Expected outcome**: Draft is invisible on public pages; publish makes it visible
everywhere; EXIF GPS is auto-populated where available.

---

## Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# Type checking only
npm run typecheck

# Linting
npm run lint
```

All tests MUST pass before any implementation task is considered complete.
Refer to `tasks.md` for the required test files and their locations.

---

## Deployment Verification (Vercel)

After pushing to GitHub and Vercel auto-deploying:

1. Open the public Vercel URL.
2. Verify the home page loads and shows published posts.
3. Verify the map page loads and markers appear.
4. Verify a trip report renders correctly.
5. Attempt to access `/admin/new` on the Vercel URL — verify HTTP 403.
6. Attempt to POST to `/api/posts` on the Vercel URL — verify HTTP 403.

**Expected outcome**: Public pages work; admin and API routes are inaccessible from
the public URL.
