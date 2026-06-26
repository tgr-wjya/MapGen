import { describe, it, expect } from 'vitest';
import { generateRivers } from '../../src/layers/rivers.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { createRng } from '../../src/core/rng.js';

describe('generateRivers', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 300, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);
  const config = { maxRivers: 5, minLength: 3 };

  it('generates rivers within limit', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    expect(network.rivers.length).toBeLessThanOrEqual(5);
    expect(network.rivers.length).toBeGreaterThan(0);
  });

  it('rivers flow downhill (elevation decreases along path)', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      for (let i = 1; i < river.path.length; i++) {
        const prevElev = elevMap.get(river.path[i - 1])!;
        const currElev = elevMap.get(river.path[i])!;
        expect(currElev).toBeLessThanOrEqual(prevElev);
      }
    }
  });

  it('rivers end at sea or map edge', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      const mouth = river.path[river.path.length - 1];
      const atSea = coastData.seaCells.has(mouth);
      const atCoast = coastData.coastalCells.has(mouth);
      expect(atSea || atCoast).toBe(true);
    }
  });

  it('rivers do not split (no cell appears in two rivers)', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    const allCells = network.rivers.flatMap((r) => r.path);
    const unique = new Set(allCells);
    expect(unique.size).toBe(allCells.length);
  });

  it('rivers meet minimum length', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      expect(river.path.length).toBeGreaterThanOrEqual(config.minLength);
    }
  });

  it('flow increases downstream', () => {
    const network = generateRivers(grid, elevMap, coastData, config);
    for (const river of network.rivers) {
      for (let i = 1; i < river.flow.length; i++) {
        expect(river.flow[i]).toBeGreaterThanOrEqual(river.flow[i - 1]);
      }
    }
  });
});
