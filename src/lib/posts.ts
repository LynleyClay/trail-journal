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

function readPostsData(): Post[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as Post[];
}

export function getAllPosts(): Post[] {
  return readPostsData();
}

export function getPublishedPosts(): Post[] {
  return readPostsData()
    .filter((p) => p.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const posts = readPostsData();
  const post = posts.find((p) => p.slug === slug && p.published);
  if (!post) return null;

  const bodyPath = path.join(POSTS_DIR, `${slug}.md`);
  const body = fs.existsSync(bodyPath)
    ? fs.readFileSync(bodyPath, 'utf-8')
    : '';

  return { ...post, body };
}

export function writePostsData(posts: Post[]): void {
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(posts, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

export function createPost(data: CreatePostInput): string {
  const posts = readPostsData();
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

  // Write markdown body atomically
  const bodyPath = path.join(POSTS_DIR, `${slug}.md`);
  const tmpBody = `${bodyPath}.tmp`;
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(tmpBody, data.body, 'utf-8');
  fs.renameSync(tmpBody, bodyPath);

  writePostsData([...posts, post]);
  return slug;
}

export function updatePost(slug: string, data: Partial<Post & { body: string }>): void {
  const posts = readPostsData();
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) throw new Error(`Post not found: ${slug}`);

  const { body, ...meta } = data;

  const updatedPost = { ...posts[idx], ...meta } as Post;
  const updatedPosts = [...posts.slice(0, idx), updatedPost, ...posts.slice(idx + 1)];
  writePostsData(updatedPosts);

  if (body !== undefined) {
    const bodyPath = path.join(POSTS_DIR, `${slug}.md`);
    const tmpBody = `${bodyPath}.tmp`;
    fs.writeFileSync(tmpBody, body, 'utf-8');
    fs.renameSync(tmpBody, bodyPath);
  }
}
