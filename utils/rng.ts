// Simple seeded random number generator (Mulberry32)
export function createRNG(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Global random function that defaults to Math.random
let randomFunc = Math.random;

export function setSeed(seed: number | string) {
    const numericSeed = typeof seed === 'string' ? parseInt(seed, 10) : seed;
    if (!isNaN(numericSeed)) {
        console.log(`[RNG] Seeding with ${numericSeed}`);
        randomFunc = createRNG(numericSeed);
    } else {
        console.warn(`[RNG] Invalid seed: ${seed}, using Math.random`);
        randomFunc = Math.random;
    }
}

export function getRandom(): number {
    return randomFunc();
}
