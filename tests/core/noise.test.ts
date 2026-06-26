import { describe, it, expect } from 'vitest';
import { createNoiseSampler } from '../../src/core/noise.js';

describe('createNoiseSampler', () => {
  it('returns values in [-1, 1]', () => {
    const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
    for (let x = 0; x < 100; x += 5) {
      for (let y = 0; y < 100; y += 5) {
        const val = sampler.sample(x, y);
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it('deterministic with same seed', () => {
    const s1 = createNoiseSampler(42, 4, 2.0, 0.5);
    const s2 = createNoiseSampler(42, 4, 2.0, 0.5);
    for (let x = 0; x < 50; x += 10) {
      for (let y = 0; y < 50; y += 10) {
        expect(s1.sample(x, y)).toBe(s2.sample(x, y));
      }
    }
  });

  it('different seeds produce different values', () => {
    const s1 = createNoiseSampler(42, 4, 2.0, 0.5);
    const s2 = createNoiseSampler(99, 4, 2.0, 0.5);
    let same = 0;
    for (let x = 0; x < 50; x += 5) {
      if (s1.sample(x, 0) === s2.sample(x, 0)) same++;
    }
    expect(same).toBeLessThan(5);
  });

  it('more octaves produces more detail variation', () => {
    const smooth = createNoiseSampler(42, 1, 2.0, 0.5);
    const detailed = createNoiseSampler(42, 6, 2.0, 0.5);
    let smoothDiffs = 0;
    let detailedDiffs = 0;
    for (let x = 0; x < 100; x++) {
      smoothDiffs += Math.abs(smooth.sample(x, 0) - smooth.sample(x + 0.1, 0));
      detailedDiffs += Math.abs(detailed.sample(x, 0) - detailed.sample(x + 0.1, 0));
    }
    expect(detailedDiffs).toBeGreaterThan(smoothDiffs);
  });
});
