import type { VoronoiGrid } from '../core/voronoi.js';
import type { PoliticalMap } from '../layers/borders.js';
import type { Point } from '../core/geometry.js';
import { centroid } from '../core/geometry.js';

export interface Label {
  text: string;
  position: Point;
  fontSize: number;
}

export function placeLabels(
  grid: VoronoiGrid,
  political: PoliticalMap,
  userLabels: Record<string, string>
): Label[] {
  const countryPolygons = new Map<string, Point[]>();

  for (const [cellIdx, country] of political.territories) {
    if (!countryPolygons.has(country)) countryPolygons.set(country, []);
    countryPolygons.get(country)!.push(grid.cells[cellIdx].site);
  }

  const labels: Label[] = [];
  for (const [country, sites] of countryPolygons) {
    const center = centroid(sites);
    const displayName = userLabels[country] ?? country;
    labels.push({ text: displayName, position: center, fontSize: 14 });
  }

  return labels;
}
