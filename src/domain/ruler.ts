import { Board } from "./board.ts";
import { Player } from "./player.ts";

/* Sets of methods that set boundaries on the game. Can be modified to create variants, new pieces etc... */
export class Ruler {
    // public const player max pecies = 2
    // public const piece_shooter_name = "shooter"
    public static readonly BOARD_SIZE = 5
    public static readonly MIN_BOARD_SIZE = 2
    public static readonly ACTIVE_PLAYER_NUMBER = 2
    public static readonly MOVE_PER_TURN = 2

    static ensureCorrectBoardSize(board: Board) {
        if (Ruler.BOARD_SIZE <= Ruler.MIN_BOARD_SIZE) {
            throw new Error(`Cannot set BOARD_SIZE under ${Ruler.MIN_BOARD_SIZE} (from rule MIN_BOARD_SIZE)`)
        }

        board.slots.flat(1).length === Ruler.BOARD_SIZE * Ruler.BOARD_SIZE
    }
     
    static ensureCorrectActivePlayerCount(board: Board) {
        if (board.players.length < Ruler.ACTIVE_PLAYER_NUMBER) {
            throw new Error(`Cannot instantiate board without ${Ruler.ACTIVE_PLAYER_NUMBER} (from rule ACTIVE_PLAYER_NUMBER) players`)
        }
    }

    ensureCorrectPieces(players: Player[]) {
    }
}