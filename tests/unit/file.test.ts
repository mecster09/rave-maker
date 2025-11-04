import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { readXml } from '../../src/utils/file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockRoot = path.resolve(__dirname, '..', '..', 'mockData');

describe('file utils', () => {
  it('reads xml files', () => {
    const xml = readXml(path.join(mockRoot, 'metadata.xml'));
    expect(xml.trim().startsWith('<')).toBe(true);
  });
});
