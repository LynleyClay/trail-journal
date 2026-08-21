import type { Trail } from '@/lib/posts';

export const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export type DraftPhotoRecord = {
  draftId: string;
  id: string;
  filename: string;
  caption?: string;
  lat?: number;
  lng?: number;
  blob: Blob;
  uploadedFilename?: string;
  uploadedUrl?: string;
};

export type OfflineDraft = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  body: string;
  trail: Trail | '';
  coverPhotoId: string;
  route?: [number, number][];
  updatedAt: string;
  photoCount: number;
};

export type DraftSummary = Pick<OfflineDraft, 'id' | 'title' | 'updatedAt' | 'photoCount' | 'excerpt'>;

export type FormPhotoInput = {
  id: string;
  filename: string;
  caption?: string;
  lat?: number;
  lng?: number;
  uploadedFilename?: string;
};

export function newDraftId(): string {
  return crypto.randomUUID();
}

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function newPhotoId(): string {
  return crypto.randomUUID();
}

export function sanitizePhotoFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'photo.jpg';
}

export function draftDisplayTitle(title: string): string {
  return title.trim() || 'Untitled draft';
}

export function uploadSlugForDraft(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'new-post'}-draft`;
}

export function isAllowedPhotoFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return `Unsupported file type: ${file.type || 'unknown'}. Use JPEG, PNG, or WebP.`;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'File exceeds 20 MB limit';
  }
  return null;
}

export function photosForPublish(
  photos: FormPhotoInput[],
  coverPhotoId: string
): { photos: { filename: string; caption?: string; lat?: number; lng?: number }[]; coverPhoto: string } {
  const mapped = photos.map((photo) => ({
    filename: photo.uploadedFilename ?? photo.filename,
    caption: photo.caption || undefined,
    lat: photo.lat,
    lng: photo.lng,
  }));
  const cover = photos.find((photo) => photo.id === coverPhotoId);
  return {
    photos: mapped,
    coverPhoto: cover ? (cover.uploadedFilename ?? cover.filename) : '',
  };
}

export function draftHasContent(draft: {
  title: string;
  date: string;
  excerpt: string;
  body: string;
  photos: unknown[];
  route?: [number, number][];
}): boolean {
  return Boolean(
    draft.title.trim() ||
      draft.date ||
      draft.excerpt.trim() ||
      draft.body.trim() ||
      draft.photos.length > 0 ||
      (draft.route && draft.route.length > 0)
  );
}
