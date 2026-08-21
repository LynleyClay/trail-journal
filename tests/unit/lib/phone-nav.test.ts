import { describe, it, expect } from 'vitest';
import { phoneNavActive } from '@/lib/phone-nav';
import { todayIsoDate } from '@/lib/offline/drafts';

describe('phoneNavActive', () => {
  it('treats map routes as the Map tab', () => {
    expect(phoneNavActive('/map')).toBe('map');
    expect(phoneNavActive('/map?tab=active')).toBe('map');
  });

  it('treats writing screens as the Note tab', () => {
    expect(phoneNavActive('/note')).toBe('note');
    expect(phoneNavActive('/admin/new')).toBe('note');
    expect(phoneNavActive('/admin/edit/foo')).toBe('note');
  });

  it('treats everything else as Journal', () => {
    expect(phoneNavActive('/')).toBe('journal');
    expect(phoneNavActive('/posts/foo')).toBe('journal');
  });
});

describe('todayIsoDate', () => {
  it('formats the local calendar date', () => {
    expect(todayIsoDate(new Date(2026, 7, 20))).toBe('2026-08-20');
  });
});
