import type { DraftPhotoRecord, DraftSummary, OfflineDraft } from '@/lib/offline/drafts';

export const DRAFT_STORAGE_KEY = 'trail-journal-drafts-v1';

type SerializedPhoto = Omit<DraftPhotoRecord, 'blob'> & { dataUrl: string };

type SerializedDraft = OfflineDraft & {
  photos: SerializedPhoto[];
};

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read photo'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  if (!data) return new Blob();
  const mime = /data:([^;]+)/.exec(header ?? '')?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function readAll(): SerializedDraft[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SerializedDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(drafts: SerializedDraft[]): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export async function saveDraft(draft: OfflineDraft, photos: DraftPhotoRecord[]): Promise<void> {
  if (typeof localStorage === 'undefined') {
    throw new Error('This browser cannot save drafts on the device.');
  }

  const serializedPhotos: SerializedPhoto[] = [];
  for (const photo of photos) {
    serializedPhotos.push({
      draftId: draft.id,
      id: photo.id,
      filename: photo.filename,
      caption: photo.caption,
      lat: photo.lat,
      lng: photo.lng,
      uploadedFilename: photo.uploadedFilename,
      uploadedUrl: photo.uploadedUrl,
      dataUrl: photo.blob.size > 0 ? await blobToDataUrl(photo.blob) : '',
    });
  }

  const record: SerializedDraft = {
    ...draft,
    photoCount: serializedPhotos.filter((photo) => photo.dataUrl).length,
    photos: serializedPhotos,
  };

  const rest = readAll().filter((item) => item.id !== draft.id);
  try {
    writeAll([record, ...rest]);
  } catch {
    const withoutPhotos: SerializedDraft = {
      ...record,
      photoCount: 0,
      photos: [],
    };
    writeAll([withoutPhotos, ...rest]);
    if (photos.length > 0) {
      throw new Error('Saved the writing, but the photos were too large for this device.');
    }
  }
}

export async function getDraft(id: string): Promise<{ draft: OfflineDraft; photos: DraftPhotoRecord[] } | null> {
  const record = readAll().find((item) => item.id === id);
  if (!record) return null;
  const { photos, ...draft } = record;
  return {
    draft,
    photos: (photos ?? []).map((photo) => ({
      draftId: id,
      id: photo.id,
      filename: photo.filename,
      caption: photo.caption,
      lat: photo.lat,
      lng: photo.lng,
      uploadedFilename: photo.uploadedFilename,
      uploadedUrl: photo.uploadedUrl,
      blob: photo.dataUrl ? dataUrlToBlob(photo.dataUrl) : new Blob(),
    })),
  };
}

export async function listDrafts(): Promise<DraftSummary[]> {
  return readAll()
    .map((draft) => ({
      id: draft.id,
      title: draft.title,
      updatedAt: draft.updatedAt,
      photoCount: draft.photoCount,
      excerpt: draft.excerpt,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function deleteDraft(id: string): Promise<void> {
  writeAll(readAll().filter((item) => item.id !== id));
}
