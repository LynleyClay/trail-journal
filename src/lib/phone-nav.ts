export type PhoneNavId = 'journal' | 'map' | 'note';

export function phoneNavActive(pathname: string): PhoneNavId {
  if (pathname.startsWith('/map')) return 'map';
  if (
    pathname.startsWith('/note') ||
    pathname.startsWith('/drafts') ||
    pathname.startsWith('/admin/new') ||
    pathname.startsWith('/admin/edit')
  ) {
    return 'note';
  }
  return 'journal';
}
