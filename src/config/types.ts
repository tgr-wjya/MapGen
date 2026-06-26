export interface RegionConfig {
  width: number;
  height: number;
  cellCount: number;
  seaLevel: number;
  mountainScale: number;
  noiseOctaves: number;
  latitude: number;
  windDirection: 'west' | 'east';
  rivers: { maxCount: number; minLength: number };
  straits: { maxWidth: number };
  countries: Array<{ name: string; archetype: 'island' | 'landlocked' | 'coastal' | 'peninsular' }>;
  labels: Record<string, string>;
}

export const DEFAULTS: Partial<RegionConfig> = {
  mountainScale: 1.0,
  noiseOctaves: 4,
  latitude: 45,
  windDirection: 'west',
  rivers: { maxCount: 5, minLength: 3 },
  straits: { maxWidth: 3 },
  labels: {},
};
