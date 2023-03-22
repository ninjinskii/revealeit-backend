import { Slot } from "./board.ts"
import { DiagonalDirections, OrthogonalDirections } from "./direction.ts"
import { Piece } from "./piece.ts"

export interface AllowedMovement {
    slotRevealStrategy: SlotLookupStrategy,
    directions: Array<OrthogonalDirections | DiagonalDirections>,
    bounds: MovementDeltaBounds
}

export class OrthogonalAllowedMovement implements AllowedMovement {
    slotRevealStrategy = new OrthogonalSlotLookupStrategy()
    directions = Object.values(OrthogonalDirections)
    bounds = { min: 1,  max: 1 }
    
    constructor(minDistance: number, maxDistance: number) {
        this.bounds = { min: minDistance, max: maxDistance }
    }
}

export interface MovementDeltaBounds {
    min: number
    max: number
}

interface SlotLookupStrategy {
    resolve: (slots: Slot[], piece: Piece) => Slot[]
}

class DefaultSlotLookupStrategy implements SlotLookupStrategy {
    resolve(slots: Slot[], piece: Piece): Slot[] {
        return []
    }
}

class OrthogonalSlotLookupStrategy implements SlotLookupStrategy {
    resolve(slots: Slot[], piece: Piece): Slot[] {
        return slots.filter(slot => slot.x === piece.position.x || slot.y === piece.position.y)
    }
}

class DiagonalSlotLookupStrategy implements SlotLookupStrategy {
    resolve(slots: Slot[], piece: Piece): Slot[] {
        return slots.filter(slot => slot.x - slot.y === piece.position.x - piece.position.y)
    }
}

class AllDirectionsSlotLookupStrategy implements SlotLookupStrategy {
    resolve(slots: Slot[], piece: Piece): Slot[] {
        const orthogonal = new OrthogonalSlotLookupStrategy().resolve(slots, piece)
        const diagonal = new DiagonalSlotLookupStrategy().resolve(slots, piece)

        return [...orthogonal, ...diagonal]
    }
}