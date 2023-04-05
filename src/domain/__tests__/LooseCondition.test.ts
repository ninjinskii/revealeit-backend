import { assertEquals, beforeEach, describe, it } from "../../../deps.ts";
import { FakeMessenger } from "../../util/test-utils.ts";
import {
  NoMoreKillerLooseCondition,
  NoMorePieceLooseCondition,
} from "../LooseCondition.ts";
import { Rules } from "../../domain/Rules.ts";
import { Board } from "../../domain/Board.ts";
import { Player } from "../../model/Player.ts";

describe("LooseCondition", () => {
  let player = new Player({
    id: "player",
    name: "player",
    origin: {
      x: 0,
      y: 0,
      xModifier: 1,
      yModifier: 1,
    },
    pieces: Rules.PLAYER_PIECES_GENERATOR("1"),
    messenger: new FakeMessenger([], () => {}),
  });

  beforeEach(() => {
    player = new Player({
      id: "player",
      name: "player",
      origin: {
        x: 0,
        y: 0,
        xModifier: 1,
        yModifier: 1,
      },
      pieces: Rules.PLAYER_PIECES_GENERATOR("1"),
      messenger: new FakeMessenger([], () => {}),
    });
  });

  describe("NoMorePieceLooseCondition", () => {
    it("should be falsy if player has at least one piece left", () => {
      const looseCondition = new NoMorePieceLooseCondition();

      const hasLost = looseCondition.hasLost(
        undefined as unknown as Board,
        player,
      );

      assertEquals(hasLost, false);
    });

    it("should be truthy if player has no piece left", () => {
      const looseCondition = new NoMorePieceLooseCondition();
      player.pieces = [];

      const hasLost = looseCondition.hasLost(
        undefined as unknown as Board,
        player,
      );

      assertEquals(hasLost, true);
    });
  });

  describe("NoMoreKillerLooseCondition", () => {
    it("should be falsy if player has at least one killer left", () => {
      const looseCondition = new NoMoreKillerLooseCondition();
      player.pieces = player.pieces.filter((piece) =>
        piece.actionZone.killRange > 0
      );

      const hasLost = looseCondition.hasLost(
        undefined as unknown as Board,
        player,
      );

      assertEquals(hasLost, false);
    });

    it("should be truthy if player has no killer left", () => {
      const looseCondition = new NoMoreKillerLooseCondition();
      player.pieces = player.pieces.filter((piece) =>
        piece.actionZone.killRange === 0
      );

      const hasLost = looseCondition.hasLost(
        undefined as unknown as Board,
        player,
      );

      assertEquals(hasLost, true);
    });
  });
});
