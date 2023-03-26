import { Board } from "./board.ts";
import { Explorer, Shooter } from "./piece.ts";
import { PlayerOrigin } from "./player.ts";

/* Sets of methods that set boundaries on the game. Can be modified to create variants, new pieces etc... */
export class Ruler {
  public static readonly BOARD_SIZE = 5;
  public static readonly MIN_BOARD_SIZE = 2;
  public static readonly ACTIVE_PLAYER_NUMBER = 2;
  public static readonly MOVE_PER_TURN = 2;
  public static readonly COUNT_KILL_AS_TURN_MOVE = false;
  public static readonly CAN_MOVE_PIECE_MULTIPLE_TIMES = false; // TODO: implement
  public static readonly PLAYER_PIECES_GENERATOR = (playerId: string) => [
    new Explorer(playerId),
    new Shooter(playerId),
  ];

  public static readonly PLAYER_ORIGINS: PlayerOrigin[] = [
    { x: 0, y: 0, xModifier: 1, yModifier: 1 },
    {
      x: Ruler.BOARD_SIZE - 1,
      y: Ruler.BOARD_SIZE - 1,
      xModifier: -1,
      yModifier: -1,
    },
    { x: 0, y: Ruler.BOARD_SIZE - 1, xModifier: 1, yModifier: -1 },
    { x: Ruler.BOARD_SIZE - 1, y: 0, xModifier: -1, yModifier: 1 },
  ];

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
