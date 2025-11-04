export function ensureAuthorized(
  authHeader?: string | string[],
  expected: string = 'Basic TEST_TOKEN',
): boolean {
  if (!authHeader) return false;
  const match = (h: string) => h.trim() === expected;
  if (Array.isArray(authHeader)) {
    return authHeader.some(h => typeof h === 'string' && match(h));
  }
  return match(authHeader);
}
