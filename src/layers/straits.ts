import type { VoronoiGrid } from '../core/voronoi.js';
import type { CoastlineData } from './coastline.js';

export interface StraitConfig {
  maxWidth: number;
}

export interface Strait {
  landmassA: number;
  landmassB: number;
  seaCells: number[];
}

export function detectStraits(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  config: StraitConfig
): Strait[] {
  if (coastData.landmasses.length < 2) return [];

  const cellToLandmass = new Map<number, number>();
  coastData.landmasses.forEach((lm, idx) => {
    for (const cell of lm) cellToLandmass.set(cell, idx);
  });

  const straits: Strait[] = [];
  const found = new Set<string>();

  for (const coastCell of coastData.coastalCells) {
    const landmassIdx = cellToLandmass.get(coastCell)!;
    const paths = bfsToOtherLandmass(
      coastCell,
      landmassIdx,
      grid,
      coastData,
      cellToLandmass,
      config.maxWidth
    );

    for (const path of paths) {
      const key = [Math.min(landmassIdx, path.target), Math.max(landmassIdx, path.target)].join(
        '-'
      );
      if (found.has(key)) continue;
      found.add(key);
      straits.push({
        landmassA: landmassIdx,
        landmassB: path.target,
        seaCells: path.seaCells,
      });
    }
  }

  return straits;
}

function bfsToOtherLandmass(
  startLand: number,
  startLandmass: number,
  grid: VoronoiGrid,
  coastData: CoastlineData,
  cellToLandmass: Map<number, number>,
  maxWidth: number
): Array<{ target: number; seaCells: number[] }> {
  const results: Array<{ target: number; seaCells: number[] }> = [];
  const startNeighbors = (grid.adjacency.get(startLand) ?? []).filter((n) =>
    coastData.seaCells.has(n)
  );

  for (const seaStart of startNeighbors) {
    const visited = new Set<number>([seaStart]);
    const queue: Array<{ cell: number; path: number[] }> = [
      { cell: seaStart, path: [seaStart] },
    ];

    while (queue.length > 0) {
      const { cell, path } = queue.shift()!;
      if (path.length > maxWidth) continue;

      const neighbors = grid.adjacency.get(cell) ?? [];
      for (const n of neighbors) {
        if (coastData.landCells.has(n)) {
          const lm = cellToLandmass.get(n)!;
          if (lm !== startLandmass) {
            results.push({ target: lm, seaCells: path });
          }
          continue;
        }
        if (coastData.seaCells.has(n) && !visited.has(n) && path.length < maxWidth) {
          visited.add(n);
          queue.push({ cell: n, path: [...path, n] });
        }
      }
    }
  }

  return results;
}
