/**
 * One-time migration: assign existing posts/routes to the site owner user
 * and set the owner password from ADMIN_PASSWORD (if configured).
 *
 * Usage: npx tsx scripts/migrate-owner-content.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { hashPassword } from '../src/lib/password';

const OWNER_ID = 'user-lynley';
const OWNER_USERNAME = 'lynley';

const postsFile = path.join(process.cwd(), 'content', 'data', 'posts.json');
const routesFile = path.join(process.cwd(), 'content', 'data', 'active-routes.json');
const usersFile = path.join(process.cwd(), 'content', 'data', 'users.json');

function migratePosts(): number {
  if (!fs.existsSync(postsFile)) return 0;
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf-8')) as Array<{ userId?: string }>;
  let updated = 0;
  for (const post of posts) {
    if (!post.userId) {
      post.userId = OWNER_ID;
      updated++;
    }
  }
  fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2), 'utf-8');
  return updated;
}

function migrateRoutes(): number {
  if (!fs.existsSync(routesFile)) return 0;
  const routes = JSON.parse(fs.readFileSync(routesFile, 'utf-8')) as Array<{ userId?: string }>;
  let updated = 0;
  for (const route of routes) {
    if (!route.userId) {
      route.userId = OWNER_ID;
      updated++;
    }
  }
  fs.writeFileSync(routesFile, JSON.stringify(routes, null, 2), 'utf-8');
  return updated;
}

function migrateOwnerUser(): void {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = adminPassword ? hashPassword(adminPassword) : '';

  let users: Array<{
    id: string;
    username: string;
    displayName: string;
    passwordHash: string;
    trailsCompleted: string[];
    onboardingDone: boolean;
    createdAt: string;
  }> = [];

  if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  }

  const idx = users.findIndex((u) => u.username === OWNER_USERNAME || u.id === OWNER_ID);
  const owner = {
    id: OWNER_ID,
    username: OWNER_USERNAME,
    displayName: 'Lynley',
    passwordHash: passwordHash || users[idx]?.passwordHash || '',
    trailsCompleted: ['at', 'pct', 'cdt'],
    onboardingDone: true,
    createdAt: users[idx]?.createdAt ?? '2026-01-01T00:00:00.000Z',
  };

  if (idx >= 0) {
    users[idx] = { ...users[idx], ...owner, passwordHash: owner.passwordHash || users[idx]?.passwordHash || '' };
  } else {
    users.push(owner);
  }

  fs.mkdirSync(path.dirname(usersFile), { recursive: true });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

const postsUpdated = migratePosts();
const routesUpdated = migrateRoutes();
migrateOwnerUser();

console.log(`Migration complete: ${postsUpdated} posts, ${routesUpdated} routes tagged with ${OWNER_ID}.`);
if (!process.env.ADMIN_PASSWORD) {
  console.log('Note: ADMIN_PASSWORD not set — owner account has no password until you set one via signup or re-run with ADMIN_PASSWORD.');
}
