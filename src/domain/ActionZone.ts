import { Slot } from "./Board.ts";

export enum Direction {
  ORTHOGONAL,
  DIAGONAL,
  ALL,
}

interface ActionZoneOptions {
  moveRange: number;
  revealRange: number;
  killRange: number;
  direction: Direction;
}

interface ResolveOptions {
  slots: Slot[];
  positionX: number;
  positionY: number;
  range: number;
}

export class ActionZone {
  moveRange: number;
  revealRange: number;
  killRange: number;
  direction: Direction;

  constructor(options: ActionZoneOptions) {
    this.moveRange = options.moveRange;
    this.revealRange = options.revealRange;
    this.killRange = options.killRange;
    this.direction = options.direction;
  }

  resolveMove(slots: Slot[], positionX: number, positionY: number): Slot[] {
    return this.resolve({ slots, positionX, positionY, range: this.moveRange });
  }

  resolveReveal(slots: Slot[], positionX: number, positionY: number): Slot[] {
    return this.resolve({
      slots,
      positionX,
      positionY,
      range: this.revealRange,
    });
  }

  resolveKill(slots: Slot[], positionX: number, positionY: number): Slot[] {
    return this.resolve({ slots, positionX, positionY, range: this.killRange });
  }

  getDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  private resolve(options: ResolveOptions): Slot[] {
    const { slots, positionX, positionY, range } = options;
    const orthogonal: Slot[] = [];
    const diagonal: Slot[] = [];
    const shouldComputeDiagonal = this.direction === Direction.DIAGONAL ||
      this.direction === Direction.ALL;
    const shouldComputeOrthogonal = this.direction === Direction.ORTHOGONAL ||
      this.direction === Direction.ALL;
    const diagonalRange = (range * 1.4142) + 0.4142;

    for (const slot of slots) {
      if (shouldComputeOrthogonal) {
        const inRange =
          this.getDistance(positionX, positionY, slot.x, slot.y) <= range;
        const inDirection = slot.x === positionX || slot.y === positionY;

        if (inRange && inDirection) {
          orthogonal.push(slot);
        }
      }

      if (shouldComputeDiagonal) {
        const inRange =
          this.getDistance(positionX, positionY, slot.x, slot.y) <=
            diagonalRange;
        const inDirection = slot.x - positionX === slot.y - positionY;

        if (inRange && inDirection) {
          diagonal.push(slot);
        }
      }
    }

    return [...orthogonal, ...diagonal];
  }
}
