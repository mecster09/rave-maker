import { Simulator } from '../../src/simulator';

describe('Generator determinism (unit)', () => {
  it('produces deterministic data for identical seed + config', async () => {
    const simA = new Simulator();
    await simA.initialize('study.config.yaml');
    const simB = new Simulator();
    await simB.initialize('study.config.yaml');

    await simA.tick();
    await simB.tick();

    const formsA = await simA.getStorage().getForms(simA.getStudyId());
    const formsB = await simB.getStorage().getForms(simB.getStudyId());

    expect(formsA.length).toBe(formsB.length);
  });
});
