import type { VoronoiGrid } from '../core/voronoi.js';
import type { CoastlineData } from './coastline.js';
import type { ElevationMap } from './elevation.js';
import type { RiverNetwork } from './rivers.js';
import type { Rng } from '../core/rng.js';

export interface CountrySpec {
  name: string;
  archetype: 'island' | 'landlocked' | 'coastal' | 'peninsular';
}

export interface BorderConfig {
  countries: CountrySpec[];
}

export interface PoliticalMap {
  territories: Map<number, string>;
}

export function generateBorders(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  elevMap: ElevationMap,
  rivers: RiverNetwork,
  rng: Rng,
  config: BorderConfig
): PoliticalMap {
  const territories = new Map<number, string>();
  const riverCells = new Set(rivers.rivers.flatMap((r) => r.path));
  const unassigned = new Set(coastData.landCells);

  const seeds = placeSeeds(grid, coastData, config.countries, rng);

  for (const [countryName, seedCell] of seeds) {
    territories.set(seedCell, countryName);
    unassigned.delete(seedCell);
  }

  const queues = new Map<string, number[]>();
  for (const [countryName, seedCell] of seeds) {
    queues.set(countryName, [seedCell]);
  }

  while (unassigned.size > 0) {
    let grew = false;
    for (const spec of config.countries) {
      const queue = queues.get(spec.name)!;
      if (queue.length === 0) continue;

      const current = queue.shift()!;
      const neighbors = rng.shuffle([...(grid.adjacency.get(current) ?? [])]);

      for (const n of neighbors) {
        if (!unassigned.has(n)) continue;
        if (!isValidExpansion(n, spec, coastData)) continue;

        // ponytail: river boundary resistance - 30% skip chance
        const borderCost = riverCells.has(n) ? 0.3 : 0;
        if (borderCost > 0 && rng.next() < borderCost) continue;

        territories.set(n, spec.name);
        unassigned.delete(n);
        queue.push(n);
        grew = true;
      }
    }

    if (!grew) {
      // Fill gaps: assign to nearest neighbor respecting constraints
      for (const cell of unassigned) {
        const neighbors = grid.adjacency.get(cell) ?? [];
        const assignedNeighbors = neighbors.filter((n) => territories.has(n));

        for (const neighbor of assignedNeighbors) {
          const countryName = territories.get(neighbor)!;
          const spec = config.countries.find((c) => c.name === countryName);
          if (spec && isValidExpansion(cell, spec, coastData)) {
            territories.set(cell, countryName);
            unassigned.delete(cell);
            queues.get(countryName)!.push(cell);
            grew = true;
            break;
          }
        }
        if (grew) break;
      }

      // Edge case: isolated cells with no valid neighbors
      if (unassigned.size > 0 && !grew) {
        const remaining = [...unassigned][0];
        // Try to find any country that can validly expand to this cell
        for (const spec of config.countries) {
          if (isValidExpansion(remaining, spec, coastData)) {
            territories.set(remaining, spec.name);
            unassigned.delete(remaining);
            queues.get(spec.name)!.push(remaining);
            break;
          }
        }
      }
    }
  }

  return { territories };
}

function placeSeeds(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  countries: CountrySpec[],
  rng: Rng
): Map<string, number> {
  const seeds = new Map<string, number>();
  const used = new Set<number>();

  for (const spec of countries) {
    const candidates = getCandidatesForArchetype(spec.archetype, grid, coastData, used);
    if (candidates.length === 0) continue;
    const idx = rng.nextInt(0, candidates.length - 1);
    const seed = candidates[idx];
    seeds.set(spec.name, seed);
    used.add(seed);
  }

  return seeds;
}

function getCandidatesForArchetype(
  archetype: CountrySpec['archetype'],
  grid: VoronoiGrid,
  coastData: CoastlineData,
  used: Set<number>
): number[] {
  const available = [...coastData.landCells].filter((c) => !used.has(c));

  switch (archetype) {
    case 'coastal':
    case 'peninsular':
      return available.filter((c) => coastData.coastalCells.has(c));
    case 'landlocked':
      return available.filter((c) => !coastData.coastalCells.has(c));
    case 'island':
      return available.filter((c) => coastData.coastalCells.has(c));
    default:
      return available;
  }
}

function isValidExpansion(
  cell: number,
  spec: CountrySpec,
  coastData: CoastlineData
): boolean {
  if (spec.archetype === 'landlocked' && coastData.coastalCells.has(cell)) {
    return false;
  }
  return true;
}
