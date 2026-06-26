import { describe, it, expect } from 'vitest';
import { assignElevation } from '../../src/layers/elevation.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { createRng } from '../../src/core/rng.js';

describe('assignElevation', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 100, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const config = { seaLevel: 0.4, mountainScale: 1.0 };

  it('assigns elevation to every cell', () => {
    const elevMap = assignElevation(grid, sampler, config);
    expect(elevMap.size).toBe(100);
  });

  it('all elevations in [0, 1]', () => {
    const elevMap = assignElevation(grid, sampler, config);
    for (const elev of elevMap.values()) {
      expect(elev).toBeGreaterThanOrEqual(0);
      expect(elev).toBeLessThanOrEqual(1);
    }
  });

  it('some cells above sea level, some below', () => {
    const elevMap = assignElevation(grid, sampler, config);
    const above = [...elevMap.values()].filter((e) => e > config.seaLevel);
    const below = [...elevMap.values()].filter((e) => e <= config.seaLevel);
    expect(above.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
  });

  it('deterministic', () => {
    const e1 = assignElevation(grid, sampler, config);
    const e2 = assignElevation(grid, sampler, config);
    expect([...e1.entries()]).toEqual([...e2.entries()]);
  });
});
