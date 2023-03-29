import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "./domain/board.ts";
import { Constants } from "./domain/Constants.ts";
import { Player } from "./domain/Player.ts";
import { MessageHandlerFactory, MessageReceiver } from "./network/message.ts";

const serverWebSocket = new WebSocketServer(5000);
const players: Player[] = [];
let game: Board | undefined = undefined;

serverWebSocket.on(
  "connection",
  (webSocket: WebSocketClient) => {
    webSocket.on("message", (message: string) => {
      const messageFactory = new MessageHandlerFactory(
        message,
        webSocket,
        players,
        startGame,
      );

      const messageReceiver = new MessageReceiver(messageFactory);
      messageReceiver.handleMessage(game);
    });

    webSocket.on("close", (code) => {
      if (code === Constants.WEB_SOCKET_CLOSE_END_GAME_NUMBER) {
        resetGame();
      }

      if (game && game.players.every((player) => player.webSocket.isClosed)) {
        resetGame();
      }
    });
  },
);

function startGame() {
  const board = new Board();
  board.init([...players]);
  game = board;
  players.length = 0;
}

function resetGame() {
  players
    .filter((player) => !player.webSocket.isClosed)
    .forEach((player) =>
      player.webSocket.close(Constants.WEB_SOCKET_CLOSE_DEFAULT_NUMBER)
    );

  players.length = 0;
  game = undefined;
}
