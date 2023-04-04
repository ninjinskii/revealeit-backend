import { assertEquals, assertSpyCall, assertSpyCalls, assertThrows, beforeEach, describe, it, spy } from "../../../deps.ts";
import { TurnMessage, BoardUpdateMessage, PlayersMessage, LostMessage, ErrorMessage, MoveMessage, KillMessage, HandshakeMessage, MessageType } from "../Message.ts";
import { Board } from "../../domain/Board.ts";
import { Player } from "../../model/Player.ts";
import { Explorer } from "../../model/Piece.ts";
import { FakeMessenger, simpleStub, multipleStub, spyContext } from "../../util/test-utils.ts";
import { Rules } from "../../domain/Rules.ts";
import { BoardError } from "../../util/BoardError.ts";

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

describe("SendableMessage", () => {
  const playerLooser = new Player({ 
    id: "player3",
    name: "player",
    origin: {
      x: Rules.BOARD_SIZE - 1,
      y: 0,
      xModifier: -1,
      yModifier: 1,
    },
    pieces: Rules.PLAYER_PIECES_GENERATOR("3"),
    messenger: new FakeMessenger([], () => {})
  })

  playerLooser.hasLost = true

  describe("build", () => {    
    it("should return a colon separated key value pair", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new TurnMessage(board)
      const actual = message.prepare().build()
      
      assertEquals(actual, `${message.key}:${player1.id}`)
    })
  })

  describe("prepare", () => {
    it("should return itself", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new TurnMessage(board)
      const actual = message.prepare()

      assertEquals(actual, message)
    })
  })

  describe("BoardUpdateMessage", () => {
    it("should have a Board key", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new BoardUpdateMessage(board, player1)

      assertEquals(message.key, MessageType.BOARD)
    })

    it("should compute revealed and killable slots", () => {
      const revealedZone = [{ x: 0, y: 0, piece: null }]
      const killableZone = [{ x: 1, y: 1, piece: null }]
      const board = new Board()
      board.init([player1, player2])
      const revealSpy = simpleStub(board, "getRevealedZoneForPlayer", revealedZone)
      const killableSpy = simpleStub(board, "getKillableSlotsForPlayer", killableZone)
      const message = new BoardUpdateMessage(board, player1)

      message.prepare()

      const actual = message.build().replaceAll("@", ":")
      const expected = JSON.stringify(
        { revealed: revealedZone, killable: killableZone }
      )

      assertSpyCall(revealSpy, 0, { args: [player1] })
      assertSpyCall(killableSpy, 0, { args: [player1] })
      assertEquals(actual, `${MessageType.BOARD}:${expected}`)
    })
  })

  describe("PlayersMessage", () => {
    it("should have a Players key", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new PlayersMessage(board)

      assertEquals(message.key, MessageType.PLAYERS)
    })

    it("should have a list of non-looser player ids and names", () => {
      const board = new Board()
      board.init([player1, playerLooser, player2])
      const message = new PlayersMessage(board)

      message.prepare()

      const expected = board.players
        .filter(player => player.hasLost === false)
        .map(player => `${player.id},${player.name}`)
        .join("|")

      assertEquals(message.build(), `${MessageType.PLAYERS}:${expected}`)
    })
  })

  describe("TurnMessage", () => {
    it("should have a Turn key", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new TurnMessage(board)

      assertEquals(message.key, MessageType.TURN)
    })

    it("should have a player id representing the playing player", () => {
      const board = new Board()
      board.init([player1, player2])
      const currentPlayer = board.turn.getCurrentPlayer()
      const message = new TurnMessage(board)

      message.prepare()

      assertEquals(message.build(), `${MessageType.TURN}:${currentPlayer.id}`)
    })
  })

  describe("LostMessage", () => {
    it("should have a Lost key", () => {
      const message = new LostMessage()

      assertEquals(message.key, MessageType.LOST)
    })

    it("should have nothing", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new LostMessage()

      message.prepare()

      assertEquals(message.build(), `${MessageType.LOST}:`)
    })
  })

  describe("ErrorMessage", () => {
    it("should have an Error key", () => {
      const error = new BoardError ({
        rawMessage: "error message",
        httpCode: 500,
        clientTranslationKey: "error__base",
      })

      const message = new ErrorMessage(error)

      assertEquals(message.key, MessageType.ERROR)
    })

    it("should have a client translation key", () => {
      const error = new BoardError ({
        rawMessage: "error message",
        httpCode: 500,
        clientTranslationKey: "error__base",
      })

      const message = new ErrorMessage(error)

      message.prepare()

      assertEquals(message.build(), `${MessageType.ERROR}:${error.clientTranslationKey}`)
    })
  })
})

describe("ReceivableMessage", () => {
  describe("HandshakeMessage", () => {
    it("should do nothing if a new player join a game that is already started", () => {
      const board = new Board()
      board.init([player1, player2])
      const waitingPlayers: Player[] = []
      const onGameStarted = spy()
      const messenger = new FakeMessenger(waitingPlayers, onGameStarted)
      const message = new HandshakeMessage("new player", messenger, waitingPlayers, onGameStarted)

      message.execute(board)

      assertSpyCalls(onGameStarted, 0)
      assertEquals(waitingPlayers.length, 0)
    })

    it("should add a player to the waiting player list if a new player joins and no game is started", () => {
      const waitingPlayers: Player[] = []
      const onGameStarted = spy()
      const messenger = new FakeMessenger(waitingPlayers, onGameStarted)
      const message = new HandshakeMessage("new player", messenger, waitingPlayers, onGameStarted)

      message.execute(undefined)

      assertSpyCalls(onGameStarted, 0)
      assertEquals(waitingPlayers.length, 1)
    })

    it("should start a game if a new player joins and PLAYER_COUNT is reached", () => {
      const waitingPlayers: Player[] = [player1]
      const onGameStarted = spy()
      const messenger = new FakeMessenger(waitingPlayers, onGameStarted)
      const message = new HandshakeMessage("new player", messenger, waitingPlayers, onGameStarted)

      message.execute(undefined)

      assertSpyCalls(onGameStarted, 1)
      assertEquals(waitingPlayers.length, 2)
    })

    it("should update player's messenger if an existing player rejoin the game", () => {
      const board = new Board()
      board.init([player1, player2])
      const waitingPlayers: Player[] = []
      const onGameStarted = spy()
      const messenger = new FakeMessenger(waitingPlayers, onGameStarted)
      const message = new HandshakeMessage(player2.id, messenger, waitingPlayers, onGameStarted)

      message.execute(board)

      assertSpyCalls(onGameStarted, 0)
      assertEquals(waitingPlayers.length, 0)
      assertEquals(board.players[1].messenger, messenger)
    })

    it("should update player's messenger if multiple existing player rejoin the game", () => {
      const board = new Board()
      board.init([player1, player2])
      const waitingPlayers: Player[] = []
      const onGameStarted = spy()
      const messenger1 = new FakeMessenger(waitingPlayers, onGameStarted)
      const messenger2 = new FakeMessenger(waitingPlayers, onGameStarted)
      const message1 = new HandshakeMessage("player1", messenger1, waitingPlayers, onGameStarted)
      const message2 = new HandshakeMessage("player2", messenger2, waitingPlayers, onGameStarted)

      message1.execute(board)
      message2.execute(board)

      assertSpyCalls(onGameStarted, 0)
      assertEquals(waitingPlayers.length, 0)
      assertEquals(board.players[0].messenger, messenger1)
      assertEquals(board.players[1].messenger, messenger2)
    })

    it("should send various message if an existing player rejoin the game", () => {
      const board = new Board()
      board.init([player1, player2])
      const waitingPlayers: Player[] = []
      const onGameStarted = spy()
      const messenger = new FakeMessenger(waitingPlayers, onGameStarted)
      const messengerSpy = multipleStub(messenger, "sendMessage", [undefined, undefined, undefined])
      const message = new HandshakeMessage(player2.id, messenger, waitingPlayers, onGameStarted)

      message.execute(board)

      spyContext([messengerSpy], () => {
        assertSpyCalls(onGameStarted, 0)
        assertEquals(waitingPlayers.length, 0)
        assertSpyCalls(messengerSpy, 3)
      })
    })
  })

  describe("MoveMessage", () => {
    it("should throw a BoardError if game is NOT started", () => {
      const message = new MoveMessage("")

      try {
        message.execute(undefined)
      } catch (error) {
        assertEquals(error instanceof BoardError, true)
        assertEquals(error.message, "Cannot move: game hasn't started yet")
        assertEquals(error.httpCode, 400)
        return
      }

      throw new Error("Should not run this line")
    })

    it("should be able to move a piece", () => {
      const piece = new Explorer(player1.id)
      const board = new Board()
      board.init([player1, player2])
      const moveSpy = simpleStub(board, "movePieceTo", undefined)
      const getSlotSpy = simpleStub(board, "getSlot", { x: 1, y: 1, piece })
      const parseIntSpy = multipleStub(globalThis, "parseInt", [1,1,1,2])
      const message = new MoveMessage("1,1,1,2")

      message.execute(board)

      spyContext([parseIntSpy], () => {
        assertSpyCall(getSlotSpy, 0, { args: [1, 1] })
        assertSpyCalls(parseIntSpy, 4)
        assertSpyCall(moveSpy, 0, { args: [piece, 1, 2] })
      })
    })
  })

  describe("KillMessage", () => {
    it("should throw a BoardError if game is NOT started", () => {
      const message = new KillMessage("")

      try {
        message.execute(undefined)
      } catch (error) {
        assertEquals(error instanceof BoardError, true)
        assertEquals(error.message, "Cannot kill: game hasn't started yet")
        assertEquals(error.httpCode, 400)
        return
      }

      throw new Error("Should not run this line")
    })

    it("should throw a BoardError if player cannot be retrieved", () => {
      const board = new Board()
      board.init([player1, player2])
      const message = new KillMessage("unknownId,0,0")

      try {
        message.execute(board)
      } catch (error) {
        assertEquals(error instanceof BoardError, true)
        assertEquals(error.message, "Cannot kill: killer player not found")
        assertEquals(error.httpCode, 400)
        return
      }

      throw new Error("Should not run this line")
    })

    it("should be able to kill a piece", () => {
      const board = new Board()
      board.init([player1, player2])
      const killSpy = simpleStub(board, "killPieceAt", undefined)
      const message = new KillMessage("player1,1,1")

      message.execute(board)

      assertSpyCall(killSpy, 0, { args: [player1, 1, 1] })
    })
  })
})
