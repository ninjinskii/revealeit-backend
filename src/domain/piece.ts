import { AllowedMovement, OrthogonalAllowedMovement } from "./movement.ts";
import { Ruler } from "./ruler.ts";

export interface Piece {
  playerId: string;
  name: string;
  imagePath?: string;
  allowedMovements: AllowedMovement;
  allowedKills?: AllowedMovement;
  canKill: boolean;
  originSpawnDelta: { dX: number; dY: number };
}

export class Explorer implements Piece {
  name = "explorer";
  allowedMovements = new OrthogonalAllowedMovement(1, 1);
  originSpawnDelta = { dX: 0, dY: 0 };
  canKill = false;

  constructor(public playerId: string) {}
}

export class Shooter implements Piece {
  name = "shooter";
  allowedMovements = new OrthogonalAllowedMovement(1, 2);
  allowedKills = new OrthogonalAllowedMovement(1, Ruler.BOARD_SIZE);
  canKill = true;
  originSpawnDelta = { dX: 1, dY: 1 };

  constructor(public playerId: string) {}
}

export class PieceDTO {
  constructor(
    public playerId: string,
    public name: string,
    public canKill: boolean,
  ) {}

  public static fromPiece(piece: Piece | null): PieceDTO | null {
    if (piece === null) {
      return null;
    }

    return new PieceDTO(piece.playerId, piece.name, piece.canKill);
  }
}
