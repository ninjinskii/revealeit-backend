import { Board } from "../domain/board.ts"
import { Player, ActivePlayer } from "../domain/player.ts"

enum Action {
    MOVE = "move:",
    KILL = "kill:",
    BOARD = "board:",
    PLAYERS = "players:",
    ERROR = "error:",
    HANDSHAKE = "handshake:",
    TURN = "turn:",
    LOG = "log:"
}

export class MessageReceiver {
    constructor(public board: Board, public factory: MessageHandlerFactory) {}

    handleMessage() {
        const handler = this.factory.getMessageHandler()
        handler.handleMessage(this.board)
    }
}

export class MessageHandlerFactory {
    key: string

    constructor(public message: string, public webSocket: WebSocket) {
        this.key = message.split(":")[0]
    }

    getMessageHandler(): MessageHandler {
        switch(this.key) {
            case Action.MOVE:
                return new MoveMessageHandler(this.message, this.webSocket)
            case Action.KILL:
                return new KillMessageHandler(this.message, this.webSocket)
            case Action.HANDSHAKE:
                return new HandshakeMessageHandler(this.message, this.webSocket)
        }

        throw new Error("Cannot get a message handler: unknown message key")
    }
}

interface MessageHandler {
    handleMessage(board: Board) 
}

interface MessageSender {
    sendMessage(player: Player, board: Board) 
}

class MoveMessageHandler implements MessageHandler {
    constructor(public message: string, public webSocket: WebSocket) {}

    handleMessage(board: Board) {
        const content = this.message.split(":")[1]
        const [fromX, fromY, toX, toY] = content.split(",")
        const slot = board.slots[fromY][fromX]

        try {
            board.movePieceTo(slot.piece, toY, toX)
        } catch(error) {
            new ErrorMessageSender(error).sendMessage(this.webSocket)
        }
    }
}

class KillMessageHandler implements MessageHandler {
    constructor(public message: string, public webSocket: WebSocket) {}

    handleMessage(board: Board) {
        const content = this.message.split(":")[1]
        const [fromX, fromY, toX, toY] = content.split(",")
        const slot = board.slots[fromY][fromX]

        try {
            board.killPieceAt(slot.piece, toY, toX)
        } catch (error) {
            new ErrorMessageSender(error).sendMessage(this.webSocket)
        }
    }
}

class HandshakeMessageHandler implements MessageHandler {
    constructor(public message: string, public webSocket: WebSocket) {}

    handleMessage(board: Board) {
        const playerId = this.message.split(":")[1]
        const player = board.players.find(player => player.id === playerId)

        if (!player) {
            board.onNewPlayerConnection(playerId)
        } else {
            player.webSocket = this.webSocket
        }
    }
}

export class BoardUpdateMessageSender implements MessageSender {
    constructor(public board: Board) {}

    sendMessage(player: Player) {
        const revealedZone = player instanceof ActivePlayer ? this.board.getRevealedZoneForPlayer(player) : this.board.flattenedSlots

        const message = `${Action.BOARD}${JSON.stringify(revealedZone)}`
        player.webSocket.send(message)
    }
}

export class PlayersMessageSender implements MessageSender {
    constructor(public board: Board) {}

    sendMessage(player: Player) {
        const notLoosers = this.board.getActivePlayers().filter(player => player.hasLost = false).map(player => player.id)
        const message = `${Action.PLAYERS}${notLoosers.join(",")}`
        player.webSocket.send(message)
    }
}

export class TurnMessageSender implements MessageSender {
    constructor(public board: Board) {}

    sendMessage(player: Player) {
        const message = `${Action.TURN}${player.id}`
        player.webSocket.send(message)
    }
}

class ErrorMessageSender implements MessageSender {
    constructor(public error: Error) {}

    sendMessage(player: Player) {
        const message = `${Action.ERROR}${this.error.message}`
        player.webSocket.send(message)
    }
}

class LogMessageSender implements MessageSender {
    constructor(public log: String) {}

    sendMessage(player: Player) {
        const message = `${Action.LOG}${this.log}`
        player.webSocket.send(message)
    }
}
