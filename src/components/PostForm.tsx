'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FeatureCollection } from 'geojson';
import type { Trail, Photo } from '@/lib/posts';

const MarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor').then((m) => m.MarkdownEditor),
  { ssr: false }
);

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

interface UploadedPhoto extends Photo {
  url: string;
  previewUrl: string;
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
  photos: UploadedPhoto[];
}

interface PostFormProps {
  mode: 'create' | 'edit';
  slug?: string;
  initialData?: PostFormInitialData;
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

export function PostForm({ mode, slug, initialData }: PostFormProps) {
  const router = useRouter();
  const data = initialData ?? EMPTY_DATA;

  const [title, setTitle] = useState(data.title);
  const [date, setDate] = useState(data.date);
  const [excerpt, setExcerpt] = useState(data.excerpt);
  const [body, setBody] = useState(data.body);
  const [trail, setTrail] = useState<Trail | ''>(data.trail);
  const [trailGeoJson, setTrailGeoJson] = useState<FeatureCollection | undefined>(undefined);
  const [photos, setPhotos] = useState<UploadedPhoto[]>(data.photos);
  const [coverPhoto, setCoverPhoto] = useState(data.coverPhoto);
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Uploads need a slug: use the real one when editing, otherwise a
    // temporary draft slug derived from the title (the real slug isn't
    // known until the post is created).
    const uploadSlug =
      slug ??
      (title.trim()
        ? title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-draft'
        : 'new-post-draft');

    setUploading(true);
    setUploadError('');

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

        // Extract GPS from EXIF client-side
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
          { filename, url, previewUrl, caption: '', lat, lng },
        ]);
      } catch {
        setUploadError('Network error during upload.');
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const updated = prev.filter((_, i) => i !== index);
      if (coverPhoto === prev[index]?.filename) setCoverPhoto('');
      return updated;
    });
  }

  async function handleSubmit(published: boolean) {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      date,
      excerpt: excerpt.trim(),
      body,
      trail: trail || undefined,
      coverPhoto: coverPhoto || undefined,
      published,
      photos: photos.map(({ filename, caption, lat, lng }) => ({
        filename,
        caption: caption || undefined,
        lat,
        lng,
      })),
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
        return;
      }

      const json = (await res.json()) as { slug: string };
      setSavedSlug(json.slug);
    } catch {
      setErrors({ title: 'Network error. Please try again.' });
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

  if (savedSlug) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">
          {mode === 'edit' ? 'Post updated!' : 'Post saved!'}
        </h1>
        <p className="text-stone-600 mb-8">
          {mode === 'edit'
            ? 'Your changes have been saved.'
            : 'Your post has been created successfully.'}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href={`/posts/${savedSlug}`}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            View post
          </Link>
          {mode === 'create' ? (
            <button
              onClick={() => {
                setSavedSlug(null);
                setTitle('');
                setDate('');
                setExcerpt('');
                setBody('');
                setTrail('');
                setPhotos([]);
                setCoverPhoto('');
              }}
              className="px-5 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Write another
            </button>
          ) : (
            <button
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
          {uploading ? 'Uploading…' : 'Add photos'}
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
        {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}

        {photos.length > 0 && (
          <div className="mt-4 space-y-4">
            {photos.map((photo, i) => (
              <div key={photo.filename + i} className="flex gap-4 items-start border border-stone-200 rounded-lg p-3">
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
              <label key={photo.filename + i} className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="radio"
                  name="coverPhoto"
                  value={photo.filename}
                  checked={coverPhoto === photo.filename}
                  onChange={() => setCoverPhoto(photo.filename)}
                />
                {photo.filename}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting || deleting}
          className="px-5 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting || deleting}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          Publish
        </button>
        {mode === 'edit' && (
          <button
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
    </div>
  );
}
