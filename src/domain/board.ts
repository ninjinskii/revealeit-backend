import { Piece } from "./piece.ts"
import { ActivePlayer, Player } from "./player.ts"
import { Ruler } from "./ruler.ts"

export interface Slot {
    x: number
    y: number
}

export class Board {
    slots: Slot[] = []
    waitingForAnotherPlayer = false

    // Quan dune socket se ferme, s'il y a PLAYER_NUMBER, laisser le dernier joeur dans la lste des player pour sauvegarder son statut
    // stocker dans le localStorage le player id

    constructor(public players: Player[]) {
        Ruler.ensureCorrectActivePlayerCount(this)

        this.generateSlots()
        this.initPlayersPieces()

        Ruler.ensureCorrectBoardSize(this)
    }

    generateSlots() {
        for (let i = 1; i <= Ruler.BOARD_SIZE; i++) {
            for (let j = 1; j <= Ruler.BOARD_SIZE; j++) {
                this.slots.push({ x: i, y: j })
            }
        }
    }

    initPlayersPieces() {
        for (const player of this.getActivePlayers()) {
            for (const piece of player.pieces) {
                const { position, xModifier, yModifier } = player.origin
                const { dX, dY }  = piece.originSpawnDelta
                const x = position.x + (dX * xModifier)
                const y = position.y + (dY * yModifier)

                if (!this.isSlotEmpty({ x, y })) {
                    throw new Error(`Cannot init board: conflict on slot (${x}, ${y})`)
                }

                if (!this.isSlotInBoard({ x, y })) {   
                    throw new Error(`Cannot init board: slot (${x}, ${y}) is out of board`)
                }
                
                piece.position = { x, y }
            }
        }
    }

    getAllPieces(): Piece[] {
        return this.getActivePlayers().map(player => player.pieces).flat(1)
    }

    getDistance(slot1: Slot, slot2: Slot) {
        return Math.sqrt(Math.pow((slot2.x - slot1.x), 2) + Math.pow((slot2.y - slot1.y), 2))
    }

    isSlotEmpty(slot: Slot): boolean {
        return !this.getAllPieces().some(piece => piece.position.x === slot.x && piece.position.y === slot.y)
    }

    isSlotInBoard(slot: Slot): boolean {
        return this.slots.filter(s => s.x === slot.x && s.y === slot.y).length > 0
    }

    isMovementDistanceInBounds(piece: Piece, targetSlot: Slot): boolean {
        const bounds = piece.allowedMovements.bounds
        const distance = this.getDistance(piece.position, targetSlot)
        return distance > bounds.min && distance < bounds.max
    }

    isMovementInRevealedZone(piece: Piece, targetSlot: Slot): boolean {
        const revealedZone = piece.allowedMovements.slotRevealStrategy.resolve(this.slots, piece)
        return revealedZone.filter(slot => slot.x === targetSlot.x && slot.y === targetSlot.y).length > 0
    }

    movePieceTo(piece: Piece, x: number, y: number) {
        const targetSlot = { x, y }

        if (!this.isSlotInBoard(targetSlot)) {
            return
        }

        if (!this.isMovementDistanceInBounds(piece, targetSlot)) {
            return
        }

        if (!this.isMovementInRevealedZone(piece, targetSlot)) {
            return
        }

        if (!this.isSlotEmpty(targetSlot)) {
            return
        }

        piece.position = targetSlot
    }

    getRevealedZoneForPlayer(player: ActivePlayer) {

    }

    killPiece(killer: Piece, target: Piece) {
        if (!killer.canKill) {
            return
        }
    }

    getActivePlayers(): ActivePlayer[] {
        return this.players.filter(player => player instanceof ActivePlayer) as ActivePlayer[]
    }

    onPlayerDisconnection(playerId: string) {
        if (this.getActivePlayers().length < Ruler.ACTIVE_PLAYER_NUMBER) {
            this.waitingForAnotherPlayer = true
        }

        // Remove player from array based on its id
    }

    onPlayerConnection(playerId: string) {
        const wasWaitingForAnotherPlayer = this.getActivePlayers().length === Ruler.ACTIVE_PLAYER_NUMBER - 1

        if (wasWaitingForAnotherPlayer) {
            this.waitingForAnotherPlayer = false
        }

        // Add player to array
    }

    onPlayerLost(player: ActivePlayer) {
        player.hasLost = true;
        player.pieces = []
    }

    draw() {
        console.log("Pieces: ")
        console.log(this.getAllPieces().map(piece => piece.position))
        console.log("________________________________________")
        for (let x = 1; x <= Ruler.BOARD_SIZE; x++) {
            let row: string[] = []

            for (let y = 1; y <= Ruler.BOARD_SIZE; y++) {
                if (this.getAllPieces().find(piece => piece.position.x === x && piece.position.y === y)) {
                    row.push("0")
                } else {
                    row.push("_")
                }
            }

            console.log(row)
            row = []
        }
    }
}
