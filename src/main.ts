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
const playerBuffer: Player[] = [];
const games: Board[] = [];

serverWebSocket.on(
  "connection",
  (webSocket: WebSocketClient) => {
    webSocket.on("message", (message: string) => {
      console.log(message.split(":")[0]);

      const messageFactory = new MessageHandlerFactory(
        message,
        webSocket,
        games,
        playerBuffer
      );

      const messageReceiver = new MessageReceiver(messageFactory);
      messageReceiver.handleMessage();
    });

    // webSocket.on("close", () => {
    //   removePlayerFromBuffer(webSocket)
    // });
  },
);

function removePlayerFromBuffer(playerWebSocket: WebSocketClient) {
  const index = playerBuffer.map((player) => player.webSocket).indexOf(
    playerWebSocket,
  );

  if (index > 0) {
    playerBuffer.splice(index, 1);
  }
}
