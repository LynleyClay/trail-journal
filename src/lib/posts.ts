import * as fs from 'fs';
import * as path from 'path';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { generateSlug } from './slug';
import { hasR2Store, r2Client, r2Bucket, r2PublicUrl } from './r2';

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

const R2_DATA_KEY = 'data/posts.json';
const r2BodyKey = (slug: string): string => `posts/${slug}.md`;

// ---- Local filesystem backend (used in dev / tests without R2 configured) ----

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

// ---- Cloudflare R2 backend (used in production, where the filesystem is read-only) ----

// R2 object URLs are deterministic from the key alone (unlike Vercel Blob's
// opaque URLs), so reads are a plain cached fetch — no lookup call needed.
async function readPostsDataR2(): Promise<Post[]> {
  const res = await fetch(r2PublicUrl(R2_DATA_KEY), { next: { revalidate: 60, tags: ['posts-data'] } });
  return res.ok ? ((await res.json()) as Post[]) : [];
}

async function writePostsDataR2(posts: Post[]): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: R2_DATA_KEY,
      Body: JSON.stringify(posts, null, 2),
      ContentType: 'application/json',
    })
  );
}

async function readBodyR2(slug: string): Promise<string> {
  const res = await fetch(r2PublicUrl(r2BodyKey(slug)), {
    next: { revalidate: 60, tags: [`post-body-${slug}`] },
  });
  return res.ok ? await res.text() : '';
}

async function writeBodyR2(slug: string, body: string): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: r2BodyKey(slug),
      Body: body,
      ContentType: 'text/markdown',
    })
  );
}

async function deleteBodyR2(slug: string): Promise<void> {
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: r2Bucket(),
      Key: r2BodyKey(slug),
    })
  );
}

// ---- Storage-agnostic public API ----

async function readPostsData(): Promise<Post[]> {
  return hasR2Store() ? readPostsDataR2() : readPostsDataLocal();
}

async function writePostsData(posts: Post[]): Promise<void> {
  return hasR2Store() ? writePostsDataR2(posts) : writePostsDataLocal(posts);
}

async function readBody(slug: string): Promise<string> {
  return hasR2Store() ? readBodyR2(slug) : readBodyLocal(slug);
}

async function writeBody(slug: string, body: string): Promise<void> {
  return hasR2Store() ? writeBodyR2(slug, body) : writeBodyLocal(slug, body);
}

async function deleteBody(slug: string): Promise<void> {
  return hasR2Store() ? deleteBodyR2(slug) : deleteBodyLocal(slug);
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
