import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "./domain/board.ts";
import { Game } from "./domain/game.ts";
import { Explorer, Shooter } from "./domain/piece.ts";
import { ActivePlayer } from "./domain/player.ts";
import { Ruler } from "./domain/ruler.ts";

// const p1Piece = new Explorer("1");
// const p1Shooter = new Shooter("1");
// const players = [
//   new ActivePlayer({
//     id: "1",
//     name: "Louis",
//     color: "",
//     pieces: [
//       p1Piece,
//       p1Shooter,
//     ],
//     origin: { x: 0, y: 0, xModifier: 1, yModifier: 1 },
//   }),
//   new ActivePlayer({
//     id: "2",
//     name: "Ennemi",
//     color: "",
//     pieces: [
//       new Explorer("2"),
//       new Shooter("2"),
//     ],
//     origin: {
//       x: Ruler.BOARD_SIZE - 1,
//       y: Ruler.BOARD_SIZE - 1,
//       xModifier: -1,
//       yModifier: -1,
//     },
//   }),
// ];

// const board = new Board(players);
// board.draw();

const serverWebSocket = new WebSocketServer(5000);
new Game([], serverWebSocket);
