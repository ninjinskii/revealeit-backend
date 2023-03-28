import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "./domain/board.ts";
import { Player } from "./domain/player.ts";
import { Ruler } from "./domain/ruler.ts";
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
      if (code === Ruler.WEB_SOCKET_CLOSE_END_GAME_NUMBER) {
        resetGame();
      }

      if (game && game.players.every((player) => player.webSocket.isClosed)) {
        resetGame();
      }
      // const isGameFinished = game && game.players.length === 0;

      // if (isGameFinished) {
      //   game = undefined;
      // }

      // if (game) {
      //   const player = game.players.find(player => player.webSocket === webSocket)

      //   if (player && player instanceof ActivePlayer && player.hasLost) {
      //     resetGame()
      //   }
      // }

      // if (game) {
      //   const isAnotherPlayerDisconnected = game.players.filter((player) =>
      //     player.webSocket.isClosed && player.webSocket !== webSocket
      //   ).length >= 1;

      //   if (isAnotherPlayerDisconnected) {
      //     console.log("reset");
      //     resetGame();
      //   }
      // }

      // const isLastPlayer = game?.players.length === 1;

      // if (isLastPlayer) {
      //   players.forEach((player) => player.webSocket.closeForce());
      //   players.length = 0;
      //   game = undefined;
      // }

      // const isPlayerInGame = players.filter((player) =>
      //   player.webSocket === webSocket
      // );

      // if (isPlayerInGame) {
      //   players.forEach((player) => player.webSocket.closeForce());
      //   players.length = 0;
      //   game = undefined;
      // }
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
      player.webSocket.close(Ruler.WEB_SOCKET_CLOSE_DEFAULT_NUMBER)
    );

  players.length = 0;
  game = undefined;
}
