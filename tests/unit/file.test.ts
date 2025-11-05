import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { readXml } from '../../src/utils/file';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockRoot = path.resolve(__dirname, '..', '..', 'mockData');

describe('file utils', () => {
  it('reads xml files', () => {
    const xml = readXml(path.join(mockRoot, 'metadata.xml'));
    expect(xml.trim().startsWith('<')).toBe(true);
  });

  it('throws for non-xml content', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockReturnValue('plain text');
    expect(() => readXml('fake.xml')).toThrowError('Invalid XML payload');
    spy.mockRestore();
  });

  it('propagates fs read errors', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => readXml('missing.xml')).toThrowError('boom');
    spy.mockRestore();
  });
});
