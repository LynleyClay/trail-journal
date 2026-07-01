// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { writeFileSyncMock, mkdirSyncMock, renameSyncMock, existsSyncMock } = vi.hoisted(() => ({
  writeFileSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  renameSyncMock: vi.fn(),
  existsSyncMock: vi.fn().mockReturnValue(false),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  writeFileSync: writeFileSyncMock,
  mkdirSync: mkdirSyncMock,
  renameSync: renameSyncMock,
  readFileSync: vi.fn(),
}));

const { putMock } = vi.hoisted(() => ({
  putMock: vi.fn().mockResolvedValue({ url: 'https://example.public.blob.vercel-storage.com/photos/1-cover.jpg' }),
}));

vi.mock('@vercel/blob', () => ({ put: putMock }));

import { POST } from '@/app/api/upload/route';

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

function makeUploadRequest(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  slug = 'test-post'
): NextRequest {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type: mimeType });
  const formData = new FormData();
  formData.append('file', new File([blob], filename, { type: mimeType }));
  formData.append('slug', slug);

  // Do not set headers manually — FormData auto-sets Content-Type with boundary
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/upload', () => {
  it('returns 201 with filename and url for a valid JPEG', async () => {
    existsSyncMock.mockReturnValue(false);
    const req = makeUploadRequest('cover.jpg', 'image/jpeg', 100);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json() as { filename: string; url: string };
    expect(json.filename).toBeTruthy();
    expect(json.url).toContain('/photos/test-post/');
  });

  it('returns 400 for a non-image MIME type', async () => {
    const req = makeUploadRequest('evil.exe', 'application/octet-stream', 100);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 413 when file exceeds 20 MB', async () => {
    const twentyOneMB = 21 * 1024 * 1024;
    const req = makeUploadRequest('huge.jpg', 'image/jpeg', twentyOneMB);
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('uploads to Vercel Blob and returns its absolute URL when BLOB_READ_WRITE_TOKEN is set', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    const req = makeUploadRequest('cover.jpg', 'image/jpeg', 100);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = (await res.json()) as { filename: string; url: string };
    expect(json.url).toBe('https://example.public.blob.vercel-storage.com/photos/1-cover.jpg');
    expect(json.filename).toBe(json.url);
    expect(putMock).toHaveBeenCalled();
  });
});
