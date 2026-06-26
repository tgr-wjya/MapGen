import { makeNoise2D } from 'open-simplex-noise';

export interface NoiseSampler {
  sample(x: number, y: number): number;
}

export function createNoiseSampler(
  seed: number,
  octaves: number,
  lacunarity: number,
  persistence: number
): NoiseSampler {
  const noises = Array.from({ length: octaves }, (_, i) =>
    makeNoise2D(seed + i * 31)
  );

  function sample(x: number, y: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 0.1;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      value += noises[i](x * frequency, y * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxAmplitude;
  }

  return { sample };
}
