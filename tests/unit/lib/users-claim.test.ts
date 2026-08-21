import { describe, it, expect } from 'vitest';
import { canClaimOwnerAccount, isValidTrailName, trailNameToSlug } from '@/lib/users';

describe('trailNameToSlug', () => {
  it('turns LynleyClay into a login slug', () => {
    expect(trailNameToSlug('LynleyClay')).toBe('lynleyclay');
  });

  it('accepts a trail name with an emoji at the end', () => {
    expect(isValidTrailName('Bovi 🐄')).toBe(true);
  });
});

describe('canClaimOwnerAccount', () => {
  it('allows registering the owner trail name when it has no password yet', () => {
    expect(
      canClaimOwnerAccount(
        { id: 'user-lynley', username: 'lynley', passwordHash: '' },
        'bovi',
      ),
    ).toBe(true);
  });

  it('rejects a different trail name', () => {
    expect(
      canClaimOwnerAccount({ id: 'user-trash', username: 'trash', passwordHash: '' }, 'bovi'),
    ).toBe(false);
  });

  it('rejects the owner trail name after it already has a password', () => {
    expect(
      canClaimOwnerAccount(
        { id: 'user-lynley', username: 'bovi', passwordHash: 'salt:hash' },
        'bovi',
      ),
    ).toBe(false);
  });
});
