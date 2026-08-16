import type { ActiveRoute } from '@/lib/active-routes';

const DB_NAME = 'trail-journal-offline';
const DB_VERSION = 1;
const STORE = 'routes';

export type OfflineRouteRecord = {
  routeId: string;
  route: ActiveRoute;
  downloadedAt: string;
  tileCount: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('Failed to open offline database'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'routeId' });
      }
    };
  });
}

export async function saveOfflineRoute(record: OfflineRouteRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save offline route'));
    tx.objectStore(STORE).put(record);
  });
}

export async function getOfflineRoute(routeId: string): Promise<OfflineRouteRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(routeId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as OfflineRouteRecord | undefined) ?? null);
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to read offline route'));
  });
}

export async function listOfflineRoutes(): Promise<OfflineRouteRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result as OfflineRouteRecord[]) ?? []);
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to list offline routes'));
  });
}

export async function deleteOfflineRoute(routeId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete offline route'));
    tx.objectStore(STORE).delete(routeId);
  });
}

export async function isRouteOffline(routeId: string): Promise<boolean> {
  const record = await getOfflineRoute(routeId);
  return !!record;
}
