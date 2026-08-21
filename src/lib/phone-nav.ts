export type PhoneNavId = 'journal' | 'map' | 'note';

/** Guests land on the public trail map; signed-in hikers go to their current routes. */
export function phoneMapHref(isLoggedIn: boolean): string {
  return isLoggedIn ? '/map?tab=active' : '/map';
}

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
