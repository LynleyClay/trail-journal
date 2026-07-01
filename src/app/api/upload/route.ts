import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const slug = formData.get('slug');
  const file = formData.get('file');

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 413 });
  }

  const safeName = sanitizeFilename(file.name);
  const dir = path.join(process.cwd(), 'public', 'photos', slug);
  fs.mkdirSync(dir, { recursive: true });

  // Resolve filename collision
  let filename = safeName;
  let counter = 1;
  while (fs.existsSync(path.join(dir, filename))) {
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    filename = `${base}-${counter}${ext}`;
    counter++;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const tmpPath = path.join(dir, `${filename}.tmp`);
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, path.join(dir, filename));

  return NextResponse.json(
    { filename, url: `/photos/${slug}/${filename}` },
    { status: 201 }
  );
}
