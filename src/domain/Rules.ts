import { Board } from "./Board.ts";
import { Explorer, Shooter } from "../model/Piece.ts";
import { PlayerOrigin } from "../model/Player.ts";
import { LooseConditionDescriptor } from "./LooseCondition.ts";

/* Sets of methods that set boundaries on the game. Can be modified to create variants, new pieces etc... */
export class Rules {
  public static readonly BOARD_SIZE = Rules.getIntEnvironmentVariable({
    name: "BOARD_SIZE",
    default: 5,
  });

  public static readonly PLAYER_NUMBER = Rules.getIntEnvironmentVariable({
    name: "PLAYER_NUMBER",
    default: 2,
  });

  public static readonly MOVE_PER_TURN = Rules.getIntEnvironmentVariable({
    name: "MOVE_PER_TURN",
    default: 2,
  });

  public static readonly COUNT_KILL_AS_TURN_MOVE = Rules
    .getBooleanEnvironmentVariable({
      name: "COUNT_KILL_AS_TURN_MOVE",
      default: false,
    });

  public static readonly CAN_MOVE_PIECE_MULTIPLE_TIMES = Rules
    .getBooleanEnvironmentVariable({
      name: "CAN_MOVE_PIECE_MULTIPLE_TIMES",
      default: false,
    });

  public static readonly LOOSE_CONDITION = Rules.getStringEnvironmentVariable({
    name: "LOOSE_CONDITION",
    default: LooseConditionDescriptor.NO_MORE_KILLER,
  });

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
    const slotCount = board.slots.flat(1).length;

    if (slotCount !== Rules.BOARD_SIZE * Rules.BOARD_SIZE) {
      throw new Error(
        `Rules enforcer fail: BOARD_SIZE is ${Rules.BOARD_SIZE} but we have ${slotCount} slots.`,
      );
    }
  }

  static ensureCorrectPlayerCount(board: Board) {
    if (board.players.length < Rules.PLAYER_NUMBER) {
      throw new Error(
        `Cannot instantiate board without ${Rules.PLAYER_NUMBER} (from rule PLAYER_NUMBER) players.`,
      );
    }
  }

  static getIntEnvironmentVariable(
    options: { name: string; default: number },
  ): number {
    const env = Deno.env.get(options.name);
    const value = parseInt(env || "");

    return isNaN(value) ? options.default : value;
  }

  static getBooleanEnvironmentVariable(
    options: { name: string; default: boolean },
  ): boolean {
    const env = Deno.env.get(options.name);
    const invalid = env !== "true" && env !== "false";

    return invalid ? options.default : env === "true";
  }

  static getStringEnvironmentVariable(
    options: { name: string; default: string },
  ): string {
    const env = Deno.env.get(options.name);
    return env || options.default;
  }
}
