import { Slot } from "./board.ts";
import { Piece } from "./piece.ts";

// export interface AllowedMovement {
//   slotRevealStrategy: SlotLookupStrategy;
//   directions: Array<OrthogonalDirections | DiagonalDirections>;
//   bounds: MovementDeltaBounds;
// }

// export class OrthogonalAllowedMovement implements AllowedMovement {
//   slotRevealStrategy = new OrthogonalSlotLookupStrategy();
//   directions = Object.values(OrthogonalDirections);
//   bounds = { min: 1, max: 1 };

//   constructor(minDistance: number, maxDistance: number) {
//     this.bounds = { min: minDistance, max: maxDistance };
//   }
// }

// export interface MovementDeltaBounds {
//   min: number;
//   max: number;
// }

// interface SlotLookupStrategy {
//   resolve: (allSlots: Slot[], currentPieceSlot: Slot) => Slot[];
// }

// class DefaultSlotLookupStrategy implements SlotLookupStrategy {
//   resolve(_allSlots: Slot[], _currentPieceSlot: Slot): Slot[] {
//     return [];
//   }
// }

// class OrthogonalSlotLookupStrategy implements SlotLookupStrategy {
//   resolve(allSlots: Slot[], currentPieceSlot: Slot): Slot[] {
//     return allSlots.filter((slot) =>
//       slot.x === currentPieceSlot.x || slot.y === currentPieceSlot.y
//     );
//   }
// }

// class DiagonalSlotLookupStrategy implements SlotLookupStrategy {
//   resolve(allSlots: Slot[], currentPieceSlot: Slot): Slot[] {
//     return allSlots.filter((slot) =>
//       slot.x - slot.y === currentPieceSlot.x - currentPieceSlot.y
//     );
//   }
// }

// class AllDirectionsSlotLookupStrategy implements SlotLookupStrategy {
//   resolve(allSlots: Slot[], currentPieceSlot: Slot): Slot[] {
//     const orthogonal = new OrthogonalSlotLookupStrategy().resolve(
//       allSlots,
//       currentPieceSlot,
//     );
//     const diagonal = new DiagonalSlotLookupStrategy().resolve(
//       allSlots,
//       currentPieceSlot,
//     );

//     return [...orthogonal, ...diagonal];
//   }
// }

export enum Direction {
  ORTHOGONAL,
  DIAGONAL,
  ALL,
}

interface DirectionFilter {
  filter(x1: number, y1: number, x2: number, y2: number): boolean;
}

interface ActionZoneOptions {
  moveRange: number;
  revealRange: number;
  killRange: number;
  direction: Direction;
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
    return slots.filter((slot) =>
      this.getDirectionFilter().filter(positionX, positionY, slot.x, slot.y) &&
      this.getDistance(positionX, positionY, slot.x, slot.y) <= this.moveRange
    );
  }

  resolveReveal(slots: Slot[], positionX: number, positionY: number): Slot[] {
    return slots.filter((slot) =>
      this.getDirectionFilter().filter(positionX, positionY, slot.x, slot.y) &&
      this.getDistance(positionX, positionY, slot.x, slot.y) <= this.revealRange
    );
  }

  resolveKill(slots: Slot[], positionX: number, positionY: number): Slot[] {
    return slots.filter((slot) =>
      this.getDirectionFilter().filter(positionX, positionY, slot.x, slot.y) &&
      this.getDistance(positionX, positionY, slot.x, slot.y) <= this.killRange
    );
  }

  getDistance(x1: number, y1: number, x2: number, y2: number) {
    console.log("distance:");
    console.log(x1, y1, x2, y2);
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  getDirectionFilter(): DirectionFilter {
    switch (this.direction) {
      case Direction.ORTHOGONAL:
        return {
          filter(x1: number, y1: number, x2: number, y2: number) {
            return x1 === x2 || y1 === y2;
          },
        };
      case Direction.DIAGONAL:
        return {
          filter(x1: number, y1: number, x2: number, y2: number) {
            return x1 - y1 === x2 - y2;
          },
        };
      default:/* ALL */
        return {
          filter(x1: number, y1: number, x2: number, y2: number) {
            return x1 - y1 === x2 - y2 || x1 === x2 && y1 === y2;
          },
        };
    }
  }
}
