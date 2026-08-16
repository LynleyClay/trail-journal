import * as fs from 'fs';
import * as path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { hasR2Store, r2Client, r2Bucket, r2PublicUrl } from '@/lib/r2';

export type Follow = {
  followerId: string;
  followingId: string;
  createdAt: string;
};

const DATA_FILE = path.join(process.cwd(), 'content', 'data', 'follows.json');
const R2_DATA_KEY = 'data/follows.json';

function readLocal(): Follow[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Follow[];
  } catch {
    return [];
  }
}

function writeLocal(follows: Follow[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(follows, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

async function readR2(): Promise<Follow[]> {
  const res = await fetch(r2PublicUrl(R2_DATA_KEY), {
    next: { revalidate: 60, tags: ['follows-data'] },
  });
  return res.ok ? ((await res.json()) as Follow[]) : [];
}

async function writeR2(follows: Follow[]): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: R2_DATA_KEY,
      Body: JSON.stringify(follows, null, 2),
      ContentType: 'application/json',
    }),
  );
}

async function readAll(): Promise<Follow[]> {
  return hasR2Store() ? readR2() : readLocal();
}

async function writeAll(follows: Follow[]): Promise<void> {
  return hasR2Store() ? writeR2(follows) : writeLocal(follows);
}

export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const follows = await readAll();
  if (follows.some((f) => f.followerId === followerId && f.followingId === followingId)) {
    return true;
  }
  follows.push({
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  });
  await writeAll(follows);
  return true;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const follows = await readAll();
  const next = follows.filter(
    (f) => !(f.followerId === followerId && f.followingId === followingId),
  );
  if (next.length === follows.length) return false;
  await writeAll(next);
  return true;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const follows = await readAll();
  return follows.some((f) => f.followerId === followerId && f.followingId === followingId);
}

export async function getFollowingIds(followerId: string): Promise<string[]> {
  const follows = await readAll();
  return follows.filter((f) => f.followerId === followerId).map((f) => f.followingId);
}

export async function getFollowerIds(followingId: string): Promise<string[]> {
  const follows = await readAll();
  return follows.filter((f) => f.followingId === followingId).map((f) => f.followerId);
}
