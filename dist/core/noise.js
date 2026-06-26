import { makeNoise2D } from 'open-simplex-noise';
export function createNoiseSampler(seed, octaves, lacunarity, persistence) {
    const noises = Array.from({ length: octaves }, (_, i) => makeNoise2D(seed + i * 31));
    function sample(x, y) {
        let value = 0;
        let amplitude = 1;
        let frequency = 0.01;
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
