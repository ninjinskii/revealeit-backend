import { Player } from "../model/Player.ts";
import { Constants } from "../model/Constants.ts";
import { MessageType } from "./Message.ts";
import {
  HandshakeMessage,
  KillMessage,
  MoveMessage,
  ReceiveableMessage,
  SendableMessage,
} from "./Message.ts";
import { WebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Board } from "../domain/Board.ts";
import { LogAndPushErrorHandler } from "../util/BoardErrorHandler.ts";

export abstract class Messenger {
  constructor(
    private players: Player[],
    private onGameStarted: () => void,
  ) {}

  abstract sendMessage(message: SendableMessage): void;

  abstract endCommunication(): void;

  abstract isClosed(): boolean;

  receiveMessage(rawMessage: string): ReceiveableMessage {
    const [key, content] = rawMessage.split(":");

    switch (key) {
      case MessageType.MOVE:
        return new MoveMessage(key, content);
      case MessageType.KILL:
        return new KillMessage(key, content);
      case MessageType.HANDSHAKE:
        return new HandshakeMessage(
          key,
          content,
          this,
          this.players,
          this.onGameStarted,
        );
      default:
        throw new Error(`Cannot parse message: key was '${key}'`);
    }
  }
}

export class WebSocketMessenger extends Messenger {
  private onCloseListener?: (code: number) => void;
  private errorHandler = new LogAndPushErrorHandler(this);

  constructor(
    private webSocket: WebSocketClient,
    private board: Board | undefined,
    waitingPlayers: Player[],
    onGameStarted: () => void,
  ) {
    super(waitingPlayers, onGameStarted);

    webSocket.on(
      "message",
      (rawMessage: string) => {
        try {
          this.receiveMessage(rawMessage).execute(board);
        } catch (error) {
          this.errorHandler.registerError(error);
        }
      },
    );

    webSocket.on("error", () => {
      console.log("socket error");
    });

    webSocket.on("close", (code: number) => {
      this.onCloseListener?.call(this, code);
    });
  }

  isClosed(): boolean {
    const closed = this.webSocket.isClosed;
    return closed === true || closed === undefined;
  }

  sendMessage(message: SendableMessage): void {
    this.webSocket.send(message.prepare().build());
  }

  endCommunication(): void {
    this.webSocket.close(Constants.WEB_SOCKET_CLOSE_END_GAME_CODE);
  }

  setOnClosedListener(listener: (closeCode: number) => void): void {
    this.onCloseListener = listener;
  }
}
