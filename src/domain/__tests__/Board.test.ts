import {
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.173.0/testing/mock.ts";
import {
  assertEquals,
  assertSpyCall,
  assertThrows,
  describe,
  it,
} from "../../../deps.ts";
import { Player } from "../../model/Player.ts";
import {
  FakeMessenger,
  FakePiece,
  simpleStub,
  spyContext,
} from "../../util/test-utils.ts";
import { ActionZone, Direction } from "../ActionZone.ts";
import { Board } from "../Board.ts";
import { Rules } from "../Rules.ts";

describe("Board", () => {
  const player1 = new Player({
    id: "player1",
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

  const player2 = new Player({
    id: "player2",
    name: "player",
    origin: {
      x: Rules.BOARD_SIZE - 1,
      y: Rules.BOARD_SIZE - 1,
      xModifier: -1,
      yModifier: -1,
    },
    pieces: Rules.PLAYER_PIECES_GENERATOR("2"),
    messenger: new FakeMessenger([], () => {}),
  });

  const players = [player1, player2];

  describe("init", () => {
    it("should init self", () => {
      const playerCountRuleSpy = simpleStub(
        Rules,
        "ensureCorrectPlayerCount",
        undefined,
      );
      const boardSizeRuleSpy = simpleStub(
        Rules,
        "ensureCorrectBoardSize",
        undefined,
      );
      const board = new Board();
      const generateSlotsSpy = spy(board, "generateSlots");
      const initPiecesSpy = spy(board, "initPlayersPieces");
      const boardUpdateSpy = spy(board, "broadcastBoardUpdate");
      const playersUpdateSpy = spy(board, "broadcastPlayersUpdate");
      const startTurnSpy = spy(board.turn, "start");

      board.init(players);

      spyContext(
        [
          playerCountRuleSpy,
          boardSizeRuleSpy,
          generateSlotsSpy,
          initPiecesSpy,
          boardUpdateSpy,
          playersUpdateSpy,
          startTurnSpy,
        ],
        () => {
          assertEquals(board.players, players);
          assertSpyCall(playerCountRuleSpy, 0, { args: [board] });
          assertSpyCall(boardSizeRuleSpy, 0, { args: [board] });
          assertSpyCalls(generateSlotsSpy, 1);
          assertSpyCalls(initPiecesSpy, 1);
          assertSpyCalls(boardUpdateSpy, 1);
          assertSpyCalls(playersUpdateSpy, 1);
          assertSpyCalls(startTurnSpy, 1);
        },
      );
    });

    it("should throw if player number is incorrect", () => {
      const board = new Board();
      const missingPlayer = [player1];

      try {
        board.init(missingPlayer);
      } catch (error) {
        assertEquals(
          error.message,
          `Cannot instantiate board without ${Rules.PLAYER_NUMBER} (from rule PLAYER_NUMBER) players.`,
        );
        return;
      }

      throw new Error("This line should not be executed");
    });
  });

  describe("generateSlots", () => {
    it("should update flattened slots & slots", () => {
      const board = new Board();
      board.players = players;

      board.generateSlots();

      assertEquals(
        board.flattenedSlots.length,
        Rules.BOARD_SIZE * Rules.BOARD_SIZE,
      );
      assertEquals(board.slots.length, Rules.BOARD_SIZE);
    });
  });

  describe("initPlayersPieces", () => {
    it("should setup correct pieces", () => {
      const board = new Board();
      board.players = players;

      board.generateSlots();
      board.initPlayersPieces();

      const pieceCount = board.players
        .map((player) => player.pieces)
        .flat(1)
        .length;

      const filledSlotCount = board.flattenedSlots
        .filter((slot) => slot.piece !== null)
        .length;

      const expectedPieceCount = Rules.PLAYER_PIECES_GENERATOR("").length *
        players.length;

      assertEquals(pieceCount, expectedPieceCount);
      assertEquals(filledSlotCount, expectedPieceCount);
    });
  });

  describe("getAllPieces", () => {
    it("should get all pieces", () => {
      const board = new Board();
      board.init(players);
      const expectedPieceCount = Rules.PLAYER_PIECES_GENERATOR("").length *
        players.length;

      const pieces = board.getAllPieces();

      assertEquals(pieces.length, expectedPieceCount);
    });
  });

  describe("getDistance", () => {
    it("should get distance", () => {
      const board = new Board();
      board.init(players);

      const distance = board.getDistance(0, 0, 2, 0);

      assertEquals(distance, 2);
    });
  });

  describe("isSlotEmpty", () => {
    it("should be truthy if slot is empty", () => {
      const board = new Board();
      board.init(players);
      board.slots[0][0].piece = null;

      const isEmpty = board.isSlotEmpty(0, 0);

      assertEquals(isEmpty, true);
    });

    it("should be falsy if slot is NOT empty", () => {
      const board = new Board();
      board.init(players);
      board.slots[0][0].piece = player1.pieces[0];

      const isEmpty = board.isSlotEmpty(0, 0);

      assertEquals(isEmpty, false);
    });
  });

  describe("isSlotInBoard", () => {
    it("should be truthy if slot is in board", () => {
      const board = new Board();
      board.init(players);

      const isInBoard = board.isSlotInBoard(0, 0);

      assertEquals(isInBoard, true);
    });

    it("should be falsy if slot is NOT in board", () => {
      const board = new Board();
      board.init(players);

      const isInBoard = board.isSlotInBoard(Infinity, Infinity);

      assertEquals(isInBoard, false);
    });
  });

  describe("getSlot", () => {
    it("can return a slot at given location", () => {
      const board = new Board();
      board.init(players);
      board.slots[0][0].piece = null;

      const slot = board.getSlot(0, 0);

      assertEquals(slot, { x: 0, y: 0, piece: null });
    });
  });

  describe("isMovementDistanceInBounds", () => {
    it("should be truthy if distance is in bounds", () => {
      const board = new Board();
      const piece = new FakePiece();
      const distanceSpy = simpleStub(board, "getDistance", 1);
      const pieceLocationSpy = simpleStub(board, "getPieceLocation", {
        x: 0,
        y: 0,
      });
      board.init(players);

      const inBounds = board.isMovementDistanceInBounds(piece, 1, 0);

      spyContext([pieceLocationSpy, distanceSpy], () => {
        assertEquals(inBounds, true);
        assertSpyCall(pieceLocationSpy, 0, { args: [piece] });
        assertSpyCall(distanceSpy, 0, { args: [0, 0, 1, 0] });
      });
    });

    it("should be falsy if piece location cannot be retrieved", () => {
      const board = new Board();
      const piece = new FakePiece();
      const pieceLocationSpy = simpleStub(board, "getPieceLocation", null);
      const distanceSpy = simpleStub(board, "getDistance", 1);
      board.init(players);

      const inBounds = board.isMovementDistanceInBounds(piece, 1, 0);

      spyContext([pieceLocationSpy, distanceSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceLocationSpy, 0, { args: [piece] });
        assertSpyCalls(distanceSpy, 0);
      });
    });

    it("should be falsy if distance is out of bounds", () => {
      const board = new Board();
      const piece = new FakePiece();
      const distanceSpy = simpleStub(board, "getDistance", 2);
      const pieceLocationSpy = simpleStub(board, "getPieceLocation", {
        x: 0,
        y: 0,
      });
      board.init(players);

      const inBounds = board.isMovementDistanceInBounds(piece, 2, 0);

      spyContext([pieceLocationSpy, distanceSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceLocationSpy, 0, { args: [piece] });
        assertSpyCall(distanceSpy, 0, { args: [0, 0, 2, 0] });
      });
    });

    it("should be falsy if distance is lower than 0", () => {
      const board = new Board();
      const piece = new FakePiece();
      const distanceSpy = simpleStub(board, "getDistance", -1);
      const pieceLocationSpy = simpleStub(board, "getPieceLocation", {
        x: 0,
        y: 0,
      });
      board.init(players);

      const inBounds = board.isMovementDistanceInBounds(piece, 1, 0);

      spyContext([pieceLocationSpy, distanceSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceLocationSpy, 0, { args: [piece] });
        assertSpyCall(distanceSpy, 0, { args: [0, 0, 1, 0] });
      });
    });
  });
});
