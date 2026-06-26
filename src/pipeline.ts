import { createRng } from './core/rng.js';
import { createNoiseSampler } from './core/noise.js';
import { generatePoints, buildVoronoi } from './core/voronoi.js';
import { assignElevation } from './layers/elevation.js';
import { detectCoastlines } from './layers/coastline.js';
import { generateRivers } from './layers/rivers.js';
import { detectStraits } from './layers/straits.js';
import { assignBiomes } from './layers/biomes.js';
import { generateBorders } from './layers/borders.js';
import { renderSvg } from './render/svg.js';
import type { RegionConfig } from './config/types.js';

export function generate(config: RegionConfig, seed: number): string {
  const rng = createRng(seed);
  const sampler = createNoiseSampler(seed, config.noiseOctaves, 2.0, 0.5);

  const points = generatePoints(config.width, config.height, config.cellCount, rng);
  const grid = buildVoronoi(points, config.width, config.height);

  const elevMap = assignElevation(grid, sampler, {
    seaLevel: config.seaLevel,
    mountainScale: config.mountainScale,
  });

  const coastData = detectCoastlines(grid, elevMap, config.seaLevel);

  const rivers = generateRivers(grid, elevMap, coastData, {
    maxRivers: config.rivers.maxCount,
    minLength: config.rivers.minLength,
  });

  const straits = detectStraits(grid, coastData, {
    maxWidth: config.straits.maxWidth,
  });

  const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, {
    latitude: config.latitude,
    windDirection: config.windDirection,
  });

  const borderRng = createRng(seed + 1000);
  const political = generateBorders(grid, coastData, elevMap, rivers, borderRng, {
    countries: config.countries,
  });

  return renderSvg({
    grid, elevMap, coastData, biomeMap, political, rivers, straits, config,
  });
}
