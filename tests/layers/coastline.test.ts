import { describe, it, expect } from 'vitest';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { createRng } from '../../src/core/rng.js';

describe('detectCoastlines', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 200, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });

  it('land + sea = total cells', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    expect(coast.landCells.size + coast.seaCells.size).toBe(200);
  });

  it('coastal cells are subset of land cells', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    for (const c of coast.coastalCells) {
      expect(coast.landCells.has(c)).toBe(true);
    }
  });

  it('coastal cells have at least one sea neighbor', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    for (const c of coast.coastalCells) {
      const neighbors = grid.adjacency.get(c)!;
      const hasSeaNeighbor = neighbors.some((n) => coast.seaCells.has(n));
      expect(hasSeaNeighbor).toBe(true);
    }
  });

  it('landmasses are non-empty connected components', () => {
    const coast = detectCoastlines(grid, elevMap, 0.4);
    expect(coast.landmasses.length).toBeGreaterThan(0);
    const allLand = coast.landmasses.flat();
    expect(new Set(allLand).size).toBe(coast.landCells.size);
  });
});
