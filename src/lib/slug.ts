export function generateSlug(
  title: string,
  date: string,
  existingSlugs: string[]
): string {
  const yearMonth = date.slice(0, 7); // "YYYY-MM"

  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const withDate = `${base}-${yearMonth}`;

  // Truncate so the base+date fits in 80 chars, leaving room for collision suffix
  const truncated = withDate.length > 80 ? withDate.slice(0, 80).replace(/-+$/, '') : withDate;

  if (!existingSlugs.includes(truncated)) {
    return truncated;
  }

  let counter = 2;
  while (existingSlugs.includes(`${truncated}-${counter}`)) {
    counter++;
  }
  return `${truncated}-${counter}`;
}
