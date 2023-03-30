import { Board } from "./Board.ts";
import { Player } from "../model/Player.ts";

interface LooseCondition {
  hasLost(board: Board, currentPlayer: Player): boolean;
}

export enum LooseConditionDescriptor {
  NO_MORE_PIECE = 'NO_MORE_PIECE',
  NO_MORE_KILLER = 'NO_MORE_KILER',
}

export class NoMorePieceLooseCondition implements LooseCondition {
  hasLost(_board: Board, currentPlayer: Player): boolean {
    return currentPlayer.pieces.length === 0;
  }
}

export class NoMoreKillerLooseCondition implements LooseCondition {
  hasLost(_board: Board, currentPlayer: Player): boolean {
    return currentPlayer.pieces.find(piece => piece.actionZone.killRange > 0);
  }
}

export class LooseConditionFactory {
  static getLooseCondition(descriptor: LooseConditionDescriptor) {
    switch(descriptor) {
      case LooseConditionDescriptor.NO_MORE_PIECE:
        return new NoMorePieceLooseCondition()
      case LooseConditionDescriptor.NO_MORE_KILLER:
        return new NoMoreKillerLooseCondition()
      default:
        throw new Error(`Given loose condition descriptor '${descriptor}' does not match any existing loose conditions.`)
    }
  }
}
