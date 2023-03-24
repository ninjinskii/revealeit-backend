import { WebSocketClient } from "../../deps.ts";
import { Piece } from "./piece.ts";

export interface Player {
  id: string;
  name: string;
  webSocket: WebSocketClient;
}

export interface ActivePlayerOptions {
  id: string;
  name: string;
  pieces: Piece[];
  origin: PlayerOrigin;
  webSocket: WebSocketClient;
}

export class ActivePlayer implements Player {
  public id: string;
  public name: string;
  public pieces: Piece[];
  public origin: PlayerOrigin;
  public hasLost = false;
  public webSocket: WebSocketClient;

  constructor(options: ActivePlayerOptions) {
    const { id, name, pieces, origin, webSocket } = options;

    this.id = id;
    this.name = name;
    this.pieces = pieces;
    this.origin = origin;
    this.webSocket = webSocket;
  }
}

export class SpectatorPlayer implements Player {
  constructor(
    public id: string,
    public name: string,
    public webSocket: WebSocketClient,
  ) {}
}

export interface PlayerOrigin {
  x: number;
  y: number;
  xModifier: 1 | -1;
  yModifier: 1 | -1;
}
