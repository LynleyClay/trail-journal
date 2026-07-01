import { describe, it, expect } from 'vitest';
import { generateSlug } from '@/lib/slug';

describe('generateSlug', () => {
  it('lowercases and hyphenates a basic title', () => {
    const slug = generateSlug('Cascade Loops', '2026-06-15', []);
    expect(slug).toBe('cascade-loops-2026-06');
  });

  it('strips non-alphanumeric characters', () => {
    const slug = generateSlug("North Fork (Permit Area!)", '2026-07-01', []);
    expect(slug).toBe('north-fork-permit-area-2026-07');
  });

  it('collapses multiple hyphens', () => {
    const slug = generateSlug('A  --  Trail', '2026-08-10', []);
    expect(slug).toBe('a-trail-2026-08');
  });

  it('appends YYYY-MM from the date', () => {
    const slug = generateSlug('John Muir Trail', '2025-08-20', []);
    expect(slug).toContain('2025-08');
  });

  it('truncates to 80 characters', () => {
    const longTitle = 'A'.repeat(100);
    const slug = generateSlug(longTitle, '2026-01-01', []);
    expect(slug.length).toBeLessThanOrEqual(80);
  });

  it('appends -2 on first collision', () => {
    const existing = ['cascade-loops-2026-06'];
    const slug = generateSlug('Cascade Loops', '2026-06-15', existing);
    expect(slug).toBe('cascade-loops-2026-06-2');
  });

  it('appends -3 on second collision', () => {
    const existing = ['cascade-loops-2026-06', 'cascade-loops-2026-06-2'];
    const slug = generateSlug('Cascade Loops', '2026-06-15', existing);
    expect(slug).toBe('cascade-loops-2026-06-3');
  });

  it('returns URL-safe slug with only lowercase letters, digits, and hyphens', () => {
    const slug = generateSlug('Ötzi the Iceman', '2026-09-01', []);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});
