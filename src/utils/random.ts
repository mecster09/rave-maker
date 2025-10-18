import { faker } from "@faker-js/faker";

export function randomFloat(min: number, max: number, step = 0.1): number {
  return Number(faker.number.float({ min, max, multipleOf: step }).toFixed(1));
}
