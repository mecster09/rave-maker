// ==========================================
// ODM Builder Tests
// ==========================================

import { 
  buildODM, 
  buildClinicalData, 
  buildSubjectData, 
  buildStudyEventData,
  buildFormData,
  buildItemGroupData,
  buildItemData,
  buildStudy,
  buildRWSStudies,
  buildRWSSubjects,
  buildClinicalDataset
} from '../../src/odm/builder';
import { XMLParser } from 'fast-xml-parser';

describe('ODM Builder', () => {
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  describe('buildItemData()', () => {
    it('creates item data with string value', () => {
      const item = buildItemData('ITEM.FIELD1', 'test value');
      expect(item['@_ItemOID']).toBe('ITEM.FIELD1');
      expect(item['@_Value']).toBe('test value');
    });

    it('creates item data with numeric value', () => {
      const item = buildItemData('ITEM.FIELD2', 120);
      expect(item['@_ItemOID']).toBe('ITEM.FIELD2');
      expect(item['@_Value']).toBe('120');
    });
  });

  describe('buildItemGroupData()', () => {
    it('creates item group with items', () => {
      const items = [
        buildItemData('ITEM.FIELD1', 'value1'),
        buildItemData('ITEM.FIELD2', 'value2')
      ];
      const group = buildItemGroupData('GROUP_OID', items);
      
      expect(group['@_ItemGroupOID']).toBe('GROUP_OID');
      expect(group.ItemData).toHaveLength(2);
    });

    it('creates empty item group', () => {
      const group = buildItemGroupData('GROUP_OID');
      expect(group['@_ItemGroupOID']).toBe('GROUP_OID');
      expect(group.ItemData).toBeUndefined();
    });
  });

  describe('buildFormData()', () => {
    it('creates form data with item groups', () => {
      const itemGroups = [
        buildItemGroupData('GROUP1', [buildItemData('ITEM1', 'val1')])
      ];
      const form = buildFormData('FORM_OID', 1, itemGroups);
      
      expect(form['@_FormOID']).toBe('FORM_OID');
      expect(form['@_FormRepeatKey']).toBe('1');
      expect(form.ItemGroupData).toHaveLength(1);
    });
  });

  describe('buildStudyEventData()', () => {
    it('creates study event with forms', () => {
      const forms = [
        buildFormData('FORM1', 1, [])
      ];
      const event = buildStudyEventData('SCREENING', 1, forms);
      
      expect(event['@_StudyEventOID']).toBe('SCREENING');
      expect(event['@_StudyEventRepeatKey']).toBe('1');
      expect(event.FormData).toHaveLength(1);
    });
  });

  describe('buildSubjectData()', () => {
    it('creates subject data with site reference', () => {
      const subject = buildSubjectData('SUBJ-001', 'SITE-1', []);
      
      expect(subject['@_SubjectKey']).toBe('SUBJ-001');
      expect(subject.SiteRef).toBeDefined();
      expect(subject.SiteRef!['@_LocationOID']).toBe('SITE-1');
    });

    it('creates subject data without site reference', () => {
      const subject = buildSubjectData('SUBJ-001');
      
      expect(subject['@_SubjectKey']).toBe('SUBJ-001');
      expect(subject.SiteRef).toBeUndefined();
    });
  });

  describe('buildClinicalData()', () => {
    it('creates clinical data element', () => {
      const subjects = [buildSubjectData('SUBJ-001', 'SITE-1')];
      const clinicalData = buildClinicalData('Study(Prod)', '1', subjects);
      
      expect(clinicalData['@_StudyOID']).toBe('Study(Prod)');
      expect(clinicalData['@_MetaDataVersionOID']).toBe('1');
      expect(clinicalData.SubjectData).toHaveLength(1);
    });
  });

  describe('buildStudy()', () => {
    it('creates study metadata element', () => {
      const study = buildStudy('Study(Prod)', 'My Study', 'Study Description');
      
      expect(study['@_OID']).toBe('Study(Prod)');
      expect(study.GlobalVariables?.StudyName).toBe('My Study');
      expect(study.GlobalVariables?.StudyDescription).toBe('Study Description');
    });
  });

  describe('buildODM()', () => {
    it('generates valid ODM XML structure', () => {
      const clinicalData = buildClinicalData('Study(Test)', '1', []);
      const xml = buildODM(clinicalData);
      
      expect(xml).toContain('<?xml');
      expect(xml).toContain('<ODM');
      expect(xml).toContain('ODMVersion="1.3"');
      expect(xml).toContain('xmlns="http://www.cdisc.org/ns/odm/v1.3"');
      expect(xml).toContain('<ClinicalData');
      expect(xml).toContain('StudyOID="Study(Test)"');
    });

    it('includes FileOID and CreationDateTime', () => {
      const xml = buildODM();
      const parsed = xmlParser.parse(xml);
      
      expect(parsed.ODM['@_FileOID']).toBeDefined();
      expect(parsed.ODM['@_CreationDateTime']).toBeDefined();
      expect(parsed.ODM['@_FileType']).toBe('Snapshot');
    });
  });

  describe('buildRWSStudies()', () => {
    it('generates studies list XML', () => {
      const studies = [
        { oid: 'Study1(Prod)', name: 'Study 1', description: 'First study' },
        { oid: 'Study2(Test)', name: 'Study 2' }
      ];
      const xml = buildRWSStudies(studies);
      
      expect(xml).toContain('<Study');
      expect(xml).toContain('OID="Study1(Prod)"');
      expect(xml).toContain('<StudyName>Study 1</StudyName>');
      expect(xml).toContain('<StudyDescription>First study</StudyDescription>');
    });
  });

  describe('buildRWSSubjects()', () => {
    it('generates subjects list XML', () => {
      const subjectKeys = ['SUBJ-001', 'SUBJ-002', 'SUBJ-003'];
      const xml = buildRWSSubjects('Study(Prod)', '1', subjectKeys);
      
      expect(xml).toContain('<ClinicalData');
      expect(xml).toContain('StudyOID="Study(Prod)"');
      expect(xml).toContain('MetaDataVersionOID="1"');
      expect(xml).toContain('<SubjectData');
      expect(xml).toContain('SubjectKey="SUBJ-001"');
      expect(xml).toContain('SubjectKey="SUBJ-002"');
    });
  });

  describe('buildClinicalDataset()', () => {
    it('generates complete clinical data ODM', () => {
      const subjects = [
        {
          subjectKey: 'SUBJ-001',
          siteOID: 'SITE-1',
          events: [
            {
              eventOID: 'SCREENING',
              repeatKey: 1,
              forms: [
                {
                  formOID: 'VITALS',
                  repeatKey: 1,
                  itemGroups: [
                    {
                      itemGroupOID: 'VITALS_LOG',
                      items: [
                        { itemOID: 'VITALS.BP_SYSTOLIC', value: 120 },
                        { itemOID: 'VITALS.BP_DIASTOLIC', value: 80 }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const xml = buildClinicalDataset('Study(Test)', '1', subjects);
      const parsed = xmlParser.parse(xml);
      
      expect(parsed.ODM).toBeDefined();
      expect(parsed.ODM.ClinicalData).toBeDefined();
      
      const clinicalData = parsed.ODM.ClinicalData;
      expect(clinicalData['@_StudyOID']).toBe('Study(Test)');
      expect(clinicalData['@_MetaDataVersionOID']).toBe('1');
      
      const subjectData = clinicalData.SubjectData;
      expect(subjectData['@_SubjectKey']).toBe('SUBJ-001');
      expect(subjectData.SiteRef['@_LocationOID']).toBe('SITE-1');
      
      const studyEventData = subjectData.StudyEventData;
      expect(studyEventData['@_StudyEventOID']).toBe('SCREENING');
      
      const formData = studyEventData.FormData;
      expect(formData['@_FormOID']).toBe('VITALS');
      
      const itemGroupData = formData.ItemGroupData;
      expect(itemGroupData['@_ItemGroupOID']).toBe('VITALS_LOG');
      
      const items = itemGroupData.ItemData;
      expect(items).toHaveLength(2);
      expect(items[0]['@_ItemOID']).toBe('VITALS.BP_SYSTOLIC');
      expect(items[0]['@_Value']).toBe('120');
    });
  });
});
