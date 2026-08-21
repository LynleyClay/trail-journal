import * as fs from 'fs';
import * as path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { hasR2Store, r2Client, r2Bucket } from '@/lib/r2';

export type User = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  trailsCompleted: string[];
  onboardingDone: boolean;
  createdAt: string;
};

export type PublicUser = Omit<User, 'passwordHash'>;

const DATA_FILE = path.join(process.cwd(), 'content', 'data', 'users.json');
const R2_DATA_KEY = 'data/users.json';

export const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'login',
  'signup',
  'onboarding',
  'map',
  'posts',
  'u',
  'new',
]);

const OWNER_ID = 'user-lynley';
const OWNER_LOGIN_ALIASES = new Set(['lynley', 'lynleyclay', 'bovi']);

function readLocal(): User[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as User[];
  } catch {
    return [];
  }
}

function writeLocal(users: User[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

async function readR2(): Promise<User[]> {
  try {
    const res = await r2Client().send(
      new GetObjectCommand({
        Bucket: r2Bucket(),
        Key: R2_DATA_KEY,
      }),
    );
    const raw = await res.Body?.transformToString();
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

async function writeR2(users: User[]): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: R2_DATA_KEY,
      Body: JSON.stringify(users, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-store',
    }),
  );
}

async function readAll(): Promise<User[]> {
  const local = readLocal();
  if (!hasR2Store()) return local;
  try {
    const remote = await readR2();
    if (!remote.length) return local;
    const owner = local.find((u) => u.id === OWNER_ID);
    const remoteOwner = remote.find((u) => u.id === OWNER_ID);
    if (owner && !remoteOwner) {
      return [owner, ...remote];
    }
    if (owner && remoteOwner && !remoteOwner.passwordHash && owner.passwordHash) {
      return remote.map((u) =>
        u.id === OWNER_ID
          ? {
              ...u,
              username: owner.username,
              displayName: owner.displayName,
              passwordHash: owner.passwordHash,
            }
          : u,
      );
    }
    return remote;
  } catch {
    return local;
  }
}

async function writeAll(users: User[]): Promise<void> {
  return hasR2Store() ? writeR2(users) : writeLocal(users);
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(username) && !RESERVED_USERNAMES.has(username);
}

/** Public trail name can include capitals and emoji; the URL/login slug cannot. */
export function trailNameToSlug(trailName: string): string {
  return trailName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export function isValidTrailName(trailName: string): boolean {
  const trimmed = trailName.trim();
  return trimmed.length >= 1 && trimmed.length <= 40 && isValidUsername(trailNameToSlug(trimmed));
}

/** The site owner can register the existing journal by setting a password once. */
export function canClaimOwnerAccount(
  existing: { id: string; username: string; passwordHash: string } | null,
  ownerUsername: string,
): boolean {
  if (!existing || existing.passwordHash) return false;
  return (
    existing.username.toLowerCase() === ownerUsername.toLowerCase() || existing.id === OWNER_ID
  );
}

export async function getAllUsers(): Promise<User[]> {
  return readAll();
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await readAll();
  return users.find((u) => u.id === id) ?? null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await readAll();
  const needle = trailNameToSlug(username) || username.toLowerCase();
  const match = users.find((u) => u.username.toLowerCase() === needle);
  if (match) return match;
  if (OWNER_LOGIN_ALIASES.has(needle)) {
    return users.find((u) => u.id === OWNER_ID) ?? null;
  }
  return null;
}

export async function createUser(input: {
  username: string;
  displayName: string;
  passwordHash: string;
  trailsCompleted?: string[];
  onboardingDone?: boolean;
}): Promise<User> {
  if (!isValidUsername(input.username)) {
    throw new Error('Invalid trail name');
  }
  const users = await readAll();
  if (users.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
    throw new Error('That trail name is already taken');
  }
  const user: User = {
    id: `user-${Date.now().toString(36)}`,
    username: input.username.toLowerCase(),
    displayName: input.displayName,
    passwordHash: input.passwordHash,
    trailsCompleted: input.trailsCompleted ?? [],
    onboardingDone: input.onboardingDone ?? false,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeAll(users);
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, 'displayName' | 'username' | 'trailsCompleted' | 'onboardingDone' | 'passwordHash'>>,
): Promise<User | null> {
  const users = await readAll();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const existing = users[idx];
  if (!existing) return null;
  users[idx] = { ...existing, ...patch };
  await writeAll(users);
  return users[idx] ?? null;
}
