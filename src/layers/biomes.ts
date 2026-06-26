import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from './elevation.js';
import type { CoastlineData } from './coastline.js';
import type { RiverNetwork } from './rivers.js';

export type Biome = 'ocean' | 'desert' | 'grassland' | 'forest' | 'tundra' | 'mountain' | 'tropical';
export type BiomeMap = Map<number, Biome>;

export interface BiomeConfig {
  latitude: number;
  windDirection: 'west' | 'east';
}

export function assignBiomes(
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  coastData: CoastlineData,
  rivers: RiverNetwork,
  config: BiomeConfig
): BiomeMap {
  const biomeMap: BiomeMap = new Map();
  const moisture = computeMoisture(grid, coastData, rivers, config, elevMap);

  for (const cell of grid.cells) {
    if (coastData.seaCells.has(cell.index)) {
      biomeMap.set(cell.index, 'ocean');
      continue;
    }

    const elev = elevMap.get(cell.index)!;
    const moist = moisture.get(cell.index) ?? 0;
    const temp = computeTemperature(cell.site.y, grid, elev, config.latitude);

    biomeMap.set(cell.index, classifyBiome(elev, moist, temp));
  }

  return biomeMap;
}

function classifyBiome(elevation: number, moisture: number, temperature: number): Biome {
  if (elevation > 0.85) return 'mountain';
  if (temperature < 0.2) return 'tundra';
  if (temperature > 0.75 && moisture > 0.6) return 'tropical';
  if (moisture < 0.2) return 'desert';
  if (moisture > 0.5) return 'forest';
  return 'grassland';
}

function computeTemperature(
  y: number,
  grid: VoronoiGrid,
  elevation: number,
  latitude: number
): number {
  // ponytail: simplified latitude-based temperature
  const height = 600;
  const normalizedY = y / height;
  const latitudeEffect = 1 - Math.abs(latitude - 45) / 45;
  const baseTemp = latitudeEffect * (1 - normalizedY * 0.3);
  const elevCooling = elevation * 0.4;
  return Math.max(0, Math.min(1, baseTemp - elevCooling));
}

function computeMoisture(
  grid: VoronoiGrid,
  coastData: CoastlineData,
  rivers: RiverNetwork,
  config: BiomeConfig,
  elevMap: ElevationMap
): Map<number, number> {
  const moisture = new Map<number, number>();
  const riverCells = new Set(rivers.rivers.flatMap((r) => r.path));

  for (const cell of grid.cells) {
    if (!coastData.landCells.has(cell.index)) continue;

    let moist = 0;

    // Coastal proximity adds moisture
    if (coastData.coastalCells.has(cell.index)) moist += 0.4;
    if (riverCells.has(cell.index)) moist += 0.3;

    // Neighbors near coast add moisture
    const neighbors = grid.adjacency.get(cell.index) ?? [];
    const coastalNeighborCount = neighbors.filter((n) => coastData.coastalCells.has(n)).length;
    moist += coastalNeighborCount * 0.1;

    // Rain shadow: reduce moisture for cells downwind of high elevation
    const shadowPenalty = computeRainShadow(cell.index, grid, elevMap, config);
    moist -= shadowPenalty;

    moisture.set(cell.index, Math.max(0, Math.min(1, moist)));
  }

  return moisture;
}

function computeRainShadow(
  cellIdx: number,
  grid: VoronoiGrid,
  elevMap: ElevationMap,
  config: BiomeConfig
): number {
  const cell = grid.cells[cellIdx];
  // windDirection 'west' means wind blows from west to east, so upwind is to the west
  const windSign = config.windDirection === 'west' ? -1 : 1;

  const neighbors = grid.adjacency.get(cellIdx) ?? [];
  const upwindNeighbors = neighbors.filter((n) => {
    const nCell = grid.cells[n];
    return (nCell.site.x - cell.site.x) * windSign < 0;
  });

  if (upwindNeighbors.length === 0) return 0;

  // Check if any upwind neighbor is high elevation
  const hasHighUpwind = upwindNeighbors.some((n) => {
    const elev = elevMap.get(n) ?? 0;
    return elev > 0.7;
  });

  return hasHighUpwind ? 0.3 : 0;
}
