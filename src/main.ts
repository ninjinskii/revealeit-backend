import { Board } from "./domain/board.ts";
import { OrthogonalAllowedMovement } from "./domain/movement.ts";
import { Explorer, Shooter } from "./domain/piece.ts";
import { ActivePlayer } from "./domain/player.ts";
import { Ruler } from "./domain/ruler.ts";

const players = [
    new ActivePlayer({        
        id: 1, 
        name: "Louis", 
        color: "", 
        pieces: [
            new Explorer(),
            new Shooter()
        ],
        origin: { position: { x: 1, y: 1 }, xModifier: 1, yModifier: 1 }
    }),
    new ActivePlayer({
        id: 2, 
        name: "Ennemi", 
        color: "", 
        pieces: [
            new Explorer(),
            new Shooter()
        ],
        origin: { position: { x: Ruler.BOARD_SIZE, y: Ruler.BOARD_SIZE }, xModifier: -1, yModifier: -1 }
    }),
]

const board = new Board(players)
board.draw()