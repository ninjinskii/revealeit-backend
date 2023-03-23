import { Piece } from "./piece.ts"

export interface Player {
    id: string
    name: string
    webSocket: WebSocket
}

export interface ActivePlayerOptions{
    id: string
    name: string
    color: string
    pieces: Piece[]
    origin: PlayerOrigin
    webSocket: WebSocket
}

export class ActivePlayer implements Player {
    public id : string
    public name : string
    public color : string
    public pieces : Piece[]
    public origin: PlayerOrigin
    public hasLost = false
    public webSocket: WebSocket

    constructor(options: ActivePlayerOptions) {
        const { id, name, color, pieces, origin, webSocket } = options

        this.id = id
        this.name = name
        this.color = color
        this.pieces = pieces
        this.origin = origin
        this.webSocket = webSocket
    }
}

export class SpectatorPlayer implements Player {
    constructor(
        public id: string,
        public name: string,
        public webSocket: WebSocket
    ) {}
}

export interface PlayerOrigin {
    x: number
    y: number
    xModifier: 1 | -1
    yModifier: 1 | -1
}