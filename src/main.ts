import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "./domain/Board.ts";
import { Constants } from "./model/Constants.ts";
import { Player } from "./model/Player.ts";
import { WebSocketMessenger } from "./network/Messenger";

const serverWebSocket = new WebSocketServer(5000);
const players: Player[] = [];
let game: Board | undefined = undefined;

serverWebSocket.on(
  "connection",
  (webSocket: WebSocketClient) => {
      const messenger = new WebSocketMessenger(webSocket, players, startGame)
      messenger.setOnClosedListener(checkResetGame)
  },
);

function startGame() {
  const board = new Board();
  board.init([...players]);
  game = board;
  players.length = 0;
}

function checkResetGame(closeCode: number) {
  const everybodyHasQuit = game && game.players.every((player) => player.webSocket.isClosed)
  const clientRequestGameToEnd = closeCode === Constants.WEB_SOCKET_CLOSE_END_GAME_CODE

  if (everybodyHasQuit || clientRequestGameToEnd) {
    resetGame();
  }
}

function resetGame() {
  players
    .filter((player) => !player.messenger.isClosed())
    .forEach((player) =>
      player.mesenger.endCommunication(Constants.WEB_SOCKET_CLOSE_DEFAULT_CODE)
    );

  players.length = 0;
  game = undefined;
}
