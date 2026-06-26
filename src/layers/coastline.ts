import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from './elevation.js';

export interface CoastlineData {
  landCells: Set<number>;
  seaCells: Set<number>;
  coastalCells: Set<number>;
  landmasses: number[][];
}

export function detectCoastlines(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  seaLevel: number
): CoastlineData {
  const landCells = new Set<number>();
  const seaCells = new Set<number>();

  for (const cell of grid.cells) {
    if ((elevMap.get(cell.index) ?? 0) > seaLevel) {
      landCells.add(cell.index);
    } else {
      seaCells.add(cell.index);
    }
  }

  const coastalCells = new Set<number>();
  for (const cellIdx of landCells) {
    const neighbors = grid.adjacency.get(cellIdx) ?? [];
    if (neighbors.some((n) => seaCells.has(n))) {
      coastalCells.add(cellIdx);
    }
  }

  const landmasses = findConnectedComponents(landCells, grid.adjacency);

  return { landCells, seaCells, coastalCells, landmasses };
}

function findConnectedComponents(
  cells: Set<number>,
  adjacency: Map<number, number[]>
): number[][] {
  const visited = new Set<number>();
  const components: number[][] = [];

  for (const cell of cells) {
    if (visited.has(cell)) continue;
    const component: number[] = [];
    const queue = [cell];
    visited.add(cell);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (cells.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }

  return components;
}
