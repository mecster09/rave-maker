import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { readXml } from '../../src/utils/file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockRoot = path.resolve(__dirname, '..', '..', 'mockData');

describe('mock XML payloads', () => {
  it('metadata XML matches ODM namespace and metadata structure', () => {
    const xml = readXml(path.join(mockRoot, 'metadata.xml'));
    expect(xml).toContain('xmlns="http://www.cdisc.org/ns/odm/v1.3"');
    expect(xml).toContain('SourceSystem="Rave Mock"');
    expect(xml).toContain('<MetaDataVersion OID="MDV.RAVE.01" Name="Production Metadata">');
  });

  it('audit records XML wraps records and exposes simulator namespace', () => {
    const xml = readXml(path.join(mockRoot, 'auditRecords.xml'));
    expect(xml).toContain('xmlns="http://www.cdisc.org/ns/odm/v1.3"');
    expect(xml).toContain('<AuditRecords Mode="Full" Unicode="N">');
    expect(xml).toContain('<AuditRecord ID="1001"');
  });

  it('subjects XML includes study context and extended subject attributes', () => {
    const xml = readXml(path.join(mockRoot, 'subjects.xml'));
    expect(xml).toContain('<Subjects StudyOID="Mediflex(Prod)">');
    expect(xml).toContain('SecondarySubjectID="SUBJ-1001"');
    expect(xml).toContain('SiteOID="SITE001"');
    expect(xml).toContain('LocationOID="LOC001"');
  });
});
