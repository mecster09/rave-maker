import { InMemoryStorage } from '../../src/storage/InMemoryStorage';

describe('storage/InMemoryStorage.ts', () => {
  it('stores and retrieves studies, sites, subjects, forms, and queries', async () => {
    const store = new InMemoryStorage();

    const study = { id: 's', name: 'n', config: {} };
    await store.createStudy(study);
    await store.createSites([{ id: 'a', studyId: 's', code: 'A', name: 'Site A' }]);
    await store.createSubjects([{ id: 'b', studyId: 's', siteId: 'a', subjectCode: 'SUBJ-1' }]);
    await store.createForm({
      id: 'f',
      studyId: 's',
      subjectId: 'b',
      siteId: 'a',
      name: 'Vitals',
      data: { bp: 120 },
      lastUpdated: new Date().toISOString(),
    });
    await store.createQuery({
      id: 'q',
      studyId: 's',
      formId: 'f',
      field: 'bp',
      type: 'OutOfRange',
      status: 'Open',
      text: 'Out of range value',
      createdAt: new Date().toISOString(),
    });

    expect(await store.getSubjects('s')).toHaveLength(1);
    expect(await store.getForms('s')).toHaveLength(1);
    expect(await store.getQueries('s')).toHaveLength(1);
  });
});
