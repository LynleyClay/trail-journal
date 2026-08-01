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

const { sendMock, putObjectCommandMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({}),
  // Regular function (not arrow) so it can be used as a constructor with `new`.
  putObjectCommandMock: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = sendMock;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: putObjectCommandMock,
  };
});

import { POST } from '@/app/api/upload/route';

const R2_ENV_VARS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];

afterEach(() => {
  vi.clearAllMocks();
  for (const key of R2_ENV_VARS) delete process.env[key];
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

  it('uploads to R2 and returns its deterministic public URL when configured', async () => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev';

    const req = makeUploadRequest('cover.jpg', 'image/jpeg', 100);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = (await res.json()) as { filename: string; url: string };
    expect(json.url).toMatch(/^https:\/\/pub-test\.r2\.dev\/photos\/\d+-cover\.jpg$/);
    expect(json.filename).toBe(json.url);
    expect(sendMock).toHaveBeenCalled();
    expect(putObjectCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'test-bucket', ContentType: 'image/jpeg' })
    );
  });
});
