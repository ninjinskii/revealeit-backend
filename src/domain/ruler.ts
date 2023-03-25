import { Board } from "./board.ts";

/* Sets of methods that set boundaries on the game. Can be modified to create variants, new pieces etc... */
export class Ruler {
  public static readonly BOARD_SIZE = 5;
  public static readonly MIN_BOARD_SIZE = 2;
  public static readonly ACTIVE_PLAYER_NUMBER = 2;
  public static readonly MOVE_PER_TURN = 2;
  public static readonly COUNT_KILL_AS_TURN_MOVE = false;
  public static readonly CAN_MOVE_PIECE_MULTIPLE_TIMES = false; // TODO: implement

  static ensureCorrectBoardSize(board: Board) {
    if (Ruler.BOARD_SIZE <= Ruler.MIN_BOARD_SIZE) {
      throw new Error(
        `Cannot set BOARD_SIZE under ${Ruler.MIN_BOARD_SIZE} (from rule MIN_BOARD_SIZE)`,
      );
    }

    board.slots.flat(1).length === Ruler.BOARD_SIZE * Ruler.BOARD_SIZE;
  }

  static ensureCorrectActivePlayerCount(board: Board) {
    if (board.players.length < Ruler.ACTIVE_PLAYER_NUMBER) {
      throw new Error(
        `Cannot instantiate board without ${Ruler.ACTIVE_PLAYER_NUMBER} (from rule ACTIVE_PLAYER_NUMBER) players`,
      );
    }
  }
}
