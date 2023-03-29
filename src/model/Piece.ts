import { ActionZone, Direction } from "../domain/ActionZone.ts";
import { Rules } from "../domain/Rules.ts";

export interface Piece {
  playerId: string;
  name: string;
  imagePath?: string;
  actionZone: ActionZone;
  originSpawnDelta: { dX: number; dY: number };
}

export class Explorer implements Piece {
  name = "explorer";
  actionZone = new ActionZone({
    moveRange: 1,
    revealRange: Rules.BOARD_SIZE,
    killRange: 0,
    direction: Direction.ORTHOGONAL,
  });
  originSpawnDelta = { dX: 0, dY: 0 };

  constructor(public playerId: string) {}
}

export class Shooter implements Piece {
  name = "shooter";
  actionZone = new ActionZone({
    moveRange: 1,
    revealRange: 1,
    killRange: 2,
    direction: Direction.ORTHOGONAL,
  });
  originSpawnDelta = { dX: 0, dY: 1 };

  constructor(public playerId: string) {}
}

export class PieceDTO {
  constructor(
    public playerId: string,
    public name: string,
    public killRange: number,
  ) {}

  public static fromPiece(piece: Piece | null): PieceDTO | null {
    if (piece === null) {
      return null;
    }

    return new PieceDTO(
      piece.playerId,
      piece.name,
      piece.actionZone.killRange,
    );
  }
}
