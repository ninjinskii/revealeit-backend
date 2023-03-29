import { WebSocketClient } from "../../deps.ts";
import { Board } from "../domain/Board.ts";
import { PieceDTO } from "../model/Piece.ts";
import { Player } from "../model/Player.ts";
import { Rules } from "../domain/rules.ts";

export enum Action {
  MOVE = "move",
  KILL = "kill",
  BOARD = "board",
  PLAYERS = "players",
  ERROR = "error",
  HANDSHAKE = "handshake",
  TURN = "turn",
  LOST = "lost",
  LOG = "log",
}

export class MessageReceiver {
  constructor(private factory: MessageHandlerFactory) {}

  handleMessage(board?: Board) {
    const handler = this.factory.getMessageHandler();
    handler.handleMessage(board);
  }
}

export class MessageHandlerFactory {m
  private key: string;

  constructor(
    private message: string,
    private webSocket: WebSocketClient,
    private players: Player[],
    private onGameStarted: () => void,
  ) {
    this.key = message.split(":")[0];
  }

  getMessageHandler(): MessageHandler {
    switch (this.key) {
      case Action.MOVE:
        return new MoveMessageHandler(this.message, this.webSocket);
      case Action.KILL:
        return new KillMessageHandler(this.message, this.webSocket);
      case Action.HANDSHAKE:
        return new HandshakeMessageHandler(
          this.message,
          this.webSocket,
          this.players,
          this.onGameStarted,
        );
    }

    throw new Error(
      `Cannot get a message handler: unknown message key: ${this.key}`,
    );
  }
}

interface MessageHandler {
  handleMessage(board?: Board): void;
}

export interface MessageSender {
  sendMessage(player: Player | WebSocketClient, board: Board): void;
}

class MoveMessageHandler implements MessageHandler {
  constructor(public message: string, public webSocket: WebSocketClient) {}

  handleMessage(board?: Board) {
    try {
      if (!board) {
        throw new Error(`Cannot move: game hasn't started yet`);
      }

      const content = this.message.split(":")[1];
      const [fromX, fromY, toY, toX] = content.split(",").map((value) =>
        parseInt(value)
      );
      const slot = board.getSlot(fromX, fromY);

      board.movePieceTo(slot.piece, toY, toX);
    } catch (error) {
      new ErrorMessageSender(error).sendMessage(this.webSocket);
    }
  }
}

class KillMessageHandler implements MessageHandler {
  constructor(public message: string, public webSocket: WebSocketClient) {}

  handleMessage(board: Board) {
    try {
      if (!board) {
        throw new Error(`Cannot kill: game hasn't started yet`);
      }

      const content = this.message.split(":")[1];
      const [playerId, toX, toY] = content.split(",");
      const player = board.players.find((player) => player.id === playerId);

      if (!player) {
        throw new Error("Cannot kill piece: killer player not found");
      }

      board.killPieceAt(player, parseInt(toX), parseInt(toY));
    } catch (error) {
      new ErrorMessageSender(error).sendMessage(this.webSocket);
    }
  }
}

class HandshakeMessageHandler implements MessageHandler {
  constructor(
    private message: string,
    private webSocket: WebSocketClient,
    private waitingPlayers: Player[],
    private onGameStarted: () => void,
  ) {}

  handleMessage(board?: Board) {
    const [playerId, playerName] = this.message.split(":")[1].split(",");
    const inGamePlayer = board
      ? board.players.find((player) => player.id === playerId)
      : this.waitingPlayers.find((player) => player.id === playerId);
    const isNewPlayer = !inGamePlayer;

    if (isNewPlayer) {
      if (board) {
        return;
      }

      const waitingPlayerCount = this.waitingPlayers.length;

      const player = new Player({
        id: playerId,
        name: playerName,
        origin: Rules.PLAYER_ORIGINS[waitingPlayerCount],
        pieces: Rules.PLAYER_PIECES_GENERATOR(playerId),
        webSocket: this.webSocket,
      });

      this.waitingPlayers.push(player);

      const shouldStartGame =
        waitingPlayerCount + 1 === Rules.ACTIVE_PLAYER_NUMBER;

      if (shouldStartGame) {
        try {
          this.onGameStarted();
        } catch (error) {
        }
      }
    } else {
      inGamePlayer.webSocket = this.webSocket;

      if (board) {
        const updatePlayers = new PlayersMessageSender(board);
        const updateBoard = new BoardUpdateMessageSender(board);
        const updateTurn = new TurnMessageSender(board);
        updateBoard.sendMessage(inGamePlayer);
        updatePlayers.sendMessage(inGamePlayer);
        updateTurn.sendMessage(inGamePlayer);
      }
    }
  }
}

export class BoardUpdateMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const revealedZone = this.board.getRevealedZoneForPlayer(player)

    const compressedRevealedZone = revealedZone.map((slot) => ({
      x: slot.x,
      y: slot.y,
      piece: PieceDTO.fromPiece(slot.piece),
    }));

    const result = { revealed: compressedRevealedZone, killable: [] };
    const playerKills = this.board.getKillableSlotsForPlayer(player).map(
      (slot) => ({
        x: slot.x,
        y: slot.y,
        piece: PieceDTO.fromPiece(slot.piece),
      }),
    );
    result.killable = playerKills as never[];

    const message = `${Action.BOARD}:${
      JSON.stringify(result).replaceAll(":", "@")
    }`;

    player.webSocket.send(message);
  }
}

export class PlayersMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const notLoosers = this.board.players.filter((player) =>
      player.hasLost === false
    ).map((player) => `${player.id},${player.name}`);

    const message = `${Action.PLAYERS}:${notLoosers.join("|")}`;
    player.webSocket.send(message);
  }
}

export class TurnMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const currentPlayer = this.board.turn.getCurrentPlayer();
    const message = `${Action.TURN}:${currentPlayer.id}`;
    player.webSocket.send(message);
  }
}

export class LostMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const message = `${Action.LOST}`;
    player.webSocket.send(message);
  }
}

class ErrorMessageSender implements MessageSender {
  constructor(public error: Error) {}

  sendMessage(webSocket: WebSocketClient) {
    const message = `${Action.ERROR}:${this.error.message}`;
    webSocket.send(message);
  }
}

class LogMessageSender implements MessageSender {
  constructor(public log: string) {}

  sendMessage(webSocket: WebSocketClient) {
    const message = `${Action.LOG}:${this.log}`;
    webSocket.send(message);
  }
}
