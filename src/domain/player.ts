import { Slot } from "./board.ts"
import { Piece } from "./piece.ts"

export interface Player {
    id: string
    name: string
}

export interface ActivePlayerOptions{
    id: string
    name: string
    color: string
    pieces: Piece[]
    origin: PlayerOrigin
}

export class ActivePlayer implements Player {
    public id : string
    public name : string
    public color : string
    public pieces : Piece[]
    public origin: PlayerOrigin
    public hasLost = false

    constructor(options: ActivePlayerOptions) {
        const { id, name, color, pieces, origin } = options

        this.id = id
        this.name = name
        this.color = color
        this.pieces = pieces
        this.origin = origin
    }
}

export class SpectatorPlayer implements Player {
    constructor(
        public id: string,
        public name: string,
    ) {}
}

export interface PlayerOrigin {
    x: number
    y: number
    xModifier: 1 | -1
    yModifier: 1 | -1
}