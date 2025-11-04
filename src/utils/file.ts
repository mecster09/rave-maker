import fs from 'fs';

export function readXml(filePath: string): string {
  const xml = fs.readFileSync(filePath, 'utf8');
  // Minimal sanity check — ensure looks like XML
  if (!xml.trim().startsWith('<')) {
    throw new Error('Invalid XML payload');
  }
  return xml;
}
