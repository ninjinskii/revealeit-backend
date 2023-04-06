import { Board } from "./Board.ts";
import { Piece } from "../model/Piece.ts";
import { Player } from "../model/Player.ts";
import { Rules } from "../domain/Rules.ts";
import {
  LooseConditionDescriptor,
  LooseConditionFactory,
} from "./LooseCondition.ts";
import {
  LostMessage,
  PlayersMessage,
  TurnMessage,
} from "../network/Message.ts";

export class Turn {
  private currentPlayerPosition = 0;
  private moveCount = 0;
  private lastMovedPiece: Piece | null = null; // TODO: rename to movedPieces en tableau pour gérer le scénario plus de deux pièces / joueur
  public waitForKill = false;

  constructor(private board: Board) {}

  public getCurrentPlayer(): Player {
    return this.board.players[this.currentPlayerPosition];
  }

  public start() {
    this.board.players.forEach((player) => {
      const message = new TurnMessage(this.board);
      player.messenger.sendMessage(message);
    });
  }

  public triggerNext() {
    this.lastMovedPiece = null;
    this.moveCount = 0;
    // TODO: this is wrong when a player has lost and player count > 2
    this.currentPlayerPosition = ++this.currentPlayerPosition %
      Rules.PLAYER_NUMBER;

    this.checkLooseCondition();
    this.start();
  }

  public registerPlay(movedPiece?: Piece) {
    const player = this.getCurrentPlayer();
    const playerPiecesCount = player.pieces.length;
    const hasReachedMaxMove = ++this.moveCount === playerPiecesCount;
    const killAvailables =
      this.board.getKillableSlotsForPlayer(player).length > 0;
    this.waitForKill = hasReachedMaxMove && killAvailables;

    this.lastMovedPiece = movedPiece || null;

    if (hasReachedMaxMove && !this.waitForKill) {
      this.triggerNext();
    }
  }

  public checkLooseCondition() {
    const looseConditionDescriptor = Rules
      .LOOSE_CONDITION as LooseConditionDescriptor;

    const looseCondition = LooseConditionFactory.getLooseCondition(
      looseConditionDescriptor,
    );

    const looser = this.board.players.find((player) =>
      looseCondition.hasLost(this.board, player)
    );

    if (!looser) {
      return;
    }

    looser.hasLost = true;

    const lostMessage = new LostMessage();
    looser.messenger.sendMessage(lostMessage);

    this.board.onPlayerLost(looser);
    this.board.broadcastBoardUpdate(); // Vraiment obligé de broadcast dans le for each ?
    this.board.players.forEach((player) => {
      const playersMessage = new PlayersMessage(this.board);
      player.messenger.sendMessage(playersMessage);
    });
  }

  public isPieceMoveable(piece: Piece) {
    if (Rules.CAN_MOVE_PIECE_MULTIPLE_TIMES || this.lastMovedPiece === null) {
      return true;
    }

    const last = this.lastMovedPiece;
    return piece.originSpawnDelta !== last.originSpawnDelta &&
      piece.name !== last.name;
  }
}
