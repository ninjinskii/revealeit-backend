import { Player } from "../model/Player.ts";
import { Constants } from "../model/Constants.ts";
import { MessageType } from "./Message.ts";
import { SendableMessage, ReceiveableMessage, HandshakeMessage, KillMessage, MoveMessage } from "./Message.ts";

interface ReceiveableMessageObserver<T> {
    messageKey: string;
    onMessageReceived(message: T): void;
}

export abstract class Messenger {
    constructor(
        private players: Player[],
        private onGameStarted: () => void,
    ) {}

    protected observers: ReceiveableMessageObserver<any>[] = [];

    abstract sendMessage(message: SendableMessage): void;
  
    abstract endCommunication(): void;

    abstract isClosed(): boolean
  
    receiveMessage(rawMessage: string): ReceiveableMessage {
      const [key, content] = rawMessage.split(":");
  
      switch (key) {
        case MessageType.MOVE:
          return new MoveMessage(key, content, this);
        case MessageType.KILL:
          return new KillMessage(key, content, this);
        case MessageType.HANDSHAKE:
          return new HandshakeMessage(key, content, this, this.players, this.onGameStarted);
        default:
          throw new Error(`Cannot parse message: key was '${key}'`);
      }
    }

    observe(observer: ReceiveableMessageObserver<any>) {
        this.observers.push(observer);
      }
}

export class WebSocketMessenger extends Messenger {
    private websocket: WebSocketClient;
    private onCloseListener?: (number) => void;
  
    constructor(webSocket: WebSocketClient, players: Player[], onGameStarted: () => void) {
      super(players, onGameStarted);
      this.websocket = webSocket
  
      this.websocket.on(
        "message",
        (rawMessage: string) => {
            super.receiveMessage(rawMessage).execute()
            // this.observers
            //   .find((observer) => observer.messageKey === message.key)
            //   ?.onMessageReceived(message);
        },
      );
  
      this.websocket.on("error", () => {
        console.log("socket error")
      });
  
      this.websocket.on("close", (code: number) => {
        this.onCloseListener?.call(this, code)
      });
    }

    isClosed(): boolean {
        return this.websocket.isClosed()
    }
  
    sendMessage(message: SendableMessage): void {
      this.websocket.send(message.prepare().build());
    }
  
    endCommunication(): void {
        this.websocket.close(Constants.WEB_SOCKET_CLOSE_END_GAME_CODE)
    }

    setOnClosedListener(listener: (closeCode: number) => void): void {
        this.onCloseListener = listener
    }
}

