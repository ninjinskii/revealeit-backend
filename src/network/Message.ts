import { Board } from "../domain/Board.ts";
import { PieceDTO } from "../model/Piece.ts";
import { Player } from "../model/Player.ts";
import { Rules } from "../domain/Rules.ts";
import { Messenger } from "./Messenger";

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
      return `${super.key}:${super.content}`;
  }
}

export abstract class ReceiveableMessage extends Message {
  abstract execute(board: Board);
}

export class HandshakeMessage extends ReceiveableMessage {
  constructor(
      key: string,
      protected content: string,
      private messenger: Messenger,
      private waitingPlayers: Player[],
      private onGameStarted: () => void,
  ) {
      super(key, content)
  }

  execute(board: Board) {
      const [playerId, playerName] = this.content.split(",");
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
              messenger: this.messenger,
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
          inGamePlayer.messenger = this.messenger;

          if (board) {
              const updatePlayers = new PlayersMessage(board);
              const updateBoard = new BoardUpdateMessage(board, inGamePlayer);
              const updateTurn = new TurnMessage(board);

              this.messenger.sendMessage(updatePlayers)
              this.messenger.sendMessage(updateBoard)
              this.messenger.sendMessage(updateTurn)
          }
      }
  }
}

export class MoveMessage extends ReceiveableMessage {
  constructor(key: string, protected content: string, private messenger: Messenger) {
      super(key, content)
  }

  execute(board: Board) {
    try {
      if (!board) {
        throw new Error(`Cannot move: game hasn't started yet`);
      }

      const [fromX, fromY, toY, toX] = this.content.split(",").map((value) =>
        parseInt(value)
      );
      const slot = board.getSlot(fromX, fromY);

      board.movePieceTo(slot.piece, toY, toX);
    } catch (error) {
      // use messenger to send error
    }
  }
}

export class KillMessage extends ReceiveableMessage {
  constructor(key: string, protected content: string, private messenger: Messenger) {
      super(key, content)
  }

  execute(board: Board) {
    try {
      if (!board) {
        throw new Error(`Cannot kill: game hasn't started yet`);
      }

      const [playerId, toX, toY] = this.content.split(",");
      const player = board.players.find((player) => player.id === playerId);

      if (!player) {
        throw new Error("Cannot kill piece: killer player not found");
      }

      board.killPieceAt(player, parseInt(toX), parseInt(toY));
    } catch (error) {
      // use messenger to send error
    }
  }
}

export class BoardUpdateMessage extends SendableMessage {
  constructor(private board: Board, private player: Player) {
      super(MessageType.BOARD, "")
  }

  prepare(): SendableMessage {
      const revealedZone = this.board.getRevealedZoneForPlayer(this.player)

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
  
      super.content = `${MessageType.BOARD}:${
          JSON.stringify(result).replaceAll(":", "@")
      }`;

      return this
  }
}

export class PlayersMessage extends SendableMessage {
  constructor(private board: Board) {
      super(MessageType.PLAYERS, "")
  }

  prepare(): SendableMessage {
    const notLoosers = this.board.players.filter((player) =>
      player.hasLost === false
    ).map((player) => `${player.id},${player.name}`);

    super.content = `${MessageType.PLAYERS}:${notLoosers.join("|")}`;
    
    return this
  }
}

export class TurnMessage extends SendableMessage {
  constructor(public board: Board) {
      super(MessageType.TURN, "")
  }

  prepare(): SendableMessage {
    const currentPlayer = this.board.turn.getCurrentPlayer();
    super.content = `${MessageType.TURN}:${currentPlayer.id}`;

    return this
  }
}

export class LostMessage extends SendableMessage {
  constructor() {
      super(MessageType.LOST, "")
  }

  prepare(): SendableMessage {
    super.content = `${MessageType.LOST}`;
      
    return this
  }
}

export class ErrorMessage extends SendableMessage {
  constructor(public error: Error) {
      super(MessageType.ERROR, "")
  }

  prepare(): SendableMessage {
    super.content = `${MessageType.ERROR}:${this.error.message}`;

    return this
  }
}