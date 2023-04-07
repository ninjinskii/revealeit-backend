import {
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.173.0/testing/mock.ts";
import {
  assertEquals,
  assertSpyCall,
  beforeEach,
  describe,
  it,
} from "../../../deps.ts";
import { Explorer, Shooter } from "../../model/Piece.ts";
import { Player } from "../../model/Player.ts";
import { BoardError } from "../../util/BoardError.ts";
import {
  assertThrows,
  FakeMessenger,
  FakePiece,
  multipleStub,
  simpleStub,
  spyContext,
} from "../../util/test-utils.ts";
import { Board, Slot } from "../Board.ts";
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
    pieces: [new Explorer("player1"), new Shooter("player1")],
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
    pieces: [new Explorer("player2"), new Shooter("player2")],
    messenger: new FakeMessenger([], () => {}),
  });

  const players = [player1, player2];

  beforeEach(() => {
    player1.pieces = [new Explorer("player1"), new Shooter("player1")];
    player2.pieces = [new Explorer("player2"), new Shooter("player2")];
  });

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
      const configurationSpy = spy(board, "broadcastConfiguration");
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
          configurationSpy,
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
          assertSpyCalls(configurationSpy, 1);
          assertSpyCalls(boardUpdateSpy, 1);
          assertSpyCalls(playersUpdateSpy, 1);
          assertSpyCalls(startTurnSpy, 1);
        },
      );
    });

    it("should throw if player number is incorrect", () => {
      const board = new Board();
      const missingPlayer = [player1];

      assertThrows({
        shouldThrow() {
          board.init(missingPlayer);
        },
        catch(error) {
          assertEquals(
            error.message,
            `Cannot instantiate board without ${Rules.PLAYER_NUMBER} (from rule PLAYER_NUMBER) players.`,
          );
        },
      });
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

  describe("isSlotDistanceInBounds", () => {
    it("should be truthy if distance is in bounds", () => {
      const board = new Board();
      const piece = new FakePiece();
      const positionX = 0;
      const positionY = 0;
      const targetX = 1;
      const targetY = 0;
      const resolveMoveSpy = simpleStub(piece.actionZone, "resolveMove", [{
        x: targetX,
        y: targetY,
      }]);

      const pieceSlotSpy = simpleStub(board, "getPieceSlot", {
        x: positionX,
        y: positionY,
        piece,
      });

      board.init(players);

      const inBounds = board.isSlotDistanceInBounds(
        piece,
        targetX,
        targetY,
      );

      spyContext([pieceSlotSpy, resolveMoveSpy], () => {
        assertEquals(inBounds, true);
        assertSpyCall(pieceSlotSpy, 0, { args: [piece] });
        assertSpyCall(resolveMoveSpy, 0, {
          args: [board.flattenedSlots, positionX, positionY],
        });
      });
    });

    it("should be falsy if piece slot cannot be retrieved", () => {
      const board = new Board();
      const piece = new FakePiece();
      const targetX = 1;
      const targetY = 0;
      const resolveMoveSpy = simpleStub(piece.actionZone, "resolveMove", [{
        x: targetX,
        y: targetY,
      }]);

      const pieceSlotSpy = simpleStub(board, "getPieceSlot", null);

      board.init(players);

      const inBounds = board.isSlotDistanceInBounds(
        piece,
        targetX,
        targetY,
      );

      spyContext([pieceSlotSpy, resolveMoveSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceSlotSpy, 0, { args: [piece] });
        assertSpyCalls(resolveMoveSpy, 0);
      });
    });

    it("should be falsy if distance is out of bounds", () => {
      const board = new Board();
      const piece = new FakePiece();
      const positionX = 0;
      const positionY = 0;
      const maxXRange = 1;
      const targetX = 2; // <-- we're trying to move 2 slots away
      const targetY = 0;
      const resolveMoveSpy = simpleStub(piece.actionZone, "resolveMove", [{
        x: maxXRange,
        y: targetY,
      }]);

      const pieceSlotSpy = simpleStub(board, "getPieceSlot", {
        x: positionX,
        y: positionY,
        piece,
      });

      board.init(players);

      const inBounds = board.isSlotDistanceInBounds(
        piece,
        targetX,
        targetY,
      );

      spyContext([pieceSlotSpy, resolveMoveSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceSlotSpy, 0, { args: [piece] });
        assertSpyCall(resolveMoveSpy, 0, {
          args: [board.flattenedSlots, positionX, positionY],
        });
      });
    });
  });

  describe("isSlotInRevealedZone", () => {
    it("should be truthy if targeted slot is in revealed zone", () => {
      const board = new Board();
      const piece = new FakePiece();
      const positionX = 0;
      const positionY = 0;
      const targetX = 1;
      const targetY = 0;
      const resolveMoveSpy = simpleStub(piece.actionZone, "resolveReveal", [{
        x: targetX,
        y: targetY,
      }]);

      const pieceSlotSpy = simpleStub(board, "getPieceSlot", {
        x: positionX,
        y: positionY,
        piece,
      });

      board.init(players);

      const inBounds = board.isSlotInRevealedZone(
        piece,
        targetX,
        targetY,
      );

      spyContext([pieceSlotSpy, resolveMoveSpy], () => {
        assertEquals(inBounds, true);
        assertSpyCall(pieceSlotSpy, 0, { args: [piece] });
        assertSpyCall(resolveMoveSpy, 0, {
          args: [board.flattenedSlots, positionX, positionY],
        });
      });
    });

    it("should be falsy if piece slot cannot be retrieved", () => {
      const board = new Board();
      const piece = new FakePiece();
      const targetX = 1;
      const targetY = 0;
      const resolveMoveSpy = simpleStub(piece.actionZone, "resolveReveal", [{
        x: targetX,
        y: targetY,
      }]);

      const pieceSlotSpy = simpleStub(board, "getPieceSlot", null);

      board.init(players);

      const inBounds = board.isSlotInRevealedZone(
        piece,
        targetX,
        targetY,
      );

      spyContext([pieceSlotSpy, resolveMoveSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceSlotSpy, 0, { args: [piece] });
        assertSpyCalls(resolveMoveSpy, 0);
      });
    });

    it("should be falsy if targeted slot is out of revealed zone", () => {
      const board = new Board();
      const piece = new FakePiece();
      const positionX = 0;
      const positionY = 0;
      const maxXRange = 1;
      const targetX = 2; // <-- we're trying to move 2 slots away
      const targetY = 0;
      const resolveMoveSpy = simpleStub(piece.actionZone, "resolveReveal", [{
        x: maxXRange,
        y: targetY,
      }]);

      const pieceSlotSpy = simpleStub(board, "getPieceSlot", {
        x: positionX,
        y: positionY,
        piece,
      });

      board.init(players);

      const inBounds = board.isSlotInRevealedZone(
        piece,
        targetX,
        targetY,
      );

      spyContext([pieceSlotSpy, resolveMoveSpy], () => {
        assertEquals(inBounds, false);
        assertSpyCall(pieceSlotSpy, 0, { args: [piece] });
        assertSpyCall(resolveMoveSpy, 0, {
          args: [board.flattenedSlots, positionX, positionY],
        });
      });
    });
  });

  describe("getRevealedZoneForPiece", () => {
    it("should throw if slot cannot be retrieved", () => {
      const piece = new FakePiece();
      const board = new Board();
      board.init(players);
      const getSlotSpy = simpleStub(board, "getPieceSlot", null);

      assertThrows({
        shouldThrow() {
          board.getRevealedZoneForPiece(piece);
        },
        catch(error) {
          assertEquals(error instanceof BoardError, true);
          assertEquals(
            error.message,
            "Cannot get revealed zone for piece: piece slot not found",
          );
          assertSpyCall(getSlotSpy, 0, { args: [piece] });
        },
      });
    });

    it("can get reveal area", () => {
      const piece = new FakePiece();
      const board = new Board();
      board.init(players);
      const resolveRevealSpy = simpleStub(
        piece.actionZone,
        "resolveReveal",
        [],
      );
      const getSlotSpy = simpleStub(board, "getPieceSlot", {
        x: 0,
        y: 0,
        piece,
      });

      board.getRevealedZoneForPiece(piece);

      assertSpyCall(getSlotSpy, 0, { args: [piece] });
      assertSpyCall(resolveRevealSpy, 0, {
        args: [board.flattenedSlots, 0, 0],
      });
    });
  });

  describe("getRevealedZoneForPlayer", () => {
    it("can get revealed zone for player", () => {
      const board = new Board();
      board.init(players);
      const piece1 = player1.pieces[0];
      const piece2 = player1.pieces[1];
      const piece1RevealedZone = [{ x: 1, y: 0, piece: null }, {
        x: 0,
        y: 1,
        piece: null,
      }];

      const piece2RevealedZone = [{ x: 2, y: 2, piece: null }];
      const resolveReveal1Spy = simpleStub(
        piece1.actionZone,
        "resolveReveal",
        piece1RevealedZone,
      );

      const resolveReveal2Spy = simpleStub(
        piece2.actionZone,
        "resolveReveal",
        piece2RevealedZone,
      );

      const piece1X = 0;
      const piece1Y = 0;
      const piece2X = 0;
      const piece2Y = 1;
      const getSlotSpy = multipleStub(board, "getPieceSlot", [
        { x: piece1X, y: piece1Y, piece: piece1 },
        { x: piece2X, y: piece2Y, piece: piece2 },
      ]);

      const revealedZone = board.getRevealedZoneForPlayer(player1);

      spyContext([resolveReveal1Spy, resolveReveal2Spy, getSlotSpy], () => {
        assertSpyCall(getSlotSpy, 0, { args: [piece1] });
        assertSpyCall(getSlotSpy, 1, { args: [piece2] });
        assertSpyCall(resolveReveal1Spy, 0, {
          args: [board.flattenedSlots, piece1X, piece1Y],
        });
        assertSpyCall(resolveReveal2Spy, 0, {
          args: [board.flattenedSlots, piece2X, piece2Y],
        });
        assertEquals(revealedZone, [
          ...piece1RevealedZone,
          ...piece2RevealedZone,
        ]);
      });
    });

    it("should remove duplicates from pieces revealed overlapping zone", () => {
      const board = new Board();
      board.init(players);
      const piece1 = player1.pieces[0];
      const piece2 = player1.pieces[1];
      const piece1RevealedZone = [{ x: 1, y: 0, piece: null }, {
        x: 0,
        y: 1,
        piece: null,
      }];

      const piece2RevealedZone = [{ x: 0, y: 1, piece: null }]; // <-- duplicate
      const resolveReveal1Spy = simpleStub(
        piece1.actionZone,
        "resolveReveal",
        piece1RevealedZone,
      );

      const resolveReveal2Spy = simpleStub(
        piece2.actionZone,
        "resolveReveal",
        piece2RevealedZone,
      );

      const getSlotSpy = multipleStub(board, "getPieceSlot", [true, true]);

      const revealedZone = board.getRevealedZoneForPlayer(player1);

      spyContext([resolveReveal1Spy, resolveReveal2Spy, getSlotSpy], () => {
        assertSpyCalls(getSlotSpy, 2);
        assertSpyCalls(resolveReveal1Spy, 1);
        assertSpyCalls(resolveReveal2Spy, 1);
        assertEquals(revealedZone.length, 2);
      });
    });

    it("should ignore piece if its slot cannot be retrieved", () => {
      const board = new Board();
      board.init(players);
      const piece1 = player1.pieces[0];
      const piece2 = player1.pieces[1];
      const resolveReveal1Spy = simpleStub(
        piece1.actionZone,
        "resolveReveal",
        [],
      );

      const resolveReveal2Spy = simpleStub(
        piece2.actionZone,
        "resolveReveal",
        [],
      );

      const getSlotSpy = multipleStub(board, "getPieceSlot", [true, null]);

      board.getRevealedZoneForPlayer(player1);

      spyContext([resolveReveal1Spy, resolveReveal2Spy, getSlotSpy], () => {
        assertSpyCalls(getSlotSpy, 2);
        assertSpyCalls(resolveReveal1Spy, 1);
        assertSpyCalls(resolveReveal2Spy, 0);
      });
    });
  });

  describe("getKillableSlotsForPlayer", () => {
    it("can get killable slots for player", () => {
      const board = new Board();
      board.init(players);
      const killer = player1.pieces[1];
      const victim = player2.pieces[0];
      const targetSlot = { x: 1, y: 2, piece: victim };
      const revealedZone = [{ x: 1, y: 1, piece: null }, targetSlot];
      const killZone = [targetSlot];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = simpleStub(board, "getPieceSlot", {
        x: 0,
        y: 1,
        piece: killer,
      });

      const resolveKillSpy = simpleStub(
        killer.actionZone,
        "resolveKill",
        killZone,
      );

      const killableZone = board.getKillableSlotsForPlayer(player1);

      spyContext([playerRevealedSlotsSpy, getSlotSpy, resolveKillSpy], () => {
        assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
        assertSpyCall(getSlotSpy, 0, { args: [killer] });
        assertSpyCall(resolveKillSpy, 0, {
          args: [board.flattenedSlots, 0, 1],
        });
        assertEquals(killableZone, killZone);
      });
    });

    it("can get killable slots for player from multiple killers", () => {
      const board = new Board();
      board.init(players);
      const killer2 = new Shooter("player1");
      const killer1 = player1.pieces[1];
      const victim = player2.pieces[0];
      const victim2 = player2.pieces[1];
      const targetSlot1 = { x: 1, y: 2, piece: victim };
      const targetSlot2 = { x: 1, y: 3, piece: victim2 };
      const revealedZone = [
        { x: 1, y: 1, piece: null },
        targetSlot1,
        targetSlot2,
      ];
      const killZone1 = [targetSlot1];
      const killZone2 = [targetSlot2];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = multipleStub(board, "getPieceSlot", [
        { x: 0, y: 1, piece: killer1 },
        { x: 1, y: 1, piece: killer2 },
      ]);

      const resolveKill1Spy = simpleStub(
        killer1.actionZone,
        "resolveKill",
        killZone1,
      );

      const resolveKill2Spy = simpleStub(
        killer2.actionZone,
        "resolveKill",
        killZone2,
      );

      player1.pieces.push(killer2);
      const killableZone = board.getKillableSlotsForPlayer(player1);

      spyContext([playerRevealedSlotsSpy, getSlotSpy, resolveKill1Spy], () => {
        assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
        assertSpyCall(getSlotSpy, 0, { args: [killer1] });
        assertSpyCall(getSlotSpy, 1, { args: [killer2] });
        assertSpyCall(resolveKill1Spy, 0, {
          args: [board.flattenedSlots, 0, 1],
        });
        assertSpyCall(resolveKill2Spy, 0, {
          args: [board.flattenedSlots, 1, 1],
        });
        assertEquals(killableZone, [...killZone1, ...killZone2]);
      });
    });

    it("should be empty if player has no more killer", () => {
      const board = new Board();
      board.init(players);
      const victim = player2.pieces[0];
      const targetSlot = { x: 1, y: 2, piece: victim };
      const revealedZone = [{ x: 1, y: 1, piece: null }, targetSlot];
      const killZone: Slot[] = [];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = simpleStub(board, "getPieceSlot", undefined);

      player1.pieces = [];
      const killableZone = board.getKillableSlotsForPlayer(player1);

      spyContext([playerRevealedSlotsSpy, getSlotSpy], () => {
        assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
        assertSpyCalls(getSlotSpy, 0);
        assertEquals(killableZone, killZone);
      });
    });

    it("should throw if one of the killers location cannot be retrieved", () => {
      const board = new Board();
      board.init(players);
      const victim = player2.pieces[0];
      const killer = player1.pieces[1];
      const targetSlot = { x: 1, y: 2, piece: victim };
      const revealedZone = [{ x: 1, y: 1, piece: null }, targetSlot];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = simpleStub(board, "getPieceSlot", null);

      assertThrows({
        shouldThrow() {
          board.getKillableSlotsForPlayer(player1);
        },
        catch(error) {
          spyContext([playerRevealedSlotsSpy, getSlotSpy], () => {
            assertEquals(error instanceof BoardError, true);
            assertEquals(
              error.message,
              "Cannot get killable pieces: piece slot not found",
            );
            assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
            assertSpyCall(getSlotSpy, 0, { args: [killer] });
          });
        },
      });
    });

    it("should be empty if targeted slot piece is null", () => {
      const board = new Board();
      board.init(players);
      const killer = player1.pieces[1];
      const targetSlot = { x: 1, y: 2, piece: null };
      const revealedZone = [{ x: 1, y: 1, piece: null }, targetSlot];
      const killZone = [targetSlot];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = simpleStub(board, "getPieceSlot", {
        x: 0,
        y: 1,
        piece: killer,
      });

      const resolveKillSpy = simpleStub(
        killer.actionZone,
        "resolveKill",
        killZone,
      );

      const killableZone = board.getKillableSlotsForPlayer(player1);

      spyContext([playerRevealedSlotsSpy, getSlotSpy, resolveKillSpy], () => {
        assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
        assertSpyCall(getSlotSpy, 0, { args: [killer] });
        assertSpyCall(resolveKillSpy, 0, {
          args: [board.flattenedSlots, 0, 1],
        });
        assertEquals(killableZone, []);
      });
    });

    it("should include revealed slots ONLY", () => {
      const board = new Board();
      board.init(players);
      const killer = player1.pieces[1];
      const victim = player2.pieces[0];
      const targetSlot = { x: 1, y: 2, piece: victim };
      const revealedZone = [{ x: 1, y: 1, piece: null }]; // <-- target slot is not in revealed zone
      const killZone = [targetSlot];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = simpleStub(board, "getPieceSlot", {
        x: 0,
        y: 1,
        piece: killer,
      });

      const resolveKillSpy = simpleStub(
        killer.actionZone,
        "resolveKill",
        killZone,
      );

      const killableZone = board.getKillableSlotsForPlayer(player1);

      spyContext([playerRevealedSlotsSpy, getSlotSpy, resolveKillSpy], () => {
        assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
        assertSpyCall(getSlotSpy, 0, { args: [killer] });
        assertSpyCall(resolveKillSpy, 0, {
          args: [board.flattenedSlots, 0, 1],
        });
        assertEquals(killableZone, []);
      });
    });

    it("should NOT return player's own pieces", () => {
      const board = new Board();
      board.init(players);
      const killer = player1.pieces[1];
      const victim = player1.pieces[0];
      const targetSlot = { x: 1, y: 2, piece: victim };
      const revealedZone = [{ x: 1, y: 1, piece: null }, targetSlot];
      const killZone = [targetSlot];
      const playerRevealedSlotsSpy = simpleStub(
        board,
        "getRevealedZoneForPlayer",
        revealedZone,
      );

      const getSlotSpy = simpleStub(board, "getPieceSlot", {
        x: 0,
        y: 1,
        piece: killer,
      });

      const resolveKillSpy = simpleStub(
        killer.actionZone,
        "resolveKill",
        killZone,
      );

      const killableZone = board.getKillableSlotsForPlayer(player1);

      spyContext([playerRevealedSlotsSpy, getSlotSpy, resolveKillSpy], () => {
        assertSpyCall(playerRevealedSlotsSpy, 0, { args: [player1] });
        assertSpyCall(getSlotSpy, 0, { args: [killer] });
        assertSpyCall(resolveKillSpy, 0, {
          args: [board.flattenedSlots, 0, 1],
        });
        assertEquals(killableZone, []);
      });
    });
  });

  describe("getPieceLocation", () => {
    it("can get location of a piece", () => {
      const piece = player1.pieces[0];
      const board = new Board();
      board.init(players);
      board.flattenedSlots = [{ x: 0, y: 0, piece }];

      const location = board.getPieceLocation(piece);

      assertEquals(location, { x: 0, y: 0 });
    });

    it("should be null if piece cannot be retrieved", () => {
      const piece = player1.pieces[0];
      const board = new Board();
      board.init(players);
      board.flattenedSlots = [];

      const location = board.getPieceLocation(piece);

      assertEquals(location, null);
    });
  });

  describe("getPieceSlot", () => {
    it("can get piece slot", () => {
      const piece = player1.pieces[0];
      const board = new Board();
      board.init(players);
      board.flattenedSlots = [{ x: 0, y: 0, piece }];

      const slot = board.getPieceSlot(piece);

      assertEquals(slot, { x: 0, y: 0, piece });
    });

    it("should be null if piece cannot be retrieved", () => {
      const piece = player1.pieces[0];
      const board = new Board();
      board.init(players);
      board.flattenedSlots = [];

      const slot = board.getPieceSlot(piece);

      assertEquals(slot, null);
    });
  });

  describe("movePieceTo", () => {
    it("can move a piece", () => {
      const piece = player1.pieces[0];
      const board = new Board();
      board.init(players);
      const turn = board.turn;
      const positionX = 0;
      const positionY = 0;
      const targetX = 0;
      const targetY = 1;
      const currentLocation = { x: positionX, y: positionY };
      const movableSpy = simpleStub(turn, "isPieceMoveable", true);
      const turnSpy = simpleStub(board, "isPlayerTurn", true);
      const inBoardSpy = simpleStub(board, "isSlotInBoard", true);
      const distanceSpy = simpleStub(board, "isSlotDistanceInBounds", true);
      const revealSpy = simpleStub(board, "isSlotInRevealedZone", true);
      const emptySlotSpy = simpleStub(board, "isSlotEmpty", true);
      const playSpy = simpleStub(turn, "registerPlay", undefined);
      const locationSpy = simpleStub(
        board,
        "getPieceLocation",
        currentLocation,
      );
      const boardUpdateSpy = simpleStub(
        board,
        "broadcastBoardUpdate",
        undefined,
      );

      board.movePieceTo(piece, targetX, targetY);

      const positionSlot = board.slots[positionY][positionX];
      const targetSlot = board.slots[targetY][targetX];

      spyContext([
        movableSpy,
        turnSpy,
        inBoardSpy,
        distanceSpy,
        revealSpy,
        emptySlotSpy,
        playSpy,
        boardUpdateSpy,
        locationSpy,
      ], () => {
        assertSpyCall(movableSpy, 0, { args: [piece] });
        assertSpyCall(turnSpy, 0, { args: [player1] });
        assertSpyCall(inBoardSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(distanceSpy, 0, { args: [piece, targetX, targetY] });
        assertSpyCall(revealSpy, 0, { args: [piece, targetX, targetY] });
        assertSpyCall(emptySlotSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(locationSpy, 0, { args: [piece] });
        assertEquals(positionSlot.piece, null);
        assertEquals(targetSlot.piece, piece);
        assertSpyCalls(boardUpdateSpy, 1);
        assertSpyCalls(playSpy, 1);
      });
    });
  });

  describe("killPieceAt", () => {
    it("can kill a piece", () => {
      const killerPlayer = player2;
      const victimPlayer = player1;
      const victim = victimPlayer.pieces[0];
      const board = new Board();
      board.init(players);
      const turn = board.turn;
      const targetX = 0;
      const targetY = 1;
      const targetSlot = { x: targetX, y: targetY, piece: victim };
      const turnSpy = simpleStub(board, "isPlayerTurn", true);
      const killableSpy = simpleStub(board, "getKillableSlotsForPlayer", [
        targetSlot,
      ]);
      const inBoardSpy = simpleStub(board, "isSlotInBoard", true);
      const revealSpy = simpleStub(board, "isSlotInRevealedZone", true);
      const emptySlotSpy = simpleStub(board, "isSlotEmpty", false);
      const getSlotSpy = simpleStub(board, "getSlot", targetSlot);
      const playSpy = simpleStub(turn, "registerPlay", undefined);
      const nextSpy = simpleStub(turn, "triggerNext", undefined);
      const looseSpy = simpleStub(turn, "checkLooseCondition", undefined);
      const boardUpdateSpy = simpleStub(
        board,
        "broadcastBoardUpdate",
        undefined,
      );

      board.killPieceAt(killerPlayer, targetX, targetY);

      spyContext([
        turnSpy,
        killableSpy,
        inBoardSpy,
        revealSpy,
        emptySlotSpy,
        getSlotSpy,
        playSpy,
        nextSpy,
        looseSpy,
        boardUpdateSpy,
      ], () => {
        assertSpyCall(turnSpy, 0, { args: [killerPlayer] });
        assertSpyCall(killableSpy, 0, { args: [killerPlayer] });
        assertSpyCall(inBoardSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(emptySlotSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(getSlotSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(revealSpy, 0, { args: [victim, targetX, targetY] });
        assertSpyCalls(playSpy, Rules.COUNT_KILL_AS_TURN_MOVE ? 1 : 0);
        assertSpyCalls(nextSpy, 0);
        assertSpyCalls(looseSpy, 1);
        assertSpyCalls(boardUpdateSpy, 1);
      });
    });

    it("should trigger next turn if game is waiting for a kill", () => {
      const killerPlayer = player2;
      const victimPlayer = player1;
      const victim = victimPlayer.pieces[0];
      const board = new Board();
      board.init(players);
      const turn = board.turn;
      const targetX = 0;
      const targetY = 1;
      const targetSlot = { x: targetX, y: targetY, piece: victim };
      const turnSpy = simpleStub(board, "isPlayerTurn", true);
      const killableSpy = simpleStub(board, "getKillableSlotsForPlayer", [
        targetSlot,
      ]);
      const inBoardSpy = simpleStub(board, "isSlotInBoard", true);
      const revealSpy = simpleStub(board, "isSlotInRevealedZone", true);
      const emptySlotSpy = simpleStub(board, "isSlotEmpty", false);
      const getSlotSpy = simpleStub(board, "getSlot", targetSlot);
      const playSpy = simpleStub(turn, "registerPlay", undefined);
      const nextSpy = simpleStub(turn, "triggerNext", undefined);
      const looseSpy = simpleStub(turn, "checkLooseCondition", undefined);
      const boardUpdateSpy = simpleStub(
        board,
        "broadcastBoardUpdate",
        undefined,
      );

      turn.waitForKill = true;
      board.killPieceAt(killerPlayer, targetX, targetY);

      spyContext([
        turnSpy,
        killableSpy,
        inBoardSpy,
        revealSpy,
        emptySlotSpy,
        getSlotSpy,
        playSpy,
        nextSpy,
        looseSpy,
        boardUpdateSpy,
      ], () => {
        assertSpyCall(turnSpy, 0, { args: [killerPlayer] });
        assertSpyCall(killableSpy, 0, { args: [killerPlayer] });
        assertSpyCall(inBoardSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(emptySlotSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(getSlotSpy, 0, { args: [targetX, targetY] });
        assertSpyCall(revealSpy, 0, { args: [victim, targetX, targetY] });
        assertSpyCalls(playSpy, Rules.COUNT_KILL_AS_TURN_MOVE ? 1 : 0);
        assertSpyCalls(nextSpy, 1);
        assertSpyCalls(looseSpy, 0); // Loose condition will be checked by Turn#triggerNext, represented here by nextSpy
        assertSpyCalls(boardUpdateSpy, 1);
        assertEquals(turn.waitForKill, false);
      });
    });
  });

  describe("isPlayerTurn", () => {
    it("can determine if given player has to play", () => {
      const board = new Board();
      board.init(players);

      const isPlayer1Turn = board.isPlayerTurn(player1);
      const isPlayer2Turn = board.isPlayerTurn(player2);

      assertEquals(isPlayer1Turn, true);
      assertEquals(isPlayer2Turn, false);
    });
  });

  describe("getPlayerById", () => {
    it("can get a player with given id", () => {
      const board = new Board();
      board.init(players);

      const player = board.getPlayerById(player1.id);

      assertEquals(player, player1);
    });
  });

  describe("onPlayerLost", () => {
    it("should remove all player pieces", () => {
      const board = new Board();
      board.init(players);

      board.onPlayerLost(player1);

      assertEquals(player1.pieces.length, 0);
    });
  });

  describe("broadcastBoardUpdate", () => {
    it("can broadcast a board update to every players", () => {
      const board = new Board();
      board.init(players);
      const player1Spy = simpleStub(
        player1.messenger,
        "sendMessage",
        undefined,
      );

      const player2Spy = simpleStub(
        player2.messenger,
        "sendMessage",
        undefined,
      );

      board.broadcastBoardUpdate();

      spyContext([player1Spy, player2Spy], () => {
        assertSpyCalls(player1Spy, 1);
        assertSpyCalls(player2Spy, 1);
      });
    });
  });

  describe("broadcastPlayersUpdate", () => {
    it("can broadcast a player update to every players", () => {
      const board = new Board();
      board.init(players);
      const player1Spy = simpleStub(
        player1.messenger,
        "sendMessage",
        undefined,
      );

      const player2Spy = simpleStub(
        player2.messenger,
        "sendMessage",
        undefined,
      );

      board.broadcastPlayersUpdate();

      spyContext([player1Spy, player2Spy], () => {
        assertSpyCalls(player1Spy, 1);
        assertSpyCalls(player2Spy, 1);
      });
    });
  });
});
