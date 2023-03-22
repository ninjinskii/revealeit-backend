import { Slot } from "./board.ts"
import { OrthogonalAllowedMovement, AllowedMovement } from "./movement.ts"

export interface Piece {
    name: string
    imagePath?: string
    position: Slot
    allowedMovements: AllowedMovement
    canKill: boolean
    originSpawnDelta: { dX: number, dY: number }
}

export class Explorer implements Piece {
    name = "explorer"
    position = { x: -1, y: -1 }
    allowedMovements = new OrthogonalAllowedMovement(1, 1)
    originSpawnDelta = { dX: 1, dY: 0 }
    canKill = false
}

export class Shooter implements Piece {
    name = "explorer"
    position = { x: -1, y: -1 }
    allowedMovements = new OrthogonalAllowedMovement(1, 1)
    originSpawnDelta = { dX: 1, dY: 1 }
    canKill = false
}