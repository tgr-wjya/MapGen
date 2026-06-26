import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from './elevation.js';
import type { CoastlineData } from './coastline.js';

export interface RiverConfig {
  maxRivers: number;
  minLength: number;
}

export interface River {
  path: number[];
  flow: number[];
}

export interface RiverNetwork {
  rivers: River[];
}

export function generateRivers(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData,
  config: RiverConfig
): RiverNetwork {
  const downhill = buildDownhillGraph(grid, elevMap, coastData);
  const sources = findSources(grid, elevMap, coastData, downhill);
  const usedCells = new Set<number>();
  const rivers: River[] = [];

  for (const source of sources) {
    if (rivers.length >= config.maxRivers) break;
    const path = tracePath(source, downhill, coastData, usedCells);
    if (path.length < config.minLength) continue;

    const flow = computeFlow(path);
    rivers.push({ path, flow });
    for (const c of path) usedCells.add(c);
  }

  return { rivers };
}

function buildDownhillGraph(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData
): Map<number, number> {
  const downhill = new Map<number, number>();

  for (const cellIdx of coastData.landCells) {
    const neighbors = grid.adjacency.get(cellIdx) ?? [];
    let lowestNeighbor = -1;
    let lowestElev = elevMap.get(cellIdx)!;

    for (const n of neighbors) {
      const nElev = elevMap.get(n)!;
      if (nElev < lowestElev) {
        lowestElev = nElev;
        lowestNeighbor = n;
      }
    }

    if (lowestNeighbor !== -1) {
      downhill.set(cellIdx, lowestNeighbor);
    }
  }

  return downhill;
}

function findSources(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData,
  downhill: Map<number, number>
): number[] {
  const sources: Array<{ cell: number; elev: number }> = [];

  for (const cellIdx of coastData.landCells) {
    if (coastData.coastalCells.has(cellIdx)) continue;
    const elev = elevMap.get(cellIdx)!;
    if (elev > 0.65) {
      sources.push({ cell: cellIdx, elev });
    }
  }

  sources.sort((a, b) => b.elev - a.elev);
  return sources.map((s) => s.cell);
}

function tracePath(
  source: number,
  downhill: Map<number, number>,
  coastData: CoastlineData,
  usedCells: Set<number>
): number[] {
  const path: number[] = [source];
  const visited = new Set<number>([source]);
  let current = source;

  while (true) {
    const next = downhill.get(current);
    if (next === undefined) break;
    if (visited.has(next)) break;
    if (usedCells.has(next)) break;

    path.push(next);
    visited.add(next);

    if (coastData.seaCells.has(next) || coastData.coastalCells.has(next)) {
      break;
    }
    current = next;
  }

  return path;
}

function computeFlow(path: number[]): number[] {
  return path.map((_, i) => i + 1);
}
