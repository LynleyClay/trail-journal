import * as fs from 'fs';
import * as path from 'path';
import { generateSlug } from './slug';

export type Trail = 'PCT' | 'CDT' | 'AT';

export interface Photo {
  filename: string;
  caption?: string;
  lat?: number;
  lng?: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  coverPhoto: string;
  trail?: Trail;
  published: boolean;
  photos: Photo[];
  body?: string;
}

export interface CreatePostInput {
  title: string;
  date: string;
  excerpt: string;
  body: string;
  trail?: Trail;
  coverPhoto?: string;
  published?: boolean;
  photos?: Photo[];
}

const DATA_FILE = path.join(process.cwd(), 'content', 'data', 'posts.json');
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

const BLOB_DATA_PATH = 'data/posts.json';
const blobBodyPath = (slug: string): string => `posts/${slug}.md`;

function hasBlobStore(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ---- Local filesystem backend (used in dev / tests without a Blob token) ----

function readPostsDataLocal(): Post[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as Post[];
}

function writePostsDataLocal(posts: Post[]): void {
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(posts, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

function readBodyLocal(slug: string): string {
  const bodyPath = path.join(POSTS_DIR, `${slug}.md`);
  return fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf-8') : '';
}

function writeBodyLocal(slug: string, body: string): void {
  const bodyPath = path.join(POSTS_DIR, `${slug}.md`);
  const tmpBody = `${bodyPath}.tmp`;
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(tmpBody, body, 'utf-8');
  fs.renameSync(tmpBody, bodyPath);
}

function deleteBodyLocal(slug: string): void {
  const bodyPath = path.join(POSTS_DIR, `${slug}.md`);
  if (fs.existsSync(bodyPath)) fs.unlinkSync(bodyPath);
}

// ---- Vercel Blob backend (used in production, where the filesystem is read-only) ----

async function findBlobUrl(pathname: string): Promise<string | null> {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  return blobs.find((b) => b.pathname === pathname)?.url ?? null;
}

async function readPostsDataBlob(): Promise<Post[]> {
  const url = await findBlobUrl(BLOB_DATA_PATH);
  if (!url) return [];
  const res = await fetch(url, { cache: 'no-store' });
  return res.ok ? ((await res.json()) as Post[]) : [];
}

async function writePostsDataBlob(posts: Post[]): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(BLOB_DATA_PATH, JSON.stringify(posts, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

async function readBodyBlob(slug: string): Promise<string> {
  const url = await findBlobUrl(blobBodyPath(slug));
  if (!url) return '';
  const res = await fetch(url, { cache: 'no-store' });
  return res.ok ? await res.text() : '';
}

async function writeBodyBlob(slug: string, body: string): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(blobBodyPath(slug), body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'text/markdown',
  });
}

async function deleteBodyBlob(slug: string): Promise<void> {
  const url = await findBlobUrl(blobBodyPath(slug));
  if (!url) return;
  const { del } = await import('@vercel/blob');
  await del(url);
}

// ---- Storage-agnostic public API ----

async function readPostsData(): Promise<Post[]> {
  return hasBlobStore() ? readPostsDataBlob() : readPostsDataLocal();
}

async function writePostsData(posts: Post[]): Promise<void> {
  return hasBlobStore() ? writePostsDataBlob(posts) : writePostsDataLocal(posts);
}

async function readBody(slug: string): Promise<string> {
  return hasBlobStore() ? readBodyBlob(slug) : readBodyLocal(slug);
}

async function writeBody(slug: string, body: string): Promise<void> {
  return hasBlobStore() ? writeBodyBlob(slug, body) : writeBodyLocal(slug, body);
}

async function deleteBody(slug: string): Promise<void> {
  return hasBlobStore() ? deleteBodyBlob(slug) : deleteBodyLocal(slug);
}

export async function getAllPosts(): Promise<Post[]> {
  return readPostsData();
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await readPostsData();
  return posts.filter((p) => p.published).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await readPostsData();
  const post = posts.find((p) => p.slug === slug && p.published);
  if (!post) return null;

  const body = await readBody(slug);
  return { ...post, body };
}

// Unlike getPostBySlug, this also returns drafts — for the admin edit form only.
export async function getPostForEdit(slug: string): Promise<Post | null> {
  const posts = await readPostsData();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return null;

  const body = await readBody(slug);
  return { ...post, body };
}

export async function createPost(data: CreatePostInput): Promise<string> {
  const posts = await readPostsData();
  const existingSlugs = posts.map((p) => p.slug);
  const slug = generateSlug(data.title, data.date, existingSlugs);

  const post: Post = {
    id: slug,
    slug,
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    coverPhoto: data.coverPhoto ?? '',
    trail: data.trail,
    published: data.published ?? false,
    photos: data.photos ?? [],
  };

  await writeBody(slug, data.body);
  await writePostsData([...posts, post]);
  return slug;
}

export async function updatePost(slug: string, data: Partial<Post & { body: string }>): Promise<void> {
  const posts = await readPostsData();
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) throw new Error(`Post not found: ${slug}`);

  const { body, ...meta } = data;
  const updatedPost = { ...posts[idx], ...meta } as Post;
  const updatedPosts = [...posts.slice(0, idx), updatedPost, ...posts.slice(idx + 1)];
  await writePostsData(updatedPosts);

  if (body !== undefined) {
    await writeBody(slug, body);
  }
}

export async function deletePost(slug: string): Promise<void> {
  const posts = await readPostsData();
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) throw new Error(`Post not found: ${slug}`);

  const updatedPosts = [...posts.slice(0, idx), ...posts.slice(idx + 1)];
  await writePostsData(updatedPosts);
  await deleteBody(slug);
}
