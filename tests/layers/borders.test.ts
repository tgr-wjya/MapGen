import { describe, it, expect } from 'vitest';
import { generateBorders } from '../../src/layers/borders.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generateRivers } from '../../src/layers/rivers.js';
import { createRng } from '../../src/core/rng.js';

describe('generateBorders', () => {
  const rng = createRng(42);
  const points = generatePoints(800, 600, 300, rng);
  const grid = buildVoronoi(points, 800, 600);
  const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
  const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
  const coastData = detectCoastlines(grid, elevMap, 0.4);
  const rivers = generateRivers(grid, elevMap, coastData, { maxRivers: 5, minLength: 3 });
  const borderRng = createRng(42);

  const config = {
    countries: [
      { name: 'Aetheria', archetype: 'coastal' as const },
      { name: 'Valdris', archetype: 'landlocked' as const },
      { name: 'Marukai', archetype: 'coastal' as const },
    ],
  };

  it('assigns every land cell to a country', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    for (const cell of coastData.landCells) {
      expect(political.territories.has(cell)).toBe(true);
    }
  });

  it('does not assign sea cells', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    for (const cell of coastData.seaCells) {
      expect(political.territories.has(cell)).toBe(false);
    }
  });

  it('creates requested number of countries', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const countries = new Set(political.territories.values());
    expect(countries.size).toBe(3);
  });

  it('each territory is contiguous', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const countryCells = new Map<string, Set<number>>();
    for (const [cell, country] of political.territories) {
      if (!countryCells.has(country)) countryCells.set(country, new Set());
      countryCells.get(country)!.add(cell);
    }

    for (const [_, cells] of countryCells) {
      const visited = new Set<number>();
      const start = cells.values().next().value!;
      const queue = [start];
      visited.add(start);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const n of grid.adjacency.get(current) ?? []) {
          if (cells.has(n) && !visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      expect(visited.size).toBe(cells.size);
    }
  });

  it('landlocked country has no coastal cells', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const valdrisCells: number[] = [];
    for (const [cell, country] of political.territories) {
      if (country === 'Valdris') valdrisCells.push(cell);
    }
    if (valdrisCells.length > 0) {
      const hasCoast = valdrisCells.some((c) => coastData.coastalCells.has(c));
      expect(hasCoast).toBe(false);
    }
  });

  it('coastal country has at least one coastal cell', () => {
    const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, config);
    const aetheriaCells: number[] = [];
    for (const [cell, country] of political.territories) {
      if (country === 'Aetheria') aetheriaCells.push(cell);
    }
    const hasCoast = aetheriaCells.some((c) => coastData.coastalCells.has(c));
    expect(hasCoast).toBe(true);
  });
});
