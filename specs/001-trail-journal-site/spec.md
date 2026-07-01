# Feature Specification: Trail Journal — Personal Hiking Blog

**Feature Branch**: `001-trail-journal-site`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: Build a personal hiking blog called Trail Journal with four pages (Home, Map, Trip Report, New Post), photo GPS support, and a localhost-only admin form.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Recent Trip Reports (Priority: P1)

A reader visits the home page and scans the list of published hike reports to find something interesting to read.

**Why this priority**: The home page is the primary entry point and the most critical surface for reader engagement. Without it nothing else matters.

**Independent Test**: Load the home page; verify the site name, tagline, and at least one published post card (cover photo, trail name, date, excerpt) appear. Navigate to a post from the card link. This can be validated with a single seeded post and no other pages built.

**Acceptance Scenarios**:

1. **Given** the site has published posts, **When** a reader loads `/`, **Then** they see the site name "Trail Journal", the tagline, and a list of post cards ordered newest-first.
2. **Given** a post card is visible, **When** the reader views it, **Then** it shows the cover photo, trail name, date hiked, and short excerpt.
3. **Given** the home page is loaded, **When** the reader looks for the map, **Then** they see a clearly labelled link to `/map`.
4. **Given** there are no published posts, **When** a reader loads `/`, **Then** they see a friendly empty-state message rather than a blank list.
5. **Given** the reader is on a mobile device (375px width), **When** they load the home page, **Then** the layout is fully usable with no horizontal scroll.

---

### User Story 2 — Read a Full Trip Report (Priority: P2)

A reader opens a trip report to read the full story, view photos, and see where the hike took place.

**Why this priority**: The trip report is the core content unit. After the home page it is the most important reader-facing surface.

**Independent Test**: Navigate to a published post's URL (`/posts/[slug]`); verify all content sections render correctly with a single seeded post containing at least two photos (one with GPS coordinates).

**Acceptance Scenarios**:

1. **Given** a published post exists, **When** a reader navigates to `/posts/[slug]`, **Then** they see the trail name, date hiked, full-width cover photo, and rendered story text.
2. **Given** the post has photos, **When** the reader scrolls to the photo gallery, **Then** all photos are displayed, each with its optional caption.
3. **Given** the post is tagged to a trail (PCT/CDT/AT) and has photos with GPS coordinates, **When** the page loads, **Then** a mini-map shows the pre-loaded static trail line with photo location pins.
4. **Given** the post has no GPS-tagged photos and no trail tag, **When** the reader views the page, **Then** the mini-map section is omitted rather than showing a blank map.
5. **Given** the reader is on a mobile device, **When** they view the trip report, **Then** the cover photo, gallery, and mini-map are all fully usable at 375px width.

---

### User Story 3 — Explore Hikes on the Map (Priority: P3)

A reader opens the map to get a geographic overview of all hikes and browse photos taken along the trails.

**Why this priority**: The map is a compelling discovery surface but is not the primary reading path; readers can find posts through the home page first.

**Independent Test**: Load `/map`; verify post markers appear for all published posts, clicking a marker shows the popup, and clicking a photo marker opens a lightbox. Testable with two published posts where at least one has GPS-tagged photos.

**Acceptance Scenarios**:

1. **Given** published posts exist, **When** a reader loads `/map`, **Then** an interactive map is displayed centered on the author's configured hiking region with one marker per published post.
2. **Given** a post marker is visible, **When** the reader clicks it, **Then** a popup appears showing the trail name, date, thumbnail, and a link to the full post.
3. **Given** a post has photos with GPS coordinates, **When** the reader views the map, **Then** smaller photo markers appear at each photo's GPS location.
4. **Given** a photo marker is visible, **When** the reader clicks it, **Then** the photo opens in a lightbox overlay.
5. **Given** the reader closes the lightbox or dismisses a popup, **When** they interact with the map, **Then** the map remains fully functional.
6. **Given** the pre-loaded PCT, CDT, and AT trail lines exist, **When** the map loads, **Then** the relevant trail lines are rendered as background reference overlays.

---

### User Story 4 — Create and Publish a New Post (Priority: P4)

The author creates a new trip report via the admin form, uploads photos, and publishes or saves as a draft.

**Why this priority**: Content creation is essential but blocked on the reader-facing pages being functional first, and the admin surface is localhost-only so reader impact is zero if it ships slightly later.

**Independent Test**: Access `/admin/new` from localhost; fill in all fields including uploading two photos; save as draft; verify the draft does not appear on the public home page; publish it; verify it now appears.

**Acceptance Scenarios**:

1. **Given** the author is on localhost, **When** they navigate to `/admin/new`, **Then** the new post form is displayed.
2. **Given** the author is on a non-localhost IP, **When** they attempt to access `/admin/new`, **Then** they receive a 403 or redirect, not the form.
3. **Given** the form is open, **When** the author fills in trail name, date, excerpt, story body, selects a trail (PCT/CDT/AT or none), selects a cover photo, and clicks "Save as Draft", **Then** the post is persisted with `published: false` and is not visible on the public home page or map.
4. **Given** a draft post exists, **When** the author publishes it, **Then** it appears on the home page and map immediately.
5. **Given** the author uploads a photo that contains GPS EXIF data, **When** the upload completes, **Then** the latitude and longitude fields for that photo are auto-populated from the EXIF data.
6. **Given** the author uploads a photo without GPS EXIF data, **When** the upload completes, **Then** the lat/lng fields are empty and the author can optionally enter them manually.
7. **Given** the author adds a photo, **When** they view the photo entry, **Then** they can enter an optional caption.
8. **Given** the author selects a trail (e.g., PCT), **When** they view the mini-map preview in the form, **Then** the pre-loaded PCT trail line is rendered as a reference.

---

### Edge Cases

- What happens when a post's cover photo file is missing from disk? The post card and trip report should show a placeholder image rather than a broken `<img>` tag.
- What happens when a post has no photos? The gallery section is omitted from the trip report; no photo markers appear on the map or mini-map.
- What happens when two posts have the same trail name on the same date? Slugs must be unique; auto-append a numeric suffix if a collision occurs.
- What happens when the author submits the form with required fields missing? Inline validation errors appear before any server request is made.
- What happens when an uploaded photo is not a valid image file? The upload is rejected with a clear error message.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST display the site name and tagline.
- **FR-002**: The home page MUST list all published posts ordered by date descending (newest first).
- **FR-003**: Each post card on the home page MUST show cover photo, trail name, date hiked, and short excerpt.
- **FR-004**: The home page MUST include a navigational link to the Map page.
- **FR-005**: The Map page MUST display an interactive map centered on a configurable default location (author's hiking region).
- **FR-006**: The Map page MUST render one post marker per published post.
- **FR-007**: Clicking a post marker MUST open a popup with trail name, date, thumbnail image, and a link to the full trip report.
- **FR-008**: The Map page MUST render photo markers at the GPS coordinates of any published post's photos that have lat/lng values.
- **FR-009**: Clicking a photo marker MUST open a lightbox displaying the full photo.
- **FR-010**: The Map page MUST render the pre-loaded PCT, CDT, and AT trail lines as reference overlays.
- **FR-011**: The Trip Report page MUST display trail name, date hiked, a full-width cover photo, and story text rendered from Markdown.
- **FR-012**: The Trip Report page MUST display a photo gallery containing all photos for the post, each with its optional caption.
- **FR-013**: The Trip Report page MUST display a mini-map when the post is tagged to a trail (PCT/CDT/AT) or has photos with GPS coordinates.
- **FR-014**: The mini-map MUST show the pre-loaded static trail line for the post's tagged trail (if any) and markers at each GPS-tagged photo's location.
- **FR-015**: The `/admin/new` route MUST be restricted to localhost requests; non-localhost requests MUST be rejected with HTTP 403.
- **FR-016**: The admin form MUST include fields for: trail name, date hiked, short excerpt, story body (with a Markdown editor), trail selector (PCT / CDT / AT / none), and cover photo selector.
- **FR-017**: The admin form MUST allow uploading one or more photos; each photo MUST allow an optional caption and optional lat/lng.
- **FR-018**: Photo upload MUST attempt to read GPS coordinates from EXIF data and pre-populate the lat/lng fields automatically.
- **FR-019**: The admin form MUST offer "Save as Draft" and "Publish" actions; drafts MUST NOT appear on public pages.
- **FR-020**: All four pages MUST be mobile-responsive and fully usable at a minimum viewport width of 375px.
- **FR-021**: Post slugs MUST be unique; the system MUST auto-resolve collisions by appending a numeric suffix.

### Key Entities

- **Post**: Represents a single trip report. Attributes: `id`, `title`, `slug`, `date` (date hiked), `excerpt` (short summary), `body` (Markdown source), `coverPhotoId` (FK to Photo), `trail` (enum: PCT | CDT | AT | null), `published` (boolean). A Post has zero or more Photos.
- **Photo**: Represents an image attached to a Post. Attributes: `id`, `postId` (FK to Post), `filename` (stored path), `caption` (optional text), `lat` (optional decimal), `lng` (optional decimal).
- **Trail Line**: Static GeoJSON data for PCT, CDT, and AT long-distance trails. Not stored in the dynamic data store; bundled as static assets.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can discover and open a full trip report in 2 or fewer clicks from the home page.
- **SC-002**: The home page and map load and are interactive within 4 seconds on a standard mobile connection (simulated 4G).
- **SC-003**: 100% of uploaded photos that contain GPS EXIF data have their lat/lng fields auto-populated without manual entry.
- **SC-004**: The author can create, upload photos for, and publish a new post in a single uninterrupted session without reloading the admin page.
- **SC-005**: All four pages pass a manual mobile usability check at 375px viewport width with no horizontal scrolling and all interactive elements reachable by touch.
- **SC-006**: A draft post is invisible on all public-facing pages (home, map, individual post URL returns 404) until explicitly published.

---

## Assumptions

- The application is a Next.js 14 App Router project with TypeScript and Tailwind CSS,
  deployed to Vercel via GitHub auto-deploy.
- Content is stored as files in the repository: post metadata and photo metadata in
  `content/data/posts.json`; post bodies as individual Markdown files in
  `content/posts/[slug].md`. There is no runtime database.
- Photos are stored in `public/photos/[slug]/` and served by Next.js static file serving.
- The map default center coordinates and zoom level are set in `content/config.json`;
  no UI for changing them is in scope.
- Trail line GeoJSON files for PCT, CDT, and AT are bundled as static assets in
  `public/trails/`; sourcing and simplifying those files is a one-time setup task
  outside the feature implementation.
- The "trail route" shown on the mini-map is the pre-loaded static trail line for the
  post's tagged trail. There is no per-hike GPX upload; individual hike locations are
  represented by photo GPS pins only.
- Interactive maps use Leaflet.js with react-leaflet; map components are Client
  Components loaded with `next/dynamic` and `{ ssr: false }` to avoid server-side
  rendering issues with Leaflet's browser globals.
- The admin form (/admin/new) runs as a local-dev-only tool. On Vercel, the
  read-only filesystem prevents file writes, and Next.js middleware returns HTTP 403
  for non-localhost requests as defence-in-depth.
- No image resizing or optimisation pipeline is in scope for v1; uploaded originals
  are served as-is.
- Out of scope: search/filter, tags, RSS feed, custom domain, public comments, user
  accounts, migration of any prior posts.
