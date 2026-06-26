import type { VoronoiGrid } from '../core/voronoi.js';
import type { ElevationMap } from '../layers/elevation.js';
import type { CoastlineData } from '../layers/coastline.js';
import type { BiomeMap } from '../layers/biomes.js';
import type { PoliticalMap } from '../layers/borders.js';
import type { RiverNetwork } from '../layers/rivers.js';
import type { Strait } from '../layers/straits.js';
import type { RegionConfig } from '../config/types.js';
import { BIOME_COLORS, BORDER_STROKE, RIVER_STROKE, COAST_STROKE, COUNTRY_COLORS } from './styles.js';
import { placeLabels } from './labels.js';

export interface RenderData {
  grid: VoronoiGrid;
  elevMap: ElevationMap;
  coastData: CoastlineData;
  biomeMap: BiomeMap;
  political: PoliticalMap;
  rivers: RiverNetwork;
  straits: Strait[];
  config: RegionConfig;
}

export function renderSvg(data: RenderData): string {
  const { grid, biomeMap, political, rivers, coastData, config } = data;
  const lines: string[] = [];

  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" width="${config.width}" height="${config.height}">`);

  // Background
  lines.push(`<rect width="${config.width}" height="${config.height}" fill="${BIOME_COLORS.ocean}"/>`);

  // Biome layer
  lines.push('<g id="biomes">');
  for (const cell of grid.cells) {
    const biome = biomeMap.get(cell.index)!;
    const points = cell.polygon.map((p) => `${p.x},${p.y}`).join(' ');
    lines.push(`<polygon points="${points}" fill="${BIOME_COLORS[biome]}" stroke="none"/>`);
  }
  lines.push('</g>');

  // Political borders
  const countryNames = [...new Set(political.territories.values())];
  lines.push('<g id="borders">');
  for (const cell of grid.cells) {
    const country = political.territories.get(cell.index);
    if (!country) continue;
    const colorIdx = countryNames.indexOf(country) % COUNTRY_COLORS.length;
    const points = cell.polygon.map((p) => `${p.x},${p.y}`).join(' ');
    lines.push(`<polygon points="${points}" fill="${COUNTRY_COLORS[colorIdx]}" fill-opacity="0.3" stroke="${BORDER_STROKE}" stroke-width="0.5"/>`);
  }
  lines.push('</g>');

  // Coastlines
  lines.push('<g id="coastlines">');
  for (const cellIdx of coastData.coastalCells) {
    const cell = grid.cells[cellIdx];
    const points = cell.polygon.map((p) => `${p.x},${p.y}`).join(' ');
    lines.push(`<polygon points="${points}" fill="none" stroke="${COAST_STROKE}" stroke-width="1.5"/>`);
  }
  lines.push('</g>');

  // Rivers
  lines.push('<g id="rivers">');
  for (const river of rivers.rivers) {
    const pathPoints = river.path.map((cellIdx) => {
      const site = grid.cells[cellIdx].site;
      return `${site.x},${site.y}`;
    });
    const d = `M ${pathPoints.join(' L ')}`;
    lines.push(`<path d="${d}" fill="none" stroke="${RIVER_STROKE}" stroke-width="2" stroke-linecap="round"/>`);
  }
  lines.push('</g>');

  // Labels
  const labels = placeLabels(grid, political, config.labels);
  lines.push('<g id="labels">');
  for (const label of labels) {
    lines.push(`<text x="${label.position.x}" y="${label.position.y}" font-size="${label.fontSize}" text-anchor="middle" font-family="sans-serif" font-weight="bold">${label.text}</text>`);
  }
  lines.push('</g>');

  lines.push('</svg>');
  return lines.join('\n');
}
