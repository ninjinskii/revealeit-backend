import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "./domain/board.ts";
import { Explorer, Shooter } from "./domain/piece.ts";
import { ActivePlayer, Player } from "./domain/player.ts";
import { Ruler } from "./domain/ruler.ts";
import { MessageHandlerFactory, MessageReceiver } from "./network/message.ts";

const serverWebSocket = new WebSocketServer(5000);
const players: Player[] = [];
let game: Board | undefined = undefined;

serverWebSocket.on(
  "connection",
  (webSocket: WebSocketClient) => {
    webSocket.on("message", (message: string) => {
      const onGameStarted = () => {
        const board = new Board();
        board.init([...players]);
        game = board;
        players.length = 0;
      };

      const messageFactory = new MessageHandlerFactory(
        message,
        webSocket,
        players,
        onGameStarted,
      );

      const messageReceiver = new MessageReceiver(messageFactory);
      messageReceiver.handleMessage(game);
    });

    // webSocket.on("close", () => {
    //   removePlayerFromBuffer(webSocket)
    // });
  },
);

// function removePlayerFromBuffer(playerWebSocket: WebSocketClient) {
//   const index = playerBuffer.map((player) => player.webSocket).indexOf(
//     playerWebSocket,
//   );

//   if (index > 0) {
//     playerBuffer.splice(index, 1);
//   }
// }
