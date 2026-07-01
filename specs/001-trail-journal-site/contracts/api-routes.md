# API Route Contracts: Trail Journal — Personal Hiking Blog

**Feature**: `001-trail-journal-site`
**Date**: 2026-07-01

These routes are Next.js Route Handlers (`src/app/api/*/route.ts`). They are
localhost-only — the `middleware.ts` returns HTTP 403 for any non-localhost request
before it reaches these handlers. On Vercel (read-only filesystem), these routes
would also fail if reached.

Public pages (Home, Map, Trip Report) do not use these routes — they read content
files directly in Server Components via `src/lib/posts.ts`.

---

## POST /api/posts

Create a new post (metadata + body file).

### Request

`Content-Type: application/json`

```ts
{
  title: string;         // required; display name
  date: string;          // required; ISO date "YYYY-MM-DD"
  excerpt: string;       // required; plain text
  body: string;          // required; Markdown source
  trail?: 'PCT' | 'CDT' | 'AT';  // optional
  coverPhoto?: string;   // filename of cover photo (must exist in photos array)
  published?: boolean;   // default: false
  photos?: Array<{
    filename: string;    // must already be uploaded via POST /api/upload
    caption?: string;
    lat?: number;
    lng?: number;
  }>;
}
```

### Response — 201 Created

```ts
{
  slug: string;          // generated slug, e.g. "cascade-loops-2026-06"
  id: string;            // same as slug
}
```

### Response — 400 Bad Request

```ts
{ error: string }        // validation error description
```

### Behaviour

1. Validate all required fields and value ranges (see data model validation rules).
2. Generate slug from title + date; resolve any collision by appending `-2`, `-3`.
3. Write Markdown body to `content/posts/[slug].md` (atomic write).
4. Append post object to `content/data/posts.json` (read → append → atomic write).
5. Return 201 with `{ slug, id }`.

---

## PUT /api/posts/[slug]

Update an existing post (e.g., draft → publish, edit excerpt, add photos).

### Request

`Content-Type: application/json`

All fields are optional. Only provided fields are updated.

```ts
{
  title?: string;
  date?: string;
  excerpt?: string;
  body?: string;
  trail?: 'PCT' | 'CDT' | 'AT' | null;
  coverPhoto?: string;
  published?: boolean;
  photos?: Photo[];      // replaces the entire photos array for this post
}
```

### Response — 200 OK

```ts
{ slug: string }
```

### Response — 404 Not Found

```ts
{ error: 'Post not found' }
```

### Response — 400 Bad Request

```ts
{ error: string }
```

### Behaviour

1. Find post in `posts.json` by slug. Return 404 if not found.
2. Validate any provided fields.
3. If `body` provided, overwrite `content/posts/[slug].md` (atomic write).
4. Merge provided fields into the post object in `posts.json` (atomic write).
5. Return 200 with `{ slug }`.

---

## POST /api/upload

Upload a single photo file for a post.

### Request

`Content-Type: multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File (JPEG/PNG/WebP) | The image file |
| `slug` | string | The post slug this photo belongs to |

### Response — 201 Created

```ts
{
  filename: string;      // saved filename, e.g. "photo-001.jpg"
  url: string;           // public URL: "/photos/[slug]/[filename]"
}
```

### Response — 400 Bad Request

```ts
{ error: string }        // e.g. "Unsupported file type" or "Missing slug"
```

### Response — 413 Payload Too Large

```ts
{ error: 'File exceeds 20 MB limit' }
```

### Behaviour

1. Validate `slug` is present and `file` is JPEG, PNG, or WebP.
2. Validate file size ≤ 20 MB.
3. Save file to `public/photos/[slug]/[filename]` creating the directory if needed.
   Filename is preserved from the upload (sanitised: lowercase, hyphens for spaces,
   alphanumeric + hyphens + dots only). Resolve filename collisions with numeric suffix.
4. Return 201 with `{ filename, url }`.

Note: GPS extraction happens in the browser before upload (via `exifr`) — the server
does not process EXIF data.

---

## Error Envelope

All error responses share the same shape:

```ts
{ error: string }
```

HTTP status codes used: 200, 201, 400, 403 (middleware), 404, 413.
