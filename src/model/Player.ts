import { WebSocketClient } from "../../deps.ts";
import { Piece } from "./Piece.ts";

export interface PlayerOptions {
  id: string;
  name: string;
  pieces: Piece[];
  origin: PlayerOrigin;
  webSocket: WebSocketClient;
}

export interface PlayerOrigin {
  x: number;
  y: number;
  xModifier: 1 | -1;
  yModifier: 1 | -1;
}


export class Player {
  public id: string;
  public name: string;
  public pieces: Piece[];
  public origin: PlayerOrigin;
  public hasLost = false;
  public webSocket: WebSocketClient;

  constructor(options: PlayerOptions) {
    const { id, name, pieces, origin, webSocket } = options;

    this.id = id;
    this.name = name;
    this.pieces = pieces;
    this.origin = origin;
    this.webSocket = webSocket;
  }
}
