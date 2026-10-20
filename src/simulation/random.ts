export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 4294967296;
  }

  normal(): number {
    const u = Math.max(this.next(), Number.EPSILON);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  gamma(shape: number): number {
    if (shape < 1) {
      return this.gamma(shape + 1) * Math.pow(this.next(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      const normal = this.normal();
      const candidate = Math.pow(1 + c * normal, 3);
      if (candidate <= 0) continue;
      const uniform = this.next();
      if (uniform < 1 - 0.0331 * Math.pow(normal, 4)) return d * candidate;
      if (
        Math.log(uniform) <
        0.5 * normal * normal + d * (1 - candidate + Math.log(candidate))
      )
        return d * candidate;
    }
  }

  studentT(degreesOfFreedom: number): number {
    const chiSquare = 2 * this.gamma(degreesOfFreedom / 2);
    return this.normal() / Math.sqrt(chiSquare / degreesOfFreedom);
  }
}
