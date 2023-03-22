import { Board } from "./board.ts";
import { ActivePlayer } from "./player.ts";

interface LooseCondition {
    hasLost(board: Board, currentPlayer: ActivePlayer): boolean
}

export class NoMorePieceLooseCondition implements LooseCondition {
    hasLost(_board: Board, currentPlayer: ActivePlayer): boolean {
        return currentPlayer.pieces.length === 0
    }
}