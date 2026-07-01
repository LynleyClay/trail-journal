export function photoUrl(slug: string, filename: string): string {
  return /^https?:\/\//.test(filename) ? filename : `/photos/${slug}/${filename}`;
}
