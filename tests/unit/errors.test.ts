import { describe, it, expect } from 'vitest';
import { rwsError, escapeXml } from '../../src/utils/errors';

describe('errors utils', () => {
  it('escapes xml', () => {
    expect(escapeXml('<bad & "worse">')).toBe('&lt;bad &amp; &quot;worse&quot;&gt;');
  });
  it('formats RWS error response', () => {
    const xml = rwsError('RWS00100', 'Internal');
    expect(xml).toBe('<Response ReasonCode="RWS00100" ErrorClientResponseMessage="Internal"/>');
  });
});
