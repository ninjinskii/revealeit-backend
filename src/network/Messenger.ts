import { Player } from "../model/Player.ts";
import { Constants } from "../model/Constants.ts";
import { MessageType } from "./Message.ts";
import { SendableMessage, ReceiveableMessage, HandshakeMessage, KillMessage, MoveMessage } from "./Message.ts";
import { BoardErrorRegistor } from "../util/BoardErrorHandler.ts";
import { Logger } from "../util/Logger.ts";
import { LogAndPushErrorRegistor } from "../util/BoardErrorHandler";
import { InfamousLogger } from "../util/Logger";

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
    private onCloseListener?: (number) => void;
    private errorHandler = new LogAndPushErrorRegistor(this, new InfamousLogger())
  
    constructor(private webSocket: WebSocketClient, players: Player[], onGameStarted: () => void) {
      super(players, onGameStarted);
  
      webSocket.on(
        "message",
        (rawMessage: string) => {
            try {
                super.receiveMessage(rawMessage).execute()
            } catch (error) {
                this.errorHandler.registerError(error)
            }
            // this.observers
            //   .find((observer) => observer.messageKey === message.key)
            //   ?.onMessageReceived(message);
        },
      );
  
      webSocket.on("error", () => {
        console.log("socket error")
      });
  
      webSocket.on("close", (code: number) => {
        this.onCloseListener?.call(this, code)
      });
    }

    isClosed(): boolean {
        return this.webSocket.isClosed()
    }
  
    sendMessage(message: SendableMessage): void {
      this.webSocket.send(message.prepare().build());
    }
  
    endCommunication(): void {
        this.webSocket.close(Constants.WEB_SOCKET_CLOSE_END_GAME_CODE)
    }

    setOnClosedListener(listener: (closeCode: number) => void): void {
        this.onCloseListener = listener
    }
}

