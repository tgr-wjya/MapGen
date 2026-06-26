import { describe, it, expect } from 'vitest';
import { renderSvg } from '../../src/render/svg.js';
import { generatePoints, buildVoronoi } from '../../src/core/voronoi.js';
import { createNoiseSampler } from '../../src/core/noise.js';
import { assignElevation } from '../../src/layers/elevation.js';
import { detectCoastlines } from '../../src/layers/coastline.js';
import { generateRivers } from '../../src/layers/rivers.js';
import { detectStraits } from '../../src/layers/straits.js';
import { assignBiomes } from '../../src/layers/biomes.js';
import { generateBorders } from '../../src/layers/borders.js';
import { createRng } from '../../src/core/rng.js';

describe('renderSvg', () => {
  function buildTestData() {
    const rng = createRng(42);
    const points = generatePoints(800, 600, 100, rng);
    const grid = buildVoronoi(points, 800, 600);
    const sampler = createNoiseSampler(42, 4, 2.0, 0.5);
    const elevMap = assignElevation(grid, sampler, { seaLevel: 0.4, mountainScale: 1.0 });
    const coastData = detectCoastlines(grid, elevMap, 0.4);
    const rivers = generateRivers(grid, elevMap, coastData, { maxRivers: 3, minLength: 3 });
    const straits = detectStraits(grid, coastData, { maxWidth: 3 });
    const biomeMap = assignBiomes(grid, elevMap, coastData, rivers, { latitude: 45, windDirection: 'west' });
    const political = generateBorders(grid, coastData, elevMap, rivers, createRng(42), {
      countries: [{ name: 'Aetheria', archetype: 'coastal' }, { name: 'Valdris', archetype: 'landlocked' }],
    });
    return {
      grid, elevMap, coastData, biomeMap, political, rivers, straits,
      config: { width: 800, height: 600, cellCount: 100, seaLevel: 0.4, mountainScale: 1.0, noiseOctaves: 4, latitude: 45, windDirection: 'west' as const, rivers: { maxCount: 3, minLength: 3 }, straits: { maxWidth: 3 }, countries: [{ name: 'Aetheria', archetype: 'coastal' as const }, { name: 'Valdris', archetype: 'landlocked' as const }], labels: {} },
    };
  }

  it('returns valid SVG string', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('contains polygon elements for cells', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<polygon');
  });

  it('contains river paths', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<path');
  });

  it('contains text labels', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('<text');
    expect(svg).toContain('Aetheria');
  });

  it('sets correct viewBox dimensions', () => {
    const svg = renderSvg(buildTestData());
    expect(svg).toContain('viewBox="0 0 800 600"');
  });
});
