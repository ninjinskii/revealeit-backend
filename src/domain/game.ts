import { WebSocketClient, WebSocketServer } from "../../deps.ts";
import {
  MessageHandlerFactory,
  MessageReceiver,
  MessageSender,
} from "../network/message.ts";
import { Board } from "./board.ts";
import { Explorer, Shooter } from "./piece.ts";
import { Player, PlayerOrigin } from "./player.ts";
import { Ruler } from "./ruler.ts";

// Bridges the gap between network and board
export class Game {
  public board: Board | null = null;
  public names = ["Jean", "Paul", "Gauthier", "Roger"];
  public origins: PlayerOrigin[] = [
    { x: 0, y: 0, xModifier: 1, yModifier: 1 },
    {
      x: Ruler.BOARD_SIZE - 1,
      y: Ruler.BOARD_SIZE - 1,
      xModifier: -1,
      yModifier: -1,
    },
    { x: 0, y: Ruler.BOARD_SIZE - 1, xModifier: 1, yModifier: -1 },
    { x: Ruler.BOARD_SIZE - 1, y: 0, xModifier: -1, yModifier: 1 },
  ];

  public pieces = (id: string) => [
    new Explorer(id),
    new Shooter(id),
  ];
  constructor(
    public players: Player[],
    public serverWebSocket: WebSocketServer,
  ) {
    this.initServerWebSocket();
  }

  initServerWebSocket() {
    this.serverWebSocket.on(
      "connection",
      (webSocket: WebSocketClient) => {
        webSocket.on("message", (message: string) => {
          console.log(message.split(":")[0]);

          const messageFactory = new MessageHandlerFactory(message, webSocket);
          const messageReceiver = new MessageReceiver(this, messageFactory);
          messageReceiver.handleMessage();
        });
      },
    );
  }

  start() {
    this.board = new Board(this.players, this);
  }

  restart() {
    this.players = []
    this.board = null
  }

  brodcastMessage(message: MessageSender) {
    if (this.board) {
      throw new Error("Cannot braodcast message: board is not ready yet");
    }

    this.players.forEach((player) => message.sendMessage(player, this.board!));
  }
}
