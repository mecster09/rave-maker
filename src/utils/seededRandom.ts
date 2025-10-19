export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRNG {
  private rnd: () => number;
  constructor(seed: number) {
    this.rnd = mulberry32(seed);
  }
  next() { return this.rnd(); }
  int(min: number, max: number) { // inclusive
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number) { // p in [0,1]
    return this.next() < p;
  }
}
