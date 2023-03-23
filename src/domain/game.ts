import { MessageHandlerFactory, MessageReceiver } from "../network/message.ts";
import { Board } from "./board.ts";
import { Player } from "./player.ts";

// Bridges the gap between network and board
export class Game {
    constructor(public board: Board, public players: Player[], public serverWebSocket: WebSocketServer) {
        this.initServerWebSocket()
    }

    initServerWebSocket() {
        this.serverWebSocket.on("connection", function (webSocket: WebSocketClient) {
            webSocket.on("message", function(message: string) {
                const messageFactory = new MessageHandlerFactory(message, webSocket)
                const messageReceiver = new MessageReceiver(this.board, messageFactory)
                messageReceiver.handleMessage()
            })
        });
    }
}