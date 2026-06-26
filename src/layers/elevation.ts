import type { VoronoiGrid } from '../core/voronoi.js';
import type { NoiseSampler } from '../core/noise.js';

export interface ElevationConfig {
  seaLevel: number;
  mountainScale: number;
}

export type ElevationMap = Map<number, number>;

export function assignElevation(
  grid: VoronoiGrid,
  sampler: NoiseSampler,
  config: ElevationConfig
): ElevationMap {
  const elevMap: ElevationMap = new Map();

  for (const cell of grid.cells) {
    const raw = sampler.sample(cell.site.x, cell.site.y);
    const normalized = (raw + 1) / 2;
    const scaled = Math.min(1, Math.max(0, normalized * config.mountainScale));
    elevMap.set(cell.index, scaled);
  }

  return elevMap;
}
