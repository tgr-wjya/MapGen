import Ajv from 'ajv';
import schema from './schema.json' with { type: 'json' };
import { type RegionConfig, DEFAULTS } from './types.js';

type ValidationResult =
  | { valid: true; config: RegionConfig }
  | { valid: false; errors: string[] };

export function validateConfig(input: unknown): ValidationResult {
  const ajv = new Ajv({ useDefaults: true, allErrors: true });
  const validate = ajv.compile(schema);

  const data = JSON.parse(JSON.stringify(input));
  const valid = validate(data);

  if (!valid) {
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '/'}: ${e.message}`
    );
    return { valid: false, errors };
  }

  const config: RegionConfig = {
    width: data.width,
    height: data.height,
    cellCount: data.cellCount,
    seaLevel: data.seaLevel,
    mountainScale: data.mountainScale ?? DEFAULTS.mountainScale!,
    noiseOctaves: data.noiseOctaves ?? DEFAULTS.noiseOctaves!,
    latitude: data.latitude ?? DEFAULTS.latitude!,
    windDirection: data.windDirection ?? DEFAULTS.windDirection!,
    rivers: data.rivers ?? DEFAULTS.rivers!,
    straits: data.straits ?? DEFAULTS.straits!,
    countries: data.countries,
    labels: data.labels ?? DEFAULTS.labels!,
  };

  return { valid: true, config };
}
