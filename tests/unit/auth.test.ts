import { describe, it, expect } from 'vitest';
import { ensureAuthorized } from '../../src/utils/auth';

describe('ensureAuthorized', () => {
  it('rejects missing header', () => {
    expect(ensureAuthorized(undefined)).toBe(false);
  });
  it('accepts correct token', () => {
    expect(ensureAuthorized('Basic TEST_TOKEN')).toBe(true);
  });
  it('rejects other tokens', () => {
    expect(ensureAuthorized('Basic XYZ')).toBe(false);
  });
  it('handles array header', () => {
    expect(ensureAuthorized(['Basic XYZ', 'Basic TEST_TOKEN'])).toBe(true);
  });
});
