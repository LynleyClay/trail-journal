import { S3Client } from '@aws-sdk/client-s3';

export function hasR2Store(): boolean {
  return !!process.env.R2_ACCOUNT_ID && !!process.env.R2_ACCESS_KEY_ID;
}

export function r2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function r2Bucket(): string {
  return process.env.R2_BUCKET_NAME!;
}

// R2's public bucket URL is stable, so object URLs are deterministic from
// the key alone — no lookup call needed to find where something lives.
export function r2PublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
