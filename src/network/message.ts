import { WebSocketClient } from "../../deps.ts";
import { Board } from "../domain/board.ts";
import { Game } from "../domain/game.ts";
import { PieceDTO } from "../domain/piece.ts";
import { ActivePlayer, Player, SpectatorPlayer } from "../domain/player.ts";
import { Ruler } from "../domain/ruler.ts";

export enum Action {
  MOVE = "move",
  KILL = "kill",
  BOARD = "board",
  PLAYERS = "players",
  ERROR = "error",
  HANDSHAKE = "handshake",
  TURN = "turn",
  LOG = "log",
}

export class MessageReceiver {
  constructor(public game: Game, public factory: MessageHandlerFactory) {}

  handleMessage() {
    const handler = this.factory.getMessageHandler();
    handler.handleMessage(this.game);
  }
}

export class MessageHandlerFactory {
  key: string;

  constructor(public message: string, public webSocket: WebSocketClient) {
    this.key = message.split(":")[0];
  }

  getMessageHandler(): MessageHandler {
    switch (this.key) {
      case Action.MOVE:
        return new MoveMessageHandler(this.message, this.webSocket);
      case Action.KILL:
        return new KillMessageHandler(this.message, this.webSocket);
      case Action.HANDSHAKE:
        return new HandshakeMessageHandler(this.message, this.webSocket);
    }

    throw new Error("Cannot get a message handler: unknown message key");
  }
}

interface MessageHandler {
  handleMessage(game: Game): void;
}

export interface MessageSender {
  sendMessage(player: Player | WebSocketClient, board: Board): void;
}

class MoveMessageHandler implements MessageHandler {
  constructor(public message: string, public webSocket: WebSocketClient) {}

  handleMessage(game: Game) {
    if (game.board === null) {
      console.error("Try to handle message 'move' but board is null");
      return;
    }

    const content = this.message.split(":")[1];
    const [fromX, fromY, toY, toX] = content.split(",").map((value) =>
      parseInt(value)
    );
    const slot = game.board.slots[fromY][fromX];

    try {
      game.board.movePieceTo(slot.piece, toY, toX);
    } catch (error) {
      new ErrorMessageSender(error).sendMessage(this.webSocket);
    }
  }
}

class KillMessageHandler implements MessageHandler {
  constructor(public message: string, public webSocket: WebSocketClient) {}

  handleMessage(game: Game) {
    if (game.board === null) {
      console.error("Try to handle message 'kill' but board is null");
      return;
    }

    const content = this.message.split(":")[1];
    const [fromX, fromY, toX, toY] = content.split(",").map((value) =>
      parseInt(value)
    );
    const slot = game.board.slots[fromY][fromX];

    try {
      game.board.killPieceAt(slot.piece, toY, toX);
    } catch (error) {
      new ErrorMessageSender(error).sendMessage(this.webSocket);
    }
  }
}

class HandshakeMessageHandler implements MessageHandler {
  constructor(public message: string, public webSocket: WebSocketClient) {}

  handleMessage(game: Game) {
    const [playerId, playerName] = this.message.split(":")[1].split(",");
    const player = game.players.find((player) => player.id === playerId);
    
    if (!player) {
      console.log("new player detected");
      const playerCount = game.players.length;
      
      if (playerCount >= Ruler.ACTIVE_PLAYER_NUMBER) {
        this.addSpectatorPlayer(game, playerId, playerName);
      } else {
        this.addActivePlayer(game, playerId, playerName);
      }
      
      this.maybeStartGame(game);
    } else {
      console.log("player already exists ! Updtating its socket");
      player.webSocket = this.webSocket;
      
      if (game.board) {
        const updatePlayers = new PlayersMessageSender(game.board);
        const updateBoard = new BoardUpdateMessageSender(game.board);
        updateBoard.sendMessage(player);
        updatePlayers.sendMessage(player);
      }
    }
  }

  private addActivePlayer(game: Game, playerId: string, playerName: string) {
    const playerCount = game.players.length;

    game.players.push(
      new ActivePlayer({
        id: playerId,
        name: playerName,
        origin: game.origins[playerCount],
        pieces: game.pieces(playerId),
        webSocket: this.webSocket,
      }),
    );
  }

  private addSpectatorPlayer(game: Game, playerId: string, playerName: string) {
    game.players.push(
      new SpectatorPlayer(
        playerId,
        playerName,
        this.webSocket,
      ),
    );
  }

  private maybeStartGame(game: Game) {
    if (game.players.length >= Ruler.ACTIVE_PLAYER_NUMBER) {
      game.start();
    }
  }
}

export class BoardUpdateMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const revealedZone = player instanceof ActivePlayer
      ? this.board.getRevealedZoneForPlayer(player)
      : this.board.flattenedSlots;

    const compressedRevealedZone = revealedZone.map((slot) => ({
      x: slot.x,
      y: slot.y,
      piece: PieceDTO.fromPiece(slot.piece),
    }));

    const message = `${Action.BOARD}:${
      JSON.stringify(compressedRevealedZone).replaceAll(":", "@")
    }`;
    player.webSocket.send(message);
  }
}

export class PlayersMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const notLoosers = this.board.getActivePlayers().filter((player) =>
      player.hasLost === false
    ).map((player) => `${player.id},${player.name}`);

    const message = `${Action.PLAYERS}:${notLoosers.join("|")}`;
    player.webSocket.send(message);
  }
}

export class TurnMessageSender implements MessageSender {
  constructor(public board: Board) {}

  sendMessage(player: Player) {
    const message = `${Action.TURN}:${player.id}`;
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
