import {
  LostMessageSender,
  PlayersMessageSender,
  TurnMessageSender,
} from "../network/message.ts";
import { Board } from "./board.ts";
import { NoMorePieceLooseCondition } from "./loose-condition.ts";
import { Piece } from "./piece.ts";
import { ActivePlayer } from "./player.ts";
import { Ruler } from "./ruler.ts";

export class Turn {
  private currentPlayerPosition = 0;
  private moveCount = 0;
  private turnMessageSender: TurnMessageSender;
  private playersMessageSender: PlayersMessageSender;
  private lostMessageSender: LostMessageSender;
  private lastMovedPiece: Piece | null = null;
  public waitForKill = false;

  constructor(private board: Board) {
    this.turnMessageSender = new TurnMessageSender(board);
    this.playersMessageSender = new PlayersMessageSender(board);
    this.lostMessageSender = new LostMessageSender(board);
  }

  public getCurrentPlayer(): ActivePlayer {
    return this.board.getActivePlayers()[this.currentPlayerPosition];
  }

  public start() {
    this.board.players.forEach((player) =>
      this.turnMessageSender.sendMessage(player)
    );
  }

  public end() {
    this.lastMovedPiece = null;
    this.moveCount = 0;
    // TODO: this is wring when a player has lost and player count > 2
    this.currentPlayerPosition = ++this.currentPlayerPosition %
      Ruler.ACTIVE_PLAYER_NUMBER;

    this.checkLooseCondition();
    this.start();
  }

  public registerPlay(movedPiece?: Piece | undefined) {
    const playerPiecesCount = this.getCurrentPlayer().pieces.length
    const hasReachedMaxMove = ++this.moveCount === playerPiecesCount;
    const player = this.getCurrentPlayer();
    const killAvailables =
      this.board.getKillableSlotsForPlayer(player).length > 0;
    this.waitForKill = hasReachedMaxMove && killAvailables;

    this.lastMovedPiece = movedPiece || null;

    if (hasReachedMaxMove && !this.waitForKill) {
      this.end();
    }
  }

  public checkLooseCondition() {
    const looseCondition = new NoMorePieceLooseCondition();
    const looser = this.board.getActivePlayers().find((player) =>
      looseCondition.hasLost(this.board, player)
    );

    if (!looser) {
      return;
    }

    looser.hasLost = true;
    this.lostMessageSender.sendMessage(looser);

    this.board.onPlayerLost(looser);
    this.board.players.forEach((player) => {
      this.board.broadcastBoardUpdate();
      this.playersMessageSender.sendMessage(player);
    });
  }

  public isPieceMoveable(piece: Piece) {
    // console.log(piece)
    // console.log(this.lastMovedPiece)
    if (Ruler.CAN_MOVE_PIECE_MULTIPLE_TIMES || this.lastMovedPiece === null) {
      return true;
    }

    const last = this.lastMovedPiece;
    return piece.originSpawnDelta !== last.originSpawnDelta &&
      piece.name !== last.name;
  }
}
