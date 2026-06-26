import { describe, it, expect } from 'vitest';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createRng } from '../../src/core/rng.js';

describe('generatePoints', () => {
  it('generates correct number of points', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 100, rng);
    expect(points).toHaveLength(100);
  });

  it('all points within bounds', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });

  it('deterministic with same seed', () => {
    const p1 = generatePoints(800, 600, 50, createRng(42));
    const p2 = generatePoints(800, 600, 50, createRng(42));
    expect(p1).toEqual(p2);
  });
});

describe('buildVoronoi', () => {
  it('produces one cell per point', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    expect(grid.cells).toHaveLength(50);
  });

  it('each cell has a polygon with at least 3 vertices', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    for (const cell of grid.cells) {
      expect(cell.polygon.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('adjacency map has entry for every cell', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    expect(grid.adjacency.size).toBe(50);
  });

  it('adjacency is symmetric', () => {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 50, rng);
    const grid = buildVoronoi(points, 800, 600);
    for (const [cellIdx, neighbors] of grid.adjacency) {
      for (const n of neighbors) {
        expect(grid.adjacency.get(n)).toContain(cellIdx);
      }
    }
  });
});
