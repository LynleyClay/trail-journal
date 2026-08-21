import { describe, it, expect } from 'vitest';
import { canClaimOwnerAccount } from '@/lib/users';

describe('canClaimOwnerAccount', () => {
  it('allows registering the owner trail name when it has no password yet', () => {
    expect(
      canClaimOwnerAccount(
        { username: 'lynley', passwordHash: '' },
        'lynley',
      ),
    ).toBe(true);
  });

  it('rejects a different trail name', () => {
    expect(
      canClaimOwnerAccount({ username: 'trash', passwordHash: '' }, 'lynley'),
    ).toBe(false);
  });

  it('rejects the owner trail name after it already has a password', () => {
    expect(
      canClaimOwnerAccount(
        { username: 'lynley', passwordHash: 'salt:hash' },
        'lynley',
      ),
    ).toBe(false);
  });
});
