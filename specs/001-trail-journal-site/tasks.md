---

description: "Task list for Trail Journal — Personal Hiking Blog"
---

# Tasks: Trail Journal — Personal Hiking Blog

**Input**: Design documents from `specs/001-trail-journal-site/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-routes.md ✅

**Tests**: REQUIRED — Constitution Principle I mandates Test-First (TDD). Tests MUST be
written, reviewed, and confirmed FAILING before any implementation task begins.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story. Each phase produces a fully testable increment.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every implementation task

## Path Conventions

- Source: `src/app/`, `src/components/`, `src/lib/`, `src/middleware.ts`
- Tests: `tests/unit/`, `tests/integration/`
- Content: `content/data/posts.json`, `content/posts/[slug].md`, `content/config.json`
- Static assets: `public/photos/[slug]/`, `public/trails/`

---

## Phase 1: Setup

**Purpose**: Project scaffolding and tooling configuration

- [X] T001 Initialize Next.js 14 App Router project with TypeScript at the repository root (`npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir`)
- [X] T002 [P] Configure tsconfig.json — add `"noUncheckedIndexedAccess": true` to `compilerOptions`; verify `"strict": true` is set
- [X] T003 [P] Install and configure Vitest + React Testing Library — add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`, `jsdom` to devDependencies; create `vitest.config.ts` at repo root
- [X] T004 [P] Install remaining project dependencies: `react-leaflet`, `leaflet`, `@types/leaflet`, `exifr`, `react-markdown`, `remark-gfm`, `@uiw/react-md-editor` via npm install
- [X] T005 Create content directory structure: `content/data/posts.json` (contents: `[]`), `content/config.json` (Trail Journal defaults per data-model.md), `content/posts/` directory with `.gitkeep`
- [X] T006 [P] Add `public/trails/` and `public/photos/` directories with `README.md` placeholders explaining GeoJSON sourcing and photo storage conventions (see research.md Decision 6 for GeoJSON sourcing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared library code and infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

> **NOTE**: Per Constitution Principle I, all test tasks (T007, T009) MUST be written
> and confirmed to FAIL before their corresponding implementation tasks (T008, T010) begin.

- [X] T007 [P] Write failing unit tests for `src/lib/slug.ts` in `tests/unit/lib/slug.test.ts` — cover: basic title-to-slug conversion, date appending (YYYY-MM), 80-char truncation, collision resolution (appends -2/-3)
- [X] T008 Implement `src/lib/slug.ts` — `generateSlug(title, date, existingSlugs)` returns unique URL-safe slug; all T007 tests must pass
- [X] T009 [P] Write failing unit tests for `src/lib/posts.ts` read functions in `tests/unit/lib/posts.test.ts` — cover: `getAllPosts` returns all posts, `getPublishedPosts` filters drafts and orders newest-first, `getPostBySlug` returns post with body or null for unknown/unpublished slug
- [X] T010 Implement `src/lib/posts.ts` read functions — `getAllPosts()`, `getPublishedPosts()`, `getPostBySlug(slug)`: read `content/data/posts.json` for metadata; read `content/posts/[slug].md` for body; all T009 tests must pass
- [X] T011 [P] Implement `src/lib/config.ts` — `readConfig()` reads and parses `content/config.json`; returns typed `SiteConfig`; throws on missing file
- [X] T012 Implement `src/app/layout.tsx` — root layout with Tailwind CSS global styles (`globals.css`), responsive viewport meta, site-level HTML structure, and `<main>` wrapper
- [X] T013 [P] Implement `src/middleware.ts` — intercept all requests to `/admin/*` and `/api/*`; check `x-forwarded-for` header and `request.ip`; return `NextResponse` with status 403 for non-localhost origins; configure `matcher` to cover both path prefixes

**Checkpoint**: Foundation ready — slug generation, post reading, config, layout, and
middleware are all tested and working. User story implementation can now begin.

---

## Phase 3: User Story 1 — Browse Recent Trip Reports (Priority: P1) 🎯 MVP

**Goal**: Reader lands on `/` and sees published posts newest-first with cover photo, trail name, date, and excerpt. Draft posts are hidden.

**Independent Test**: Seed `content/data/posts.json` with one published post and one draft; run dev server; load `http://localhost:3000`; verify published card appears and draft does not; navigate to the post from the card.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL before T015

- [X] T014 Write failing unit test for `PostCard` in `tests/unit/components/PostCard.test.tsx` — renders cover image with correct `src`, displays trail name, formatted date, and excerpt; `<a>` href matches `/posts/[slug]`

### Implementation for User Story 1

- [X] T015 [P] [US1] Implement `src/components/PostCard.tsx` — displays `next/image` cover photo, trail name, date (formatted as "Month D, YYYY"), excerpt, and link to `/posts/[slug]`; Tailwind responsive layout; all T014 tests must pass
- [X] T016 [US1] Implement `src/app/page.tsx` — server component: call `getPublishedPosts()` and `readConfig()`; render site name and tagline in header; `PostCard` list sorted newest-first; link to `/map`; friendly empty-state when list is empty

**Checkpoint**: US1 complete — home page is functional. Navigate from home → post card → (nothing yet, next phase).

---

## Phase 4: User Story 2 — Read a Full Trip Report (Priority: P2)

**Goal**: Reader navigates to `/posts/[slug]` and sees trail name, date, full-width cover photo, rendered Markdown story, photo gallery, and mini-map (when trail or GPS photos are present).

**Independent Test**: Add a published post with 2 photos (1 with GPS tagged to PCT, 1 without GPS); load the trip report URL; verify all sections render; verify mini-map appears; load a post with no GPS + no trail; verify mini-map section is absent.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL before T018–T019

- [X] T017 Write failing unit test for `PhotoGallery` in `tests/unit/components/PhotoGallery.test.tsx` — renders correct count of images; shows caption text when caption is present; does not render caption element when caption is absent; accepts empty photos array without error

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement `src/components/PhotoGallery.tsx` — responsive CSS grid of `next/image` photos; optional `<figcaption>` per photo; Tailwind styled; all T017 tests must pass
- [X] T019 [P] [US2] Implement `src/lib/leaflet-config.ts` — patch `L.Icon.Default.prototype._getIconUrl` to fix webpack icon path issue; export `TILE_URL` constant (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) and `TILE_ATTRIBUTION`
- [X] T020 [P] [US2] Implement `src/components/MiniMap.tsx` — `'use client'` Client Component; imports `leaflet-config.ts`; accepts `trailGeoJson?: GeoJSON.FeatureCollection`, `photos: Photo[]`; renders `<MapContainer>` with `<TileLayer>`, optional `<GeoJSON>` trail overlay, `<Marker>` per GPS photo; auto-fits bounds to GPS coords; loaded in parent via `next/dynamic` with `{ ssr: false }`
- [X] T021 [US2] Implement `src/app/posts/[slug]/page.tsx` — server component: `getPostBySlug(slug)`; return `notFound()` if missing or unpublished; render trail name, formatted date, full-width `next/image` cover photo, `<ReactMarkdown>` body with `remarkGfm`, `<PhotoGallery>`, and dynamic `<MiniMap>` (only when `post.trail` is set or at least one photo has GPS coordinates)

**Checkpoint**: US2 complete — full trip report renders with gallery and mini-map. Home page links now lead to working posts.

---

## Phase 5: User Story 3 — Explore Hikes on the Map (Priority: P3)

**Goal**: Reader opens `/map`, sees all published post markers and GPS photo markers on an interactive Leaflet map, clicks to view popups and photo lightboxes, and sees PCT/CDT/AT trail lines as overlays.

**Independent Test**: Two published posts (one with GPS photos); load `/map`; verify post markers, popup content (name/date/thumbnail/link), GPS photo markers, lightbox open/close, and three trail line overlays are all functional.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL before T023–T025

- [X] T022 Write failing unit test for `Lightbox` in `tests/unit/components/Lightbox.test.tsx` — renders photo `<img>` with correct `src` and `alt` when `isOpen: true`; does not render when `isOpen: false`; calls `onClose` callback on Escape keypress; calls `onClose` on backdrop click

### Implementation for User Story 3

- [X] T023 [P] [US3] Implement `src/components/Lightbox.tsx` — full-screen fixed overlay; `next/image` or `<img>` at large size; closes on Escape keypress (`useEffect` + keydown listener) and backdrop click; `aria-modal` and `role="dialog"` for accessibility; Tailwind styled; all T022 tests must pass
- [X] T024 [US3] Implement `src/components/MapView.tsx` — `'use client'` Client Component; imports `leaflet-config.ts`; accepts `posts: Post[]` (with photos), `trailGeoJsons: Record<string, GeoJSON.FeatureCollection>`; renders `<MapContainer>` with `<TileLayer>`, one large `<Marker>` per post with `<Popup>` (trail name, date, thumbnail `<img>`, link to `/posts/[slug]`), one small `<Marker>` per GPS photo (clicking opens `<Lightbox>`), and `<GeoJSON>` overlay per trail; loaded via `next/dynamic` with `{ ssr: false }` in parent
- [X] T025 [US3] Implement `src/app/map/page.tsx` — server component: call `getPublishedPosts()`; read `public/trails/pct.geojson`, `public/trails/cdt.geojson`, `public/trails/at.geojson` via `fs.readFileSync` (return empty `FeatureCollection` if file missing); read `readConfig()` for map center and zoom; pass all data to dynamic `<MapView>`

**Checkpoint**: US3 complete — map page is fully functional with all three trail overlays, post markers, photo markers, and lightbox.

---

## Phase 6: User Story 4 — Create and Publish a New Post (Priority: P4)

**Goal**: Author navigates to `http://localhost:3000/admin/new`, fills in all fields, uploads photos (with EXIF GPS auto-populated), saves as draft or publishes. Draft invisible on public pages; publish makes post visible everywhere.

**Independent Test**: Access `/admin/new` from localhost; fill form; upload one GPS-tagged JPEG (verify lat/lng auto-fill); add caption; select trail; save as draft; confirm post absent from `/`; publish; confirm post appears on `/` and `/map`.

### Tests for User Story 4 ⚠️ Write FIRST — confirm FAIL before T028–T032

- [X] T026 [P] Write failing unit tests for `posts.ts` write functions in `tests/unit/lib/posts.test.ts` (extend existing file) — cover: `createPost` appends to posts.json and creates `content/posts/[slug].md`; `updatePost` merges partial fields; slug collision appends -2; atomic write does not corrupt file on simulated mid-write failure
- [X] T027 [P] Write failing integration tests for `POST /api/posts` in `tests/integration/api/posts.test.ts` — returns 201 with `{slug}` on valid payload; returns 400 with `{error}` for missing required fields; returns 400 for malformed date; returns 403 for non-localhost origin
- [X] T028 [P] Write failing integration tests for `POST /api/upload` in `tests/integration/api/upload.test.ts` — returns 201 `{filename, url}` for valid JPEG upload; returns 400 for non-image MIME type; returns 413 for file exceeding 20 MB; saves file to `public/photos/[slug]/[filename]`

### Implementation for User Story 4

- [X] T029 [US4] Extend `src/lib/posts.ts` — add `createPost(data: CreatePostInput)` and `updatePost(slug, data: Partial<Post>)`: validate fields with Zod schema; use `fs.writeFileSync` to temp path + `fs.renameSync` atomic pattern; `createPost` appends to `content/data/posts.json` and writes `content/posts/[slug].md`; `updatePost` merges into existing entry; all T026 tests must pass
- [X] T030 [P] [US4] Implement `src/app/api/posts/route.ts` — `POST`: parse JSON body, validate with Zod, call `createPost`, return `NextResponse.json({slug}, {status: 201})`; `PUT /api/posts/[slug]`: validate, call `updatePost`, return 200 or 404; all T027 tests must pass
- [X] T031 [P] [US4] Implement `src/app/api/upload/route.ts` — parse `multipart/form-data` via `request.formData()`; validate `slug` present and `file` is JPEG/PNG/WebP and ≤ 20 MB; sanitise filename; `mkdirSync` + `writeFileSync` to `public/photos/[slug]/[filename]`; return `{filename, url: /photos/[slug]/[filename]}`; all T028 tests must pass
- [X] T032 [P] [US4] Implement `src/components/MarkdownEditor.tsx` — `'use client'`; wraps `@uiw/react-md-editor`; controlled component accepting `value: string` and `onChange: (value: string) => void`; SSR-safe (use `dynamic` import of `@uiw/react-md-editor` with `ssr: false` internally)
- [X] T033 [US4] Implement `src/app/admin/new/page.tsx` — full admin form (Client Component): trail name input, date picker, excerpt textarea, `<MarkdownEditor>` body, trail selector (PCT/CDT/AT/none), photo upload section (file input → `POST /api/upload` → show preview + filename; run `exifr.gps(file)` client-side and auto-populate lat/lng inputs; optional caption input per photo), cover photo selector (radio buttons from uploaded photos list), "Save as Draft" button (`POST /api/posts` with `published: false`) and "Publish" button (`POST /api/posts` with `published: true`); inline validation before submit; show success message with link to new post on completion

**Checkpoint**: US4 complete — full admin flow works end-to-end locally.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tighten the seams across all user stories

- [X] T034 [P] Audit and update `package.json` scripts — ensure all of these exist and work: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test`, `test:coverage`
- [X] T035 [P] Create or verify `next.config.ts` — disable `x-powered-by` header; configure `images.remotePatterns` if needed; ensure `output` is not set to `export` (admin API routes require server runtime)
- [X] T036 Run `npx tsc --noEmit` — resolve every TypeScript strict-mode error until exit code is 0
- [X] T037 Run `npm test` — all tests must pass; fix any failures before proceeding
- [ ] T038 [P] Manual mobile layout check per `quickstart.md` — open all four pages at 375px viewport width in browser DevTools; verify no horizontal scroll and all interactive elements are reachable by touch; fix any overflow or layout regressions found
- [ ] T039 [P] Vercel deployment verification — push to GitHub; confirm Vercel build succeeds; access `/admin/new` and `/api/posts` from the public URL and verify both return 403

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational completion
- **US2 (Phase 4)**: Depends on Foundational; can start after US1 Checkpoint or in parallel
- **US3 (Phase 5)**: Depends on Foundational; can start after US2 Checkpoint or in parallel
- **US4 (Phase 6)**: Depends on Foundational; can start independently after Foundation
- **Polish (Phase 7)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Only requires Foundation — fully independent
- **US2 (P2)**: Requires Foundation; home page links to posts but US2 is independently testable via direct URL
- **US3 (P3)**: Requires Foundation; references posts but is independently testable via direct URL
- **US4 (P4)**: Requires Foundation; produces posts consumed by US1/US2/US3 but form itself is independently testable

### Within Each User Story

- **TDD order MUST be respected**: test task → confirm failure → implementation task
- Components before pages (e.g., T015 PostCard before T016 home page)
- Lib functions before components that call them (posts.ts before PostCard)
- Shared utilities (leaflet-config.ts, slug.ts) before consumers

### Parallel Opportunities

Within Phase 2: T007 and T009 (writing tests) can run in parallel  
Within Phase 4: T017, T018, T019, T020 all touch different files — can run in parallel  
Within Phase 5: T022, T023 (Lightbox test + impl) can run in parallel with T024 prep  
Within Phase 6: T026, T027, T028 (test writing) all touch different files — run in parallel  
Within Phase 6: T030 and T031 (API routes) can run in parallel after T029

---

## Parallel Example: User Story 4 Tests

```bash
# Launch all test-writing tasks for US4 in parallel:
Task: "Write failing unit tests for posts.ts write functions in tests/unit/lib/posts.test.ts"
Task: "Write failing integration tests for POST /api/posts in tests/integration/api/posts.test.ts"
Task: "Write failing integration tests for POST /api/upload in tests/integration/api/upload.test.ts"

# After tests are written and confirmed failing, implement in parallel:
Task: "Implement src/app/api/posts/route.ts"
Task: "Implement src/app/api/upload/route.ts"
Task: "Implement src/components/MarkdownEditor.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL** — blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP AND VALIDATE**: Seed one post; confirm home page shows it; confirm draft is hidden
5. Deploy to Vercel — the home page is a working, shippable product

### Incremental Delivery

1. Foundation → US1 → MVP ship
2. Add US2 → Trip reports work → ship
3. Add US3 → Map works → ship
4. Add US4 → Admin works locally → ship
5. Each story adds value without breaking previous stories

### Solo Developer Order (Recommended)

Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → Polish

---

## Notes

- `[P]` tasks modify different files with no blocking dependencies — safe to run concurrently
- `[US#]` label traces each task to its user story for review and traceability
- TDD is NON-NEGOTIABLE (Constitution Principle I) — never skip the test tasks
- Verify each test FAILS before writing implementation code
- The Leaflet default icon fix (`leaflet-config.ts`, T019) must be imported in both `MiniMap.tsx` and `MapView.tsx`
- Trail GeoJSON files in `public/trails/` must be sourced and simplified before US3 can be validated end-to-end (see `research.md` Decision 6 for sourcing instructions)
- Admin API routes (`/api/posts`, `/api/upload`) write to the local filesystem — they work only in local dev and are blocked by middleware + Vercel read-only FS in production
