export function ensureAuthorized(authHeader?: string | string[]): boolean {
  if (!authHeader) return false;
  if (Array.isArray(authHeader)) {
    return authHeader.some(h => typeof h === 'string' && h.trim() === 'Basic TEST_TOKEN');
  }
  return authHeader.trim() === 'Basic TEST_TOKEN';
}
