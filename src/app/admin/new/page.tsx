'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Trail, Photo } from '@/lib/posts';

const MarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor').then((m) => m.MarkdownEditor),
  { ssr: false }
);

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

export default function AdminNewPostPage() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [trail, setTrail] = useState<Trail | ''>('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [coverPhoto, setCoverPhoto] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Need a temporary slug for upload; derive from title or fallback
    const tempSlug = title.trim()
      ? title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-draft'
      : 'new-post-draft';

    setUploading(true);
    setUploadError('');

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', tempSlug);

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
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrors({ title: json.error ?? `Failed to save post (${res.status})` });
        return;
      }

      const { slug } = (await res.json()) as { slug: string };
      setCreatedSlug(slug);
    } catch {
      setErrors({ title: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (createdSlug) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Post saved!</h1>
        <p className="text-stone-600 mb-8">
          Your post has been created successfully.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href={`/posts/${createdSlug}`}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            View post
          </Link>
          <button
            onClick={() => {
              setCreatedSlug(null);
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
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-800 mb-8">New Post</h1>

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
                    {photo.lat !== undefined && photo.lng !== undefined && (
                      <p className="text-xs text-stone-400">
                        GPS: {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                      </p>
                    )}
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
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-5 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </main>
  );
}
