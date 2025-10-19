import { randomFloat } from '../../src/utils/random';
import { SeededRNG } from '../../src/utils/seededRandom';

describe('utils/random.ts', () => {
  it('produces a float within range and respects custom step', () => {
    const value = randomFloat(1, 2, 0.25);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(2);
  });

  it('produces valid value when step omitted', () => {
    const value = randomFloat(1, 2);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(2);
  });
});

describe('utils/seededRandom.ts', () => {
  it('produces deterministic sequence for same seed', () => {
    const r1 = new SeededRNG(42);
    const r2 = new SeededRNG(42);
    const seq1 = Array.from({ length: 5 }, () => r1.next());
    const seq2 = Array.from({ length: 5 }, () => r2.next());
    expect(seq1).toEqual(seq2);
  });

  it('chance(p) returns roughly p proportion of true values', () => {
    const rng = new SeededRNG(1);
    const results = Array.from({ length: 1000 }, () => rng.chance(0.5));
    const ratio = results.filter(Boolean).length / results.length;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});
