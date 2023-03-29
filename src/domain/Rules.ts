import { Board } from "./Board.ts";
import { Explorer, Shooter } from "../domain/Piece.ts";
import { PlayerOrigin } from "../domain/Player.ts";

/* Sets of methods that set boundaries on the game. Can be modified to create variants, new pieces etc... */
export class Rules {
  public static readonly BOARD_SIZE = 5;
  public static readonly ACTIVE_PLAYER_NUMBER = 2;
  public static readonly MOVE_PER_TURN = 2;
  public static readonly COUNT_KILL_AS_TURN_MOVE = false;
  public static readonly CAN_MOVE_PIECE_MULTIPLE_TIMES = false;
  public static readonly PLAYER_PIECES_GENERATOR = (playerId: string) => [
    new Explorer(playerId),
    new Shooter(playerId),
  ];

  public static readonly PLAYER_ORIGINS: PlayerOrigin[] = [
    { x: 0, y: 0, xModifier: 1, yModifier: 1 },
    {
      x: Rules.BOARD_SIZE - 1,
      y: Rules.BOARD_SIZE - 1,
      xModifier: -1,
      yModifier: -1,
    },
    { x: 0, y: Rules.BOARD_SIZE - 1, xModifier: 1, yModifier: -1 },
    { x: Rules.BOARD_SIZE - 1, y: 0, xModifier: -1, yModifier: 1 },
  ];

  static ensureCorrectBoardSize(board: Board) {
    const slotCount = board.slots.flat(1).length

    if (slotCount !== Rules.BOARD_SIZE * Rules.BOARD_SIZE) {
      throw new Error(`Rules enforcer fail: BOARD_SIZE is ${Rules.BOARD_SIZE} but we have ${slotCount} slots.`)
    }
  }

  static ensureCorrectPlayerCount(board: Board) {
    if (board.players.length < Rules.ACTIVE_PLAYER_NUMBER) {
      throw new Error(
        `Cannot instantiate board without ${Rules.ACTIVE_PLAYER_NUMBER} (from rule ACTIVE_PLAYER_NUMBER) players.`,
      );
    }
  }
}
