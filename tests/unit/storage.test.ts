import { InMemoryStorage } from '../../src/storage/InMemoryStorage';
import { buildStudyOID } from '../../src/odm/odmModels';

describe('storage/InMemoryStorage.ts', () => {
  it('stores and retrieves studies, sites, subjects, forms, and queries', async () => {
    const store = new InMemoryStorage();

    const study = { 
      oid: 'TestStudy(Test)', 
      projectName: 'TestStudy',
      environment: 'Test',
      name: 'Test Study', 
      metadataVersionOID: '1',
      config: {} as any 
    };
    await store.createStudy(study);
    await store.createSites([{ oid: 'SITE-A', studyOID: 'TestStudy(Test)', code: 'SITE-A', name: 'Site A' }]);
    await store.createSubjects([{ subjectKey: 'SUBJ-001', studyOID: 'TestStudy(Test)', siteOID: 'SITE-A' }]);
    await store.createForm({
      formOID: 'VITALS',
      repeatKey: 1,
      subjectKey: 'SUBJ-001',
      studyEventOID: 'SCREENING',
      studyEventRepeatKey: 1,
      itemGroupInstances: [{
        itemGroupOID: 'VITALS_LOG_LINE',
        items: [{ itemOID: 'VITALS.BP_SYSTOLIC', value: 120 }]
      }],
      lastUpdated: new Date().toISOString(),
    });
    await store.createQuery({
      id: 'q',
      studyOID: 'TestStudy(Test)',
      subjectKey: 'SUBJ-001',
      formOID: 'VITALS',
      itemOID: 'VITALS.BP_SYSTOLIC',
      type: 'OutOfRange',
      status: 'Open',
      queryText: 'Out of range value',
      createdAt: new Date().toISOString(),
    });

    expect(await store.getSubjects('TestStudy(Test)')).toHaveLength(1);
    expect(await store.getForms('TestStudy(Test)')).toHaveLength(1);
    expect(await store.getQueries('TestStudy(Test)')).toHaveLength(1);
  });
});
