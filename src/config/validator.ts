import Ajv from 'ajv';
import schema from './schema.json' with { type: 'json' };
import { type RegionConfig } from './types.js';

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

  return { valid: true, config: data as RegionConfig };
}
