'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FeatureCollection } from 'geojson';
import type { Trail, Photo } from '@/lib/posts';
import { parseGpx, simplifyRoute, GpxParseError } from '@/lib/gpx';
import { cacheComposerPage } from '@/lib/offline/app-shell';
import { deleteDraft, getDraft, listDrafts, saveDraft } from '@/lib/offline/draft-store';
import {
  draftDisplayTitle,
  draftHasContent,
  isAllowedPhotoFile,
  newDraftId,
  newPhotoId,
  photosForPublish,
  sanitizePhotoFilename,
  uploadSlugForDraft,
  type DraftPhotoRecord,
  type DraftSummary,
  type OfflineDraft,
} from '@/lib/offline/drafts';

const MarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor').then((m) => m.MarkdownEditor),
  { ssr: false }
);

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

interface FormPhoto extends Photo {
  id: string;
  url: string;
  previewUrl: string;
  blob?: Blob;
  uploadedFilename?: string;
  uploadedUrl?: string;
}

interface FormErrors {
  title?: string;
  date?: string;
  excerpt?: string;
  body?: string;
}

export interface PostFormInitialData {
  title: string;
  date: string;
  excerpt: string;
  body: string;
  trail: Trail | '';
  coverPhoto: string;
  photos: FormPhoto[];
  route?: [number, number][];
}

interface PostFormProps {
  mode: 'create' | 'edit';
  slug?: string;
  initialData?: PostFormInitialData;
  localDraftId?: string;
  initialView?: 'write' | 'drafts';
}

const EMPTY_DATA: PostFormInitialData = {
  title: '',
  date: '',
  excerpt: '',
  body: '',
  trail: '',
  coverPhoto: '',
  photos: [],
};

function formatDraftTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function revokePreview(photo: FormPhoto) {
  if (photo.previewUrl.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl);
}

export function PostForm({ mode, slug, initialData, localDraftId, initialView = 'write' }: PostFormProps) {
  const router = useRouter();
  const data = initialData ?? EMPTY_DATA;

  const [title, setTitle] = useState(data.title);
  const [date, setDate] = useState(data.date);
  const [excerpt, setExcerpt] = useState(data.excerpt);
  const [body, setBody] = useState(data.body);
  const [trail, setTrail] = useState<Trail | ''>(data.trail);
  const [trailGeoJson, setTrailGeoJson] = useState<FeatureCollection | undefined>(undefined);
  const [photos, setPhotos] = useState<FormPhoto[]>(data.photos);
  const [coverPhoto, setCoverPhoto] = useState(data.coverPhoto);
  const [route, setRoute] = useState<[number, number][] | undefined>(data.route);
  const [gpxError, setGpxError] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [savedPublished, setSavedPublished] = useState(true);
  const [localDraftSaved, setLocalDraftSaved] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [draftId, setDraftId] = useState(localDraftId ?? '');
  const [draftReady, setDraftReady] = useState(mode !== 'create');
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [saveNotice, setSaveNotice] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [composeView, setComposeView] = useState<'write' | 'drafts'>(initialView);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    setComposeView(initialView);
  }, [initialView]);

  useEffect(() => {
    try {
      void cacheComposerPage();
    } catch {
      // Composer caching is optional.
    }
  }, []);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!trail) {
      setTrailGeoJson(undefined);
      return;
    }
    let cancelled = false;
    fetch(`/trails/${trail.toLowerCase()}.geojson`)
      .then((res) => (res.ok ? (res.json() as Promise<FeatureCollection>) : undefined))
      .then((geoJson) => {
        if (!cancelled) setTrailGeoJson(geoJson);
      })
      .catch(() => {
        if (!cancelled) setTrailGeoJson(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [trail]);

  const applyDraft = useCallback((loaded: { draft: OfflineDraft; photos: DraftPhotoRecord[] }) => {
    photosRef.current.forEach(revokePreview);
    setTitle(loaded.draft.title);
    setDate(loaded.draft.date);
    setExcerpt(loaded.draft.excerpt);
    setBody(loaded.draft.body);
    setTrail(loaded.draft.trail);
    setCoverPhoto(loaded.draft.coverPhotoId);
    setRoute(loaded.draft.route);
    setPhotos(
      loaded.photos.map((photo) => {
        const previewUrl = photo.uploadedUrl || URL.createObjectURL(photo.blob);
        return {
          id: photo.id,
          filename: photo.filename,
          caption: photo.caption,
          lat: photo.lat,
          lng: photo.lng,
          blob: photo.blob,
          uploadedFilename: photo.uploadedFilename,
          uploadedUrl: photo.uploadedUrl,
          url: previewUrl,
          previewUrl,
        };
      })
    );
    setErrors({});
    setSaveNotice('');
  }, []);

  useEffect(() => {
    if (mode !== 'create') return;
    let cancelled = false;
    void (async () => {
      try {
        const listed = await listDrafts();
        if (cancelled) return;
        setDrafts(listed);
        if (localDraftId) {
          const loaded = await getDraft(localDraftId);
          if (!cancelled && loaded) {
            applyDraft(loaded);
            setDraftId(localDraftId);
            setLastSavedAt(loaded.draft.updatedAt);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSaveNotice(
            err instanceof Error
              ? `Could not load drafts: ${err.message}`
              : 'Could not load drafts on this device.'
          );
        }
      } finally {
        if (!cancelled) setDraftReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, localDraftId, applyDraft]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach(revokePreview);
    };
  }, []);

  const persistDraft = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      if (mode !== 'create') return false;
      const id = draftId || newDraftId();
      if (!draftId) setDraftId(id);

      const hasContent = draftHasContent({ title, date, excerpt, body, photos, route });
      if (!hasContent && !opts?.force) return false;

      const photoRecords: DraftPhotoRecord[] = [];
      for (const photo of photos) {
        if (!photo.blob) continue;
        photoRecords.push({
          draftId: id,
          id: photo.id,
          filename: photo.filename,
          caption: photo.caption,
          lat: photo.lat,
          lng: photo.lng,
          blob: photo.blob,
          uploadedFilename: photo.uploadedFilename,
          uploadedUrl: photo.uploadedUrl,
        });
      }

      const draft: OfflineDraft = {
        id,
        title,
        date,
        excerpt,
        body,
        trail,
        coverPhotoId: coverPhoto,
        route,
        updatedAt: new Date().toISOString(),
        photoCount: photoRecords.length,
      };

      try {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(
            () => reject(new Error('Saving the draft timed out. Try again.')),
            8000
          );
          saveDraft(draft, photoRecords).then(
            () => {
              window.clearTimeout(timer);
              resolve();
            },
            (err: unknown) => {
              window.clearTimeout(timer);
              reject(err);
            }
          );
        });
        setLastSavedAt(draft.updatedAt);
        try {
          setDrafts(await listDrafts());
        } catch {
          setDrafts((prev) => {
            const summary = {
              id: draft.id,
              title: draft.title,
              updatedAt: draft.updatedAt,
              photoCount: draft.photoCount,
              excerpt: draft.excerpt,
            };
            return [summary, ...prev.filter((item) => item.id !== draft.id)];
          });
        }
        if (!opts?.silent) {
          setSaveNotice(
            online
              ? 'Draft saved on this device. Publish when you are ready.'
              : 'Draft saved on this device. Publish when you have service.'
          );
        }
        return true;
      } catch (err) {
        console.error('Failed to save draft', err);
        const quota = err instanceof DOMException && err.name === 'QuotaExceededError';
        const detail = err instanceof Error ? err.message : 'Unknown error';
        if (detail.startsWith('Saved the writing')) {
          setLastSavedAt(new Date().toISOString());
          setSaveNotice(detail);
          return true;
        }
        setSaveNotice(
          quota
            ? 'Not enough storage on this device to save these photos.'
            : `Could not save the draft on this device. ${detail}`
        );
        return false;
      }
    },
    [mode, draftId, title, date, excerpt, body, photos, route, trail, coverPhoto, online]
  );

  useEffect(() => {
    if (mode !== 'create' || !draftReady) return;
    const timer = window.setTimeout(() => {
      void persistDraft({ silent: true });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [mode, draftReady, persistDraft]);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = 'Title is required.';
    if (!date) {
      errs.date = 'Date is required.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      errs.date = 'Enter a valid date (YYYY-MM-DD).';
    }
    if (!excerpt.trim()) errs.excerpt = 'Excerpt is required.';
    if (!body.trim()) errs.body = 'Post body cannot be empty.';
    return errs;
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError('');

    if (mode === 'create') {
      for (const file of files) {
        const typeError = isAllowedPhotoFile(file);
        if (typeError) {
          setUploadError(typeError);
          continue;
        }

        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const { default: exifr } = await import('exifr');
          const gps = await exifr.gps(file);
          if (gps) {
            lat = gps.latitude;
            lng = gps.longitude;
          }
        } catch {
          // EXIF extraction is best-effort; non-JPEG files or missing GPS are fine
        }

        const previewUrl = URL.createObjectURL(file);
        setPhotos((prev) => [
          ...prev,
          {
            id: newPhotoId(),
            filename: sanitizePhotoFilename(file.name),
            url: previewUrl,
            previewUrl,
            blob: file,
            caption: '',
            lat,
            lng,
          },
        ]);
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const uploadSlug =
      slug ??
      (title.trim()
        ? title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-draft'
        : 'new-post-draft');

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', uploadSlug);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setUploadError(json.error ?? `Upload failed (${res.status})`);
          continue;
        }
        const { filename, url } = (await res.json()) as { filename: string; url: string };

        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const { default: exifr } = await import('exifr');
          const gps = await exifr.gps(file);
          if (gps) {
            lat = gps.latitude;
            lng = gps.longitude;
          }
        } catch {
          // EXIF extraction is best-effort; non-JPEG files or missing GPS are fine
        }

        const previewUrl = URL.createObjectURL(file);
        setPhotos((prev) => [
          ...prev,
          { id: filename, filename, url, previewUrl, caption: '', lat, lng },
        ]);
      } catch {
        setUploadError('Network error during upload.');
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setGpxError('');
    try {
      const text = await file.text();
      const points = parseGpx(text);
      setRoute(simplifyRoute(points));
    } catch (err) {
      setGpxError(err instanceof GpxParseError ? err.message : 'Could not read that GPX file.');
    } finally {
      if (gpxInputRef.current) gpxInputRef.current.value = '';
    }
  }

  function updatePhotoCaption(index: number, caption: string) {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  }

  function updatePhotoCoord(index: number, field: 'lat' | 'lng', value: string) {
    const parsed = value.trim() === '' ? undefined : Number(value);
    setPhotos((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, [field]: parsed === undefined || isNaN(parsed) ? undefined : parsed } : p
      )
    );
  }

  function updatePhotoPosition(index: number, lat: number, lng: number) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, lat, lng } : p)));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) revokePreview(removed);
      const updated = prev.filter((_, i) => i !== index);
      if (coverPhoto === removed?.id || coverPhoto === removed?.filename) setCoverPhoto('');
      return updated;
    });
  }

  async function uploadPendingPhotos(currentPhotos: FormPhoto[]): Promise<FormPhoto[] | null> {
    const uploadSlug = slug ?? uploadSlugForDraft(title);
    const next = [...currentPhotos];

    for (let i = 0; i < next.length; i++) {
      const photo = next[i]!;
      if (photo.uploadedFilename || !photo.blob) continue;

      const formData = new FormData();
      formData.append('file', photo.blob, photo.filename);
      formData.append('slug', uploadSlug);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setUploadError(json.error ?? `Upload failed (${res.status})`);
          setPhotos(next);
          return null;
        }
        const { filename, url } = (await res.json()) as { filename: string; url: string };
        next[i] = { ...photo, uploadedFilename: filename, uploadedUrl: url, filename };
      } catch {
        setUploadError('Network error during upload. Draft kept on this device.');
        setPhotos(next);
        return null;
      }
    }

    setPhotos(next);
    return next;
  }

  async function handleSubmit(published: boolean) {
    if (mode === 'create' && !published) {
      setErrors({});
      setSubmitting(true);
      try {
        const saved = await persistDraft({ force: true });
        if (saved) {
          setLocalDraftSaved(true);
        } else {
          setSaveNotice((current) => current || 'Could not save the draft on this device.');
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Unknown error';
        setSaveNotice(`Could not save the draft on this device. ${detail}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (mode === 'create' && published && !online) {
      setSubmitting(true);
      await persistDraft({ force: true });
      setSubmitting(false);
      setSaveNotice('No service right now. Draft saved on this device — publish when you are back online.');
      return;
    }

    setSubmitting(true);
    setUploadError('');

    let photosToSave = photos;
    if (mode === 'create' && published) {
      const uploaded = await uploadPendingPhotos(photos);
      if (!uploaded) {
        await persistDraft({ silent: true, force: true });
        setSubmitting(false);
        return;
      }
      photosToSave = uploaded;
    }

    const publishedPhotos = photosForPublish(photosToSave, coverPhoto);
    const payload = {
      title: title.trim(),
      date,
      excerpt: excerpt.trim(),
      body,
      trail: trail || undefined,
      coverPhoto: (mode === 'create' ? publishedPhotos.coverPhoto : coverPhoto) || undefined,
      published,
      photos:
        mode === 'create'
          ? publishedPhotos.photos
          : photosToSave.map(({ filename, caption, lat, lng }) => ({
              filename,
              caption: caption || undefined,
              lat,
              lng,
            })),
      route,
    };

    try {
      const res = await fetch(mode === 'edit' ? `/api/posts/${slug}` : '/api/posts', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrors({ title: json.error ?? `Failed to save post (${res.status})` });
        if (mode === 'create') await persistDraft({ silent: true, force: true });
        return;
      }

      const json = (await res.json()) as { slug: string };
      if (mode === 'create' && draftId) {
        await deleteDraft(draftId).catch(() => undefined);
      }
      setSavedPublished(published);
      setSavedSlug(json.slug);
    } catch {
      if (mode === 'create') {
        await persistDraft({ force: true });
        setSaveNotice('No service right now. Draft saved on this device — publish when you are back online.');
      } else {
        setErrors({ title: 'Network error. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  async function handleDelete() {
    if (!slug) return;
    if (!window.confirm('Delete this post permanently? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrors({ title: json.error ?? `Failed to delete post (${res.status})` });
        setDeleting(false);
        return;
      }
      router.push('/');
    } catch {
      setErrors({ title: 'Network error. Please try again.' });
      setDeleting(false);
    }
  }

  async function openDraft(id: string) {
    const loaded = await getDraft(id).catch(() => null);
    if (!loaded) return;
    applyDraft(loaded);
    setDraftId(id);
    setLastSavedAt(loaded.draft.updatedAt);
    setComposeView('write');
  }

  function startNewDraft() {
    photosRef.current.forEach(revokePreview);
    setDraftId(newDraftId());
    setTitle('');
    setDate('');
    setExcerpt('');
    setBody('');
    setTrail('');
    setPhotos([]);
    setCoverPhoto('');
    setRoute(undefined);
    setErrors({});
    setSaveNotice('');
    setLastSavedAt('');
    setLocalDraftSaved(false);
  }

  async function removeLocalDraft(id: string) {
    if (!window.confirm('Delete this draft from this device?')) return;
    await deleteDraft(id).catch(() => undefined);
    const listed = await listDrafts().catch(() => []);
    setDrafts(listed);
    if (id === draftId) startNewDraft();
  }

  if (localDraftSaved) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Draft saved on this device</h1>
        <p className="text-stone-600 mb-8">
          Open <strong>View drafts</strong> on this page anytime to keep writing. Publish when you
          have service.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => {
              setLocalDraftSaved(false);
              setComposeView('drafts');
            }}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            View drafts
          </button>
          <button
            type="button"
            onClick={() => setLocalDraftSaved(false)}
            className="px-5 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Keep writing
          </button>
        </div>
      </div>
    );
  }

  if (savedSlug) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">
          {mode === 'edit' ? 'Post updated!' : savedPublished ? 'Post published!' : 'Draft saved'}
        </h1>
        <p className="text-stone-600 mb-8">
          {mode === 'edit'
            ? 'Your changes have been saved.'
            : savedPublished
              ? 'Your post is live on your journal.'
              : 'This draft is in your journal but stays private until you publish it.'}
        </p>
        <div className="flex gap-4 justify-center">
          {savedPublished && (
            <Link
              href={`/posts/${savedSlug}`}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              View post
            </Link>
          )}
          {mode === 'create' ? (
            <button
              type="button"
              onClick={() => {
                setSavedSlug(null);
                startNewDraft();
              }}
              className="px-5 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Write another
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSavedSlug(null)}
              className="px-5 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Continue editing
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mode === 'create' && composeView === 'write' && (
        <p className="text-sm text-stone-500">
          <button
            type="button"
            onClick={() => setComposeView('drafts')}
            className="text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            View drafts{drafts.length > 0 ? ` (${drafts.length})` : ''}
          </button>
        </p>
      )}
      {mode === 'create' && !online && composeView === 'write' && (
        <p className="text-sm rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">
          No service — photos and writing stay on this device. Publish when you have a connection.
        </p>
      )}
      {mode === 'create' && composeView === 'drafts' && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-800">Drafts on this phone</p>
            <button
              type="button"
              onClick={() => setComposeView('write')}
              className="text-sm text-emerald-700 hover:underline"
            >
              Write new
            </button>
          </div>
          {drafts.length === 0 ? (
            <p className="text-sm text-stone-500">
              No drafts on this phone yet. Write a post and tap Save as Draft.
            </p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((draft) => (
                <li key={draft.id} className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void openDraft(draft.id)}
                    className={`text-left min-w-0 ${draft.id === draftId ? 'text-emerald-800' : 'text-stone-800'}`}
                  >
                    <span className="block text-sm font-medium truncate">
                      {draftDisplayTitle(draft.title)}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {formatDraftTime(draft.updatedAt)}
                      {draft.photoCount > 0
                        ? ` · ${draft.photoCount} photo${draft.photoCount === 1 ? '' : 's'}`
                        : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeLocalDraft(draft.id)}
                    className="text-xs text-stone-400 hover:text-red-600 shrink-0"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(mode !== 'create' || composeView === 'write') && (
      <>
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="My hike on the PCT"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
      </div>

      {/* Trail */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="trail">
          Trail
        </label>
        <select
          id="trail"
          value={trail}
          onChange={(e) => setTrail(e.target.value as Trail | '')}
          className="border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">None</option>
          <option value="PCT">Pacific Crest Trail (PCT)</option>
          <option value="CDT">Continental Divide Trail (CDT)</option>
          <option value="AT">Appalachian Trail (AT)</option>
        </select>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="excerpt">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          placeholder="A short teaser shown on the home page"
        />
        {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt}</p>}
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Body
        </label>
        <MarkdownEditor value={body} onChange={setBody} />
        {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body}</p>}
      </div>

      {/* Photos */}
      <div>
        <p className="block text-sm font-medium text-stone-700 mb-2">Photos</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors text-sm text-stone-700">
          {uploading ? (mode === 'create' ? 'Adding…' : 'Uploading…') : 'Add photos'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handlePhotoUpload}
            disabled={uploading}
          />
        </label>
        {mode === 'create' && (
          <p className="mt-1 text-xs text-stone-500">
            Photos are kept on this device until you publish.
          </p>
        )}
        {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}

        {photos.length > 0 && (
          <div className="mt-4 space-y-4">
            {photos.map((photo, i) => (
              <div key={photo.id || photo.filename + i} className="flex gap-4 items-start border border-stone-200 rounded-lg p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={photo.filename}
                  className="w-24 h-24 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm text-stone-600 truncate">{photo.filename}</p>
                  <LocationPicker
                    lat={photo.lat}
                    lng={photo.lng}
                    trailGeoJson={trailGeoJson}
                    onChange={(lat, lng) => updatePhotoPosition(i, lat, lng)}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-stone-500" htmlFor={`lat-${i}`}>
                      GPS:
                    </label>
                    <input
                      id={`lat-${i}`}
                      type="number"
                      step="any"
                      value={photo.lat ?? ''}
                      onChange={(e) => updatePhotoCoord(i, 'lat', e.target.value)}
                      placeholder="Latitude"
                      className="w-28 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="number"
                      step="any"
                      value={photo.lng ?? ''}
                      onChange={(e) => updatePhotoCoord(i, 'lng', e.target.value)}
                      placeholder="Longitude"
                      aria-label="Longitude"
                      className="w-28 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={photo.caption ?? ''}
                    onChange={(e) => updatePhotoCaption(i, e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full border border-stone-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  className="text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GPS Track */}
      <div>
        <p className="block text-sm font-medium text-stone-700 mb-2">GPS Track (optional)</p>
        {route && route.length > 0 ? (
          <div className="flex items-center gap-3 text-sm text-stone-600">
            <span>Track loaded — {route.length} points.</span>
            <button
              type="button"
              onClick={() => setRoute(undefined)}
              className="text-red-600 hover:text-red-700 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors text-sm text-stone-700">
            Upload GPX file
            <input
              ref={gpxInputRef}
              type="file"
              accept=".gpx"
              className="sr-only"
              onChange={handleGpxUpload}
            />
          </label>
        )}
        {gpxError && <p className="mt-1 text-sm text-red-600">{gpxError}</p>}
      </div>

      {/* Cover photo */}
      {photos.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-stone-700 mb-2">Cover photo</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input
                type="radio"
                name="coverPhoto"
                value=""
                checked={coverPhoto === ''}
                onChange={() => setCoverPhoto('')}
              />
              None
            </label>
            {photos.map((photo, i) => (
              <label key={photo.id || photo.filename + i} className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="radio"
                  name="coverPhoto"
                  value={photo.id}
                  checked={coverPhoto === photo.id || coverPhoto === photo.filename}
                  onChange={() => setCoverPhoto(photo.id)}
                />
                {photo.filename}
              </label>
            ))}
          </div>
        </div>
      )}

      {saveNotice && (
        <p
          role="status"
          className={`text-sm rounded-md border px-3 py-2 ${
            /could not|not enough|failed/i.test(saveNotice)
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {saveNotice}
        </p>
      )}
      {mode === 'create' && lastSavedAt && !saveNotice && (
        <p className="text-xs text-stone-500">Draft saved on this device · {formatDraftTime(lastSavedAt)}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          data-offline-draft="1"
          onClick={() => void handleSubmit(false)}
          disabled={submitting || deleting}
          className="px-5 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit(true)}
          disabled={submitting || deleting}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting && online ? 'Publishing…' : 'Publish'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting || deleting}
            className="ml-auto px-5 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete post'}
          </button>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="text-xs text-stone-400 hover:text-stone-600 underline"
      >
        Log out
      </button>
      </>
      )}
    </div>
  );
}
