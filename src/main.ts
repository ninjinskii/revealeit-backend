import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "./domain/Board.ts";
import { Constants } from "./model/Constants.ts";
import { Player } from "./model/Player.ts";
import { WebSocketMessenger } from "./network/Messenger.ts";

const serverWebSocket = new WebSocketServer(5000);
const players: Player[] = [];
const board = new Board();

serverWebSocket.on(
  "connection",
  (webSocket: WebSocketClient) => {
    const messenger = new WebSocketMessenger(
      webSocket,
      board,
      players,
      startGame,
    );
    messenger.setOnClosedListener(checkResetGame);
  },
);

function startGame() {
  board.init([...players]);
  players.length = 0;
}

function checkResetGame(closeCode: number) {
  const everybodyHasQuit = board &&
    board.players.every((player) => player.messenger.isClosed());
  const clientRequestGameToEnd =
    closeCode === Constants.WEB_SOCKET_CLOSE_END_GAME_CODE;

  if (everybodyHasQuit || clientRequestGameToEnd) {
    resetGame();
  }
}

function resetGame() {
  players
    .filter((player) => !player.messenger.isClosed())
    .forEach((player) => player.messenger.endCommunication());

  players.length = 0;
  board.players.length = 0;
}
