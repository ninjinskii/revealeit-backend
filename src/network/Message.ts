import { Board } from "../domain/Board.ts";
import { PieceDTO } from "../model/Piece.ts";
import { Player } from "../model/Player.ts";
import { Rules } from "../domain/Rules.ts";
import { Messenger } from "./Messenger.ts";
import { BoardError } from "../util/BoardError.ts";

export enum MessageType {
  MOVE = "move",
  KILL = "kill",
  BOARD = "board",
  PLAYERS = "players",
  ERROR = "error",
  HANDSHAKE = "handshake",
  TURN = "turn",
  LOST = "lost",
}

abstract class Message {
  constructor(public readonly key: string, protected content: string) {}
}

export abstract class SendableMessage extends Message {
  abstract prepare(): SendableMessage;

  build(): string {
    return `${this.key}:${this.content}`;
  }
}

export abstract class ReceiveableMessage extends Message {
  abstract execute(board?: Board): void;
}

export class HandshakeMessage extends ReceiveableMessage {
  constructor(
    key: string,
    protected content: string,
    private messenger: Messenger,
    private waitingPlayers: Player[],
    private onGameStarted: () => void,
  ) {
    super(key, content);
  }

  execute(board?: Board) {
    const [playerId, playerName] = this.content.split(",");
    const inGamePlayer = board?.players.find((player) =>
      player.id === playerId
    );
    const waitingPlayer = this.waitingPlayers.find((player) =>
      player.id === playerId
    );
    const isNewPlayer = !inGamePlayer && !waitingPlayer;

    if (isNewPlayer) {
      if (board?.players.length === Rules.PLAYER_NUMBER) {
        return;
      }

      const waitingPlayerCount = this.waitingPlayers.length;

      const player = new Player({
        id: playerId,
        name: playerName,
        origin: Rules.PLAYER_ORIGINS[waitingPlayerCount],
        pieces: Rules.PLAYER_PIECES_GENERATOR(playerId),
        messenger: this.messenger,
      });

      this.waitingPlayers.push(player);

      const shouldStartGame = waitingPlayerCount + 1 === Rules.PLAYER_NUMBER;

      if (shouldStartGame) {
        this.onGameStarted();
      }
    } else if (inGamePlayer) {
      inGamePlayer.messenger = this.messenger;

      if (board) {
        const updatePlayers = new PlayersMessage(board);
        const updateBoard = new BoardUpdateMessage(board, inGamePlayer);
        const updateTurn = new TurnMessage(board);

        this.messenger.sendMessage(updatePlayers);
        this.messenger.sendMessage(updateBoard);
        this.messenger.sendMessage(updateTurn);
      }
    }
  }
}

export class MoveMessage extends ReceiveableMessage {
  constructor(key: string, protected content: string) {
    super(key, content);
  }

  execute(board?: Board) {
    if (!board) {
      throw new BoardError({
        rawMessage: "Cannot move: game hasn't started yet",
        httpCode: 400,
        clientTranslationKey: "error__base"
      });
    }

    const [fromX, fromY, toY, toX] = this.content.split(",").map((value) =>
      parseInt(value)
    );
    const slot = board.getSlot(fromX, fromY);

    board.movePieceTo(slot.piece, toY, toX);
  }
}

export class KillMessage extends ReceiveableMessage {
  constructor(key: string, protected content: string) {
    super(key, content);
  }

  execute(board?: Board) {
    if (!board) {
      throw new BoardError({
        rawMessage: "Cannot move: game hasn't started yet",
        httpCode: 400,
        clientTranslationKey: "error__base"
      });
    }

    const [playerId, toX, toY] = this.content.split(",");
    const player = board.players.find((player) => player.id === playerId);

    if (!player) {
      throw new BoardError({
        rawMessage: "Cannot kill piece: killer player not found",
        httpCode: 400,
        clientTranslationKey: "error__base"
      });
    }

    board.killPieceAt(player, parseInt(toX), parseInt(toY));
  }
}

export class BoardUpdateMessage extends SendableMessage {
  constructor(private board: Board, private player: Player) {
    super(MessageType.BOARD, "");
  }

  prepare(): SendableMessage {
    const revealedZone = this.board.getRevealedZoneForPlayer(this.player);

    const compressedRevealedZone = revealedZone.map((slot) => ({
      x: slot.x,
      y: slot.y,
      piece: PieceDTO.fromPiece(slot.piece),
    }));

    const result = { revealed: compressedRevealedZone, killable: [] };
    const playerKills = this.board.getKillableSlotsForPlayer(this.player).map(
      (slot) => ({
        x: slot.x,
        y: slot.y,
        piece: PieceDTO.fromPiece(slot.piece),
      }),
    );
    result.killable = playerKills as never[];

    this.content = JSON.stringify(result).replaceAll(":", "@");

    return this;
  }
}

export class PlayersMessage extends SendableMessage {
  constructor(private board: Board) {
    super(MessageType.PLAYERS, "");
  }

  prepare(): SendableMessage {
    const notLoosers = this.board.players.filter((player) =>
      player.hasLost === false
    ).map((player) => `${player.id},${player.name}`);

    this.content = notLoosers.join("|");

    return this;
  }
}

export class TurnMessage extends SendableMessage {
  constructor(public board: Board) {
    super(MessageType.TURN, "");
  }

  prepare(): SendableMessage {
    const currentPlayer = this.board.turn.getCurrentPlayer();
    this.content = currentPlayer.id;

    return this;
  }
}

export class LostMessage extends SendableMessage {
  constructor() {
    super(MessageType.LOST, "");
  }

  prepare(): SendableMessage {
    return this;
  }
}

export class ErrorMessage extends SendableMessage {
  constructor(public error: BoardError) {
    super(MessageType.ERROR, "");
  }

  prepare(): SendableMessage {
    this.content = this.error.clientTranslationKey;

    return this;
  }
}
