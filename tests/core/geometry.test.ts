import { describe, it, expect } from 'vitest';
import { distance, centroid, polygonArea } from '../../src/core/geometry.js';

describe('geometry', () => {
  it('distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('centroid of triangle', () => {
    const c = centroid([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }]);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(1);
  });

  it('polygon area of unit square', () => {
    const area = polygonArea([
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 1, y: 1 }, { x: 0, y: 1 }
    ]);
    expect(area).toBeCloseTo(1);
  });
});
