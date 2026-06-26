import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/config/validator.js';

describe('validateConfig', () => {
  const validConfig = {
    width: 800,
    height: 600,
    cellCount: 300,
    seaLevel: 0.4,
    countries: [
      { name: 'Aetheria', archetype: 'coastal' },
      { name: 'Valdris', archetype: 'landlocked' },
    ],
  };

  it('accepts valid config with defaults filled', () => {
    const result = validateConfig(validConfig);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.mountainScale).toBe(1.0);
      expect(result.config.windDirection).toBe('west');
    }
  });

  it('rejects missing required fields', () => {
    const result = validateConfig({ width: 800 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid archetype', () => {
    const bad = { ...validConfig, countries: [{ name: 'X', archetype: 'floating' }] };
    const result = validateConfig(bad);
    expect(result.valid).toBe(false);
  });

  it('rejects width below minimum', () => {
    const bad = { ...validConfig, width: 50 };
    const result = validateConfig(bad);
    expect(result.valid).toBe(false);
  });

  it('accepts full config with all fields', () => {
    const full = {
      ...validConfig,
      mountainScale: 1.5,
      noiseOctaves: 6,
      latitude: 30,
      windDirection: 'east',
      rivers: { maxCount: 8, minLength: 4 },
      straits: { maxWidth: 5 },
      labels: { country_1: 'Aetheria' },
    };
    const result = validateConfig(full);
    expect(result.valid).toBe(true);
  });
});
