import { Piece } from "./piece.ts"
import { ActivePlayer, Player } from "./player.ts"
import { Ruler } from "./ruler.ts"

export interface Slot {
    x: number
    y: number
    piece: Piece | null
}

export class Board {
    slots: Slot[][] = []
    flattenedSlots: Slot[] = []
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
        for (let i = 0; i < Ruler.BOARD_SIZE; i++) {
            let j = 0
            const array = [...new Array(Ruler.BOARD_SIZE)].map(() => ({ x: j++, y: i, piece: null }))
            this.slots.push(array)
        }

        console.log(this.slots)

        this.flattenedSlots = this.slots.flat(1)
    }

    initPlayersPieces() {
        for (const player of this.getActivePlayers()) {
            for (const piece of player.pieces) {
                const { x, y, xModifier, yModifier } = player.origin
                const { dX, dY }  = piece.originSpawnDelta
                const finalX = x + (dX * xModifier)
                const finalY = y + (dY * yModifier)

                if (!this.isSlotInBoard(finalX, finalY)) {   
                    throw new Error(`Cannot init board: slot (${x}, ${y}) is out of board`)
                }

                const slot = this.slots[finalX][finalY]
                
                if (slot.piece !== null) {
                    throw new Error(`Cannot init board: conflict on slot (${finalX}, ${finalY})`)
                }

                slot.piece = piece
            }
        }
    }

    getAllPieces(): Piece[] {
        return this.getActivePlayers().map(player => player.pieces).flat(1)
    }

    getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2))
    }

    isSlotEmpty(x: number, y: number): boolean {
        return this.slots[y][x].piece === null
    }

    isSlotInBoard(x: number, y: number): boolean {
        return this.slots[y][x] !== undefined
    }

    isMovementDistanceInBounds(piece: Piece, targetX: number, targetY: number): boolean {
        const bounds = piece.allowedMovements.bounds
        const location = this.getPieceLocation(piece)

        if (!location) {
            return false
        }

        const distance = this.getDistance(location.x, location.y, targetX, targetY)
        console.log(`distance: ${distance}`)
        return distance >= bounds.min && distance <= bounds.max
    }

    isMovementInRevealedZone(piece: Piece, targetX: number, targetY: number): boolean {
        const strategy = piece.allowedMovements.slotRevealStrategy
        const slot = this.getPieceSlot(piece)

        if (!slot) {
            return false
        }

        const revealedZone = strategy.resolve(this.flattenedSlots, slot)
        console.log("revealedZone")
        console.log(revealedZone)
        return revealedZone.filter(slot => slot.x === targetX && slot.y === targetY).length > 0
    }

    getPieceLocation(piece: Piece): { x: number, y: number } | null {
        const slot = this.flattenedSlots.find(slot => slot.piece == piece)
        return slot === undefined ? null : { x: slot.x, y: slot.y }
    }

    getPieceSlot(piece: Piece): Slot | null {
        const slot = this.flattenedSlots.find(slot => slot.piece == piece)
        return slot === undefined ? null : slot
    }

    movePieceTo(piece: Piece, targetX: number, targetY: number) {
        if (!this.isSlotInBoard(targetX, targetY)) {
            console.log("1")
            return
        }
        
        if (!this.isMovementDistanceInBounds(piece, targetX, targetY)) {
            console.log("2")
            return
        }
        
        if (!this.isMovementInRevealedZone(piece, targetX, targetY)) {
            console.log("3")
            return
        }
        
        if (!this.isSlotEmpty(targetX, targetY)) {
            console.log("4")
            return
        }
        
        const pieceLocation = this.getPieceLocation(piece)
        
        if (pieceLocation === null) {
            console.log("5")
            return
        }

        const currentX = pieceLocation.x
        const currentY = pieceLocation.y

        this.slots[currentY][currentX].piece = null
        this.slots[targetY][targetX].piece = piece
    }

    getRevealedZoneForPlayer(player: ActivePlayer) {

    }

    killPieceAt(killer: Piece, x: number, y: number) {
        if (!killer.canKill) {
            return
        }

        const victimSlot = this.slots[y][x]
        const victim = victimSlot.piece

        if (killer.playerId === victim.playerId) {
            return
        }

        const victimPlayer = this.getActivePlayers().find(player => player.id === victim.playerId)

        if (!victimPlayer) {
            return
        }

        victimPlayer.pieces = victimPlayer.pieces.filter(piece => piece != victim)
        victimSlot.piece = null
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
        console.log("________________________________________")
        for(const row of this.slots) {
            console.log(row.map(slot => {
                if (!slot.piece) {
                    return "_"
                }

                if (slot.piece.playerId === "1") {
                    return "1"
                }

                if (slot.piece.playerId === "2") {
                    return "2"
                }
            }))
        }
        console.log("________________________________________")
    }
}
