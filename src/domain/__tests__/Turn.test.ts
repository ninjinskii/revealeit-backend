import { assertEquals, assertSpyCall, assertSpyCalls, assertThrows, beforeEach, describe, it, spy } from "../../../deps.ts";
import { FakeSendableMessage, FakeMessenger, FakeReceiveableMessage, simpleStub, multipleStub, spyContext } from "../../util/test-utils.ts";
import { NoMorePieceLooseCondition, NoMoreKillerLooseCondition } from "../LooseCondition.ts";
import { ActionZone, Direction } from "../ActionZone.ts";
import { Turn } from "../Turn.ts";
import { Board } from "../Board.ts";
import { Player } from "../../model/Player.ts";
import { Rules } from "../Rules.ts";

describe("Turn", () => {
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
    messenger: new FakeMessenger([], () => {})
   })
  
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
    messenger: new FakeMessenger([], () => {})
  })

  const players = [player1, player2]

  beforeEach(() => {
    player1.pieces = Rules.PLAYER_PIECES_GENERATOR("1")
    player2.pieces = Rules.PLAYER_PIECES_GENERATOR("2")
  })

  it("can get player who must play", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)

    const currentPlayer = turn.getCurrentPlayer()

    assertEquals(players[0], currentPlayer)
  })

  it("should send a message to every player when a turn starts", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const messenger1Spy = simpleStub(player1.messenger, "sendMessage", undefined)
    const messenger2Spy = simpleStub(player2.messenger, "sendMessage", undefined)

    turn.start()

    spyContext([messenger1Spy, messenger2Spy], () => {
      assertSpyCalls(messenger1Spy, 1)
      assertSpyCalls(messenger2Spy, 1)
    })
  })

  it("can end a turn and restart one", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const looseConditionSpy = simpleStub(turn, "checkLooseCondition", undefined)
    const startSpy = simpleStub(turn, "start", undefined)

    turn.end()

    assertSpyCalls(looseConditionSpy, 1)
    assertSpyCalls(startSpy, 1)
    assertEquals(turn["lastMovedPiece"], null)
    assertEquals(turn["moveCount"], 0)
  })

  it("can register when player make a play", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const killableSpy = simpleStub(board, "getKillableSlotsForPlayer", [])
    const movingPiece = player1.pieces[0]

    turn.registerPlay(movingPiece)

    assertSpyCall(killableSpy, 0, { args: [player1] })
    assertEquals(turn["lastMovedPiece"], movingPiece)
    assertEquals(turn["moveCount"], 1)
  })

  it("should end turn if player reach max move count & no killable slots are available", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const killableSpy = multipleStub(board, "getKillableSlotsForPlayer", [[], []])
    const endSpy = simpleStub(turn, "end", undefined)
    const movingPiece1 = player1.pieces[0]
    const movingPiece2 = player1.pieces[1]

    turn.registerPlay(movingPiece1)
    turn.registerPlay(movingPiece2)

    spyContext([killableSpy, endSpy], () => {
      assertSpyCall(killableSpy, 0, { args: [player1] })
      assertSpyCall(killableSpy, 1, { args: [player1] })
      assertSpyCalls(endSpy, 1)
      assertEquals(turn["lastMovedPiece"], movingPiece2)
      assertEquals(turn["moveCount"], 2)
    })
  })

  it("should NOT end turn if player reach max move count & killable slots are available", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const killableSpy = multipleStub(board, "getKillableSlotsForPlayer", [[], [{ x: 1, y: 1, piece: player2.pieces[0] }]])
    const endSpy = simpleStub(turn, "end", undefined)
    const movingPiece1 = player1.pieces[0]
    const movingPiece2 = player1.pieces[1]

    turn.registerPlay(movingPiece1)
    turn.registerPlay(movingPiece2)

    spyContext([killableSpy, endSpy], () => {
      assertSpyCall(killableSpy, 0, { args: [player1] })
      assertSpyCall(killableSpy, 1, { args: [player1] })
      assertSpyCalls(endSpy, 0)
      assertEquals(turn["lastMovedPiece"], movingPiece2)
      assertEquals(turn["moveCount"], 2)
    })
  })

  it("should do nothing if no player lost", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const messengerSpy = simpleStub(player1.messenger, "sendMessage", undefined)
    
    turn.checkLooseCondition()

    spyContext([messengerSpy], () => {
      assertSpyCalls(messengerSpy, 0)
    })
  })

  it("can determine if player lost and send board update & players message to everyone + 1 message to the looser", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const messenger1Spy = multipleStub(player1.messenger, "sendMessage", new Array(3))
    const messenger2Spy = multipleStub(player2.messenger, "sendMessage", new Array(2))
    player1.pieces = []

    turn.checkLooseCondition()

    spyContext([messenger1Spy, messenger2Spy], () => {
      assertSpyCalls(messenger1Spy, 3)
      assertSpyCalls(messenger2Spy, 2)
      assertEquals(player1.hasLost, true)
    })
  })

  it("can determine if player lost and send board update & players message to everyone + 1 message to the looser", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    const messenger1Spy = multipleStub(player1.messenger, "sendMessage", new Array(3))
    const messenger2Spy = multipleStub(player2.messenger, "sendMessage", new Array(2))
    player1.pieces = []

    turn.checkLooseCondition()

    spyContext([messenger1Spy, messenger2Spy], () => {
      assertSpyCalls(messenger1Spy, 3)
      assertSpyCalls(messenger2Spy, 2)
    })
  })

  it("should be truthy if no piece were already moved", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)

    const moveable = turn.isPieceMoveable(player1.pieces[0])

    assertEquals(moveable, true)
  })

  it("should be truthy if given piece were NOT moved", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    turn["lastMovedPiece"] = player1.pieces[1]

    const moveable = turn.isPieceMoveable(player1.pieces[0])

    assertEquals(moveable, true)
  })

  it("should be falsy if piece were already moved", () => {
    const board = new Board()
    board.init(players)
    const turn = new Turn(board)
    turn["lastMovedPiece"] = player1.pieces[0]

    const moveable = turn.isPieceMoveable(player1.pieces[0])

    assertEquals(moveable, false)
  })
})