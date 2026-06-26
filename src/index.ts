import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateConfig } from './config/validator.js';
import { generate } from './pipeline.js';

const program = new Command();

program
  .name('mapgen')
  .description('Procedural regional map generator')
  .version('0.1.0');

program
  .command('generate')
  .requiredOption('-c, --config <path>', 'Path to region config JSON')
  .requiredOption('-s, --seed <number>', 'Random seed', parseInt)
  .option('-o, --output <path>', 'Output SVG path', 'map.svg')
  .action((opts) => {
    const raw = JSON.parse(readFileSync(opts.config, 'utf-8'));
    const result = validateConfig(raw);

    if (!result.valid) {
      console.error('Invalid config:');
      for (const err of result.errors) console.error(`  - ${err}`);
      process.exit(1);
    }

    const svg = generate(result.config, opts.seed);
    writeFileSync(opts.output, svg);
    console.log(`Map generated: ${opts.output} (seed: ${opts.seed})`);
  });

program.parse();
