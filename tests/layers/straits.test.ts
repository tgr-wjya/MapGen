import { describe, it, expect } from 'vitest';
import { detectStraits } from '../../src/layers/straits.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { createRng } from '../../src/core/rng.js';

describe('detectStraits', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 300, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);

  it('returns empty array if only one landmass', () => {
    const singleLandCoast = { ...coastData, landmasses: [coastData.landmasses.flat()] };
    const straits = detectStraits(grid, singleLandCoast, { maxWidth: 3 });
    expect(straits).toEqual([]);
  });

  it('strait connects two different landmasses', () => {
    if (coastData.landmasses.length < 2) return;
    const straits = detectStraits(grid, coastData, { maxWidth: 5 });
    for (const strait of straits) {
      expect(strait.landmassA).not.toBe(strait.landmassB);
    }
  });

  it('strait sea cells are all sea', () => {
    const straits = detectStraits(grid, coastData, { maxWidth: 5 });
    for (const strait of straits) {
      for (const cell of strait.seaCells) {
        expect(coastData.seaCells.has(cell)).toBe(true);
      }
    }
  });

  it('strait width does not exceed maxWidth', () => {
    const maxWidth = 3;
    const straits = detectStraits(grid, coastData, { maxWidth });
    for (const strait of straits) {
      expect(strait.seaCells.length).toBeLessThanOrEqual(maxWidth);
    }
  });
});
