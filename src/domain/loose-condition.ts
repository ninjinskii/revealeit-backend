import { Board } from "./board.ts";
import { Player } from "./Player.ts";

interface LooseCondition {
  hasLost(board: Board, currentPlayer: Player): boolean;
}

export class NoMorePieceLooseCondition implements LooseCondition {
  hasLost(_board: Board, currentPlayer: Player): boolean {
    return currentPlayer.pieces.length === 0;
  }
}
