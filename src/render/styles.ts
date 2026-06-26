import type { Biome } from '../layers/biomes.js';

export const BIOME_COLORS: Record<Biome, string> = {
  ocean: '#4a90d9',
  desert: '#edc9af',
  grassland: '#7ec850',
  forest: '#2d8a4e',
  tundra: '#d4e5f7',
  mountain: '#8b7d6b',
  tropical: '#3cb371',
};

export const BORDER_STROKE = '#2c2c2c';
export const RIVER_STROKE = '#2e86c1';
export const COAST_STROKE = '#1a1a1a';
export const STRAIT_FILL = '#6ab7e8';

export const COUNTRY_COLORS = [
  '#f4a582', '#92c5de', '#d5a6bd', '#b6d7a8',
  '#ffe599', '#c9daf8', '#f9cb9c', '#d9d2e9',
];
