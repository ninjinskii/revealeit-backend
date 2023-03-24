import { PlayersMessageSender, TurnMessageSender } from "../network/message.ts";
import { Board } from "./board.ts";
import { NoMorePieceLooseCondition } from "./loose-condition.ts";
import { ActivePlayer } from "./player.ts";
import { Ruler } from "./ruler.ts";

export class Turn {
  private currentPlayerPosition = 0;
  private moveCount = 0;
  private turnMessageSender: TurnMessageSender;
  private playersMessageSender: PlayersMessageSender;

  constructor(public board: Board) {
    this.turnMessageSender = new TurnMessageSender(board);
    this.playersMessageSender = new PlayersMessageSender(board);
  }

  public getCurrentPlayer(): ActivePlayer {
    return this.board.getActivePlayers()[this.currentPlayerPosition];
  }

  public start() {
    this.board.players.forEach((player) =>
      this.turnMessageSender.sendMessage(player)
    );
  }

  private end() {
    this.currentPlayerPosition = ++this.currentPlayerPosition %
      Ruler.ACTIVE_PLAYER_NUMBER;
    this.moveCount = 0;
    this.checkLooseCondition();
    this.start();
  }

  public registerMove() {
    if (++this.moveCount === Ruler.MOVE_PER_TURN - 1) {
      this.end();
    }
  }

  private checkLooseCondition(): boolean {
    const looseCondition = new NoMorePieceLooseCondition();
    const looser = this.board.getActivePlayers().find((player) =>
      looseCondition.hasLost(this.board, player)
    );

    if (!looser) {
      return false;
    }

    looser.hasLost = true;
    this.board.onPlayerLost(looser)
    this.board.players.forEach((player) =>
      this.playersMessageSender.sendMessage(player)
    );

    return true;
  }
}
