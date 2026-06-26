import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';

describe('createRng', () => {
  it('produces deterministic sequence from same seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences from different seeds', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(99);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextInt returns values in [min, max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(3, 8);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(8);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('shuffle is deterministic and preserves elements', () => {
    const rng1 = createRng(55);
    const rng2 = createRng(55);
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];
    expect(rng1.shuffle(arr1)).toEqual(rng2.shuffle(arr2));
    expect(arr1.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
