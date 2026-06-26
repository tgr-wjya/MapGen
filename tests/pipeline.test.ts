import { describe, it, expect } from 'vitest';
import { generate } from '../src/pipeline.js';
import type { RegionConfig } from '../src/config/types.js';

describe('generate', () => {
  const config: RegionConfig = {
    width: 800,
    height: 600,
    cellCount: 150,
    seaLevel: 0.4,
    mountainScale: 1.0,
    noiseOctaves: 4,
    latitude: 45,
    windDirection: 'west',
    rivers: { maxCount: 4, minLength: 3 },
    straits: { maxWidth: 3 },
    countries: [
      { name: 'Aetheria', archetype: 'coastal' },
      { name: 'Valdris', archetype: 'landlocked' },
    ],
    labels: { Aetheria: 'The Republic of Aetheria' },
  };

  it('produces valid SVG from config + seed', () => {
    const svg = generate(config, 42);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('The Republic of Aetheria');
  });

  it('same config + seed = identical output', () => {
    const svg1 = generate(config, 42);
    const svg2 = generate(config, 42);
    expect(svg1).toBe(svg2);
  });

  it('different seeds produce different output', () => {
    const svg1 = generate(config, 42);
    const svg2 = generate(config, 99);
    expect(svg1).not.toBe(svg2);
  });
});
