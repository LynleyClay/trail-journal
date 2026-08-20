import { describe, it, expect, beforeEach } from 'vitest';
import {
  draftDisplayTitle,
  draftHasContent,
  isAllowedPhotoFile,
  photosForPublish,
  sanitizePhotoFilename,
  uploadSlugForDraft,
} from '@/lib/offline/drafts';
import {
  DRAFT_STORAGE_KEY,
  deleteDraft,
  getDraft,
  listDrafts,
  saveDraft,
} from '@/lib/offline/draft-store';
import type { OfflineDraft } from '@/lib/offline/drafts';

describe('offline drafts helpers', () => {
  it('falls back to Untitled draft when the title is blank', () => {
    expect(draftDisplayTitle('')).toBe('Untitled draft');
    expect(draftDisplayTitle('  Morning at the pass  ')).toBe('Morning at the pass');
  });

  it('builds a temporary upload slug from the title', () => {
    expect(uploadSlugForDraft('Morning at the pass')).toBe('morning-at-the-pass-draft');
    expect(uploadSlugForDraft('   ')).toBe('new-post-draft');
  });

  it('sanitizes photo filenames', () => {
    expect(sanitizePhotoFilename('Camp Photo 1.JPG')).toBe('camp-photo-1.jpg');
    expect(sanitizePhotoFilename('???')).toBe('photo.jpg');
  });

  it('rejects unsupported or oversized photo files', () => {
    expect(isAllowedPhotoFile({ type: 'image/jpeg', size: 100 })).toBeNull();
    expect(isAllowedPhotoFile({ type: 'application/pdf', size: 100 })).toMatch(/Unsupported/);
    expect(isAllowedPhotoFile({ type: 'image/png', size: 21 * 1024 * 1024 })).toMatch(/20 MB/);
  });

  it('maps local photo ids to uploaded filenames for publish', () => {
    const result = photosForPublish(
      [
        { id: 'a', filename: 'camp.jpg', caption: 'Camp', uploadedFilename: 'https://cdn/camp.jpg' },
        { id: 'b', filename: 'pass.jpg', lat: 47.1, lng: -121.2 },
      ],
      'a'
    );
    expect(result.coverPhoto).toBe('https://cdn/camp.jpg');
    expect(result.photos).toEqual([
      { filename: 'https://cdn/camp.jpg', caption: 'Camp', lat: undefined, lng: undefined },
      { filename: 'pass.jpg', caption: undefined, lat: 47.1, lng: -121.2 },
    ]);
  });

  it('treats photos or a route as enough content to keep a draft', () => {
    expect(
      draftHasContent({ title: '', date: '', excerpt: '', body: '', photos: [], route: undefined })
    ).toBe(false);
    expect(
      draftHasContent({ title: '', date: '', excerpt: '', body: '', photos: [{ id: '1' }], route: undefined })
    ).toBe(true);
    expect(
      draftHasContent({
        title: '',
        date: '',
        excerpt: '',
        body: '',
        photos: [],
        route: [[47, -121]],
      })
    ).toBe(true);
  });
});

describe('offline draft storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const draft = (id: string, title: string): OfflineDraft => ({
    id,
    title,
    date: '2026-08-20',
    excerpt: 'A day on trail',
    body: 'We climbed in the rain.',
    trail: 'PCT',
    coverPhotoId: '',
    updatedAt: '2026-08-20T18:00:00.000Z',
    photoCount: 0,
  });

  it('saves and lists a draft on this device', async () => {
    await saveDraft(draft('d1', 'Morning at the pass'), []);
    const listed = await listDrafts();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.title).toBe('Morning at the pass');
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toContain('Morning at the pass');
  });

  it('round-trips photos attached to a draft', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/jpeg' });
    await saveDraft(draft('d2', 'Photo day'), [
      {
        draftId: 'd2',
        id: 'p1',
        filename: 'camp.jpg',
        caption: 'Camp',
        blob,
      },
    ]);
    const loaded = await getDraft('d2');
    expect(loaded?.photos).toHaveLength(1);
    expect(loaded?.photos[0]?.filename).toBe('camp.jpg');
    expect(loaded?.photos[0]?.caption).toBe('Camp');
    expect(loaded?.photos[0]?.blob.size).toBeGreaterThan(0);
  });

  it('deletes a draft', async () => {
    await saveDraft(draft('d3', 'Gone'), []);
    await deleteDraft('d3');
    expect(await getDraft('d3')).toBeNull();
    expect(await listDrafts()).toHaveLength(0);
  });
});
