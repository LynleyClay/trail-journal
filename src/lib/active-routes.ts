import * as fs from 'fs';
import * as path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { Waypoint } from '@/lib/routes';
import { hasR2Store, r2Client, r2Bucket, r2PublicUrl } from '@/lib/r2';

export type RoutePoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: 'town' | 'water';
  detail?: string;
};

export type ActiveRoute = {
  id: string;
  name: string;
  waypoints: Waypoint[];
  connectedTrailIds: string[];
  approvedAt: string;
  status: 'active' | 'completed';
  resupply: RoutePoi[];
  water: RoutePoi[];
};

export type CreateActiveRouteInput = {
  name: string;
  waypoints: Waypoint[];
  connectedTrailIds: string[];
  resupply: RoutePoi[];
  water: RoutePoi[];
};

const DATA_FILE = path.join(process.cwd(), 'content', 'data', 'active-routes.json');
const R2_DATA_KEY = 'data/active-routes.json';

function readLocal(): ActiveRoute[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as ActiveRoute[];
  } catch {
    return [];
  }
}

function writeLocal(routes: ActiveRoute[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(routes, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

async function readR2(): Promise<ActiveRoute[]> {
  const res = await fetch(r2PublicUrl(R2_DATA_KEY), {
    next: { revalidate: 60, tags: ['active-routes-data'] },
  });
  return res.ok ? ((await res.json()) as ActiveRoute[]) : [];
}

async function writeR2(routes: ActiveRoute[]): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: R2_DATA_KEY,
      Body: JSON.stringify(routes, null, 2),
      ContentType: 'application/json',
    }),
  );
}

async function readAll(): Promise<ActiveRoute[]> {
  return hasR2Store() ? readR2() : readLocal();
}

async function writeAll(routes: ActiveRoute[]): Promise<void> {
  return hasR2Store() ? writeR2(routes) : writeLocal(routes);
}

export async function getActiveRoutes(): Promise<ActiveRoute[]> {
  const routes = await readAll();
  return routes.sort((a, b) => (a.approvedAt < b.approvedAt ? 1 : -1));
}

export async function getActiveRouteById(id: string): Promise<ActiveRoute | null> {
  const routes = await readAll();
  return routes.find((r) => r.id === id) ?? null;
}

export async function createActiveRoute(input: CreateActiveRouteInput): Promise<ActiveRoute> {
  const routes = await readAll();
  const route: ActiveRoute = {
    id: `route-${Date.now().toString(36)}`,
    name: input.name,
    waypoints: input.waypoints,
    connectedTrailIds: input.connectedTrailIds,
    approvedAt: new Date().toISOString(),
    status: 'active',
    resupply: input.resupply,
    water: input.water,
  };
  routes.push(route);
  await writeAll(routes);
  return route;
}

export async function deleteActiveRoute(id: string): Promise<boolean> {
  const routes = await readAll();
  const next = routes.filter((r) => r.id !== id);
  if (next.length === routes.length) return false;
  await writeAll(next);
  return true;
}

export async function updateActiveRoutePois(
  id: string,
  resupply: RoutePoi[],
  water: RoutePoi[],
): Promise<ActiveRoute | null> {
  const routes = await readAll();
  const idx = routes.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const existing = routes[idx];
  if (!existing) return null;
  routes[idx] = { ...existing, resupply, water };
  await writeAll(routes);
  return routes[idx] ?? null;
}

export async function updateActiveRouteStatus(
  id: string,
  status: ActiveRoute['status'],
): Promise<ActiveRoute | null> {
  const routes = await readAll();
  const idx = routes.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const existing = routes[idx];
  if (!existing) return null;
  routes[idx] = { ...existing, status };
  await writeAll(routes);
  return routes[idx] ?? null;
}
