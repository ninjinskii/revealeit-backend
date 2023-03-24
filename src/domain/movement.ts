import { Slot } from "./board.ts";
import { DiagonalDirections, OrthogonalDirections } from "./direction.ts";
import { Piece } from "./piece.ts";

export interface AllowedMovement {
  slotRevealStrategy: SlotLookupStrategy;
  directions: Array<OrthogonalDirections | DiagonalDirections>;
  bounds: MovementDeltaBounds;
}

export class OrthogonalAllowedMovement implements AllowedMovement {
  slotRevealStrategy = new OrthogonalSlotLookupStrategy();
  directions = Object.values(OrthogonalDirections);
  bounds = { min: 1, max: 1 };

  constructor(minDistance: number, maxDistance: number) {
    this.bounds = { min: minDistance, max: maxDistance };
  }
}

export interface MovementDeltaBounds {
  min: number;
  max: number;
}

interface SlotLookupStrategy {
  resolve: (allSlots: Slot[], currentPieceSlot: Slot) => Slot[];
}

class DefaultSlotLookupStrategy implements SlotLookupStrategy {
  resolve(_allSlots: Slot[], _currentPieceSlot: Slot): Slot[] {
    return [];
  }
}

class OrthogonalSlotLookupStrategy implements SlotLookupStrategy {
  resolve(allSlots: Slot[], currentPieceSlot: Slot): Slot[] {
    return allSlots.filter((slot) =>
      slot.x === currentPieceSlot.x || slot.y === currentPieceSlot.y
    );
  }
}

class DiagonalSlotLookupStrategy implements SlotLookupStrategy {
  resolve(allSlots: Slot[], currentPieceSlot: Slot): Slot[] {
    return allSlots.filter((slot) =>
      slot.x - slot.y === currentPieceSlot.x - currentPieceSlot.y
    );
  }
}

class AllDirectionsSlotLookupStrategy implements SlotLookupStrategy {
  resolve(allSlots: Slot[], currentPieceSlot: Slot): Slot[] {
    const orthogonal = new OrthogonalSlotLookupStrategy().resolve(
      allSlots,
      currentPieceSlot,
    );
    const diagonal = new DiagonalSlotLookupStrategy().resolve(
      allSlots,
      currentPieceSlot,
    );

    return [...orthogonal, ...diagonal];
  }
}
