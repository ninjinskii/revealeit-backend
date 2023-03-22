import { OrthogonalAllowedMovement, AllowedMovement } from "./movement.ts"

export interface Piece {
    playerId: string
    name: string
    imagePath?: string
    allowedMovements: AllowedMovement
    canKill: boolean
    originSpawnDelta: { dX: number, dY: number }
}

export class Explorer implements Piece {
    name = "explorer"
    allowedMovements = new OrthogonalAllowedMovement(1, 1)
    originSpawnDelta = { dX: 0, dY: 0 }
    canKill = false

    constructor(public playerId: string) {}
}

export class Shooter implements Piece {
    name = "explorer"
    allowedMovements = new OrthogonalAllowedMovement(1, 1)
    originSpawnDelta = { dX: 1, dY: 1 }
    canKill = false

    constructor(public playerId: string) {}
}