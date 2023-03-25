import { BoardUpdateMessageSender } from "../network/message.ts";
import { Piece } from "./piece.ts";
import { ActivePlayer, Player } from "./player.ts";
import { Ruler } from "./ruler.ts";
import { Turn } from "./turn.ts";

export interface Slot {
  x: number;
  y: number;
  piece: Piece | null;
}

export class Board {
  slots: Slot[][] = [];
  flattenedSlots: Slot[] = [];
  waitingForAnotherPlayer = false;
  boardUpdateSender: BoardUpdateMessageSender;
  turn: Turn;

  // Quan dune socket se ferme, s'il y a PLAYER_NUMBER, laisser le dernier joeur dans la lste des player pour sauvegarder son statut
  // stocker dans le localStorage le player id

  constructor(public players: Player[]) {
    Ruler.ensureCorrectActivePlayerCount(this);

    this.generateSlots();
    this.initPlayersPieces();

    Ruler.ensureCorrectBoardSize(this);

    this.boardUpdateSender = new BoardUpdateMessageSender(this);
    this.broadcastBoardUpdate();
    this.turn = new Turn(this);
    this.turn.start();
  }

  generateSlots() {
    for (let i = 0; i < Ruler.BOARD_SIZE; i++) {
      let j = 0;
      const array = [...new Array(Ruler.BOARD_SIZE)].map(() => ({
        x: j++,
        y: i,
        piece: null,
      }));
      this.slots.push(array);
    }

    this.flattenedSlots = this.slots.flat(1);
  }

  initPlayersPieces() {
    for (const player of this.getActivePlayers()) {
      for (const piece of player.pieces) {
        const { x, y, xModifier, yModifier } = player.origin;
        const { dX, dY } = piece.originSpawnDelta;
        const finalX = x + (dX * xModifier);
        const finalY = y + (dY * yModifier);

        if (!this.isSlotInBoard(finalX, finalY)) {
          throw new Error(
            `Cannot init board: slot (${x}, ${y}) is out of board`,
          );
        }

        const slot = this.slots[finalX][finalY];

        if (slot.piece !== null) {
          throw new Error(
            `Cannot init board: conflict on slot (${finalX}, ${finalY})`,
          );
        }

        slot.piece = piece;
      }
    }
  }

  getAllPieces(): Piece[] {
    return this.getActivePlayers().map((player) => player.pieces).flat(1);
  }

  getDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  isSlotEmpty(x: number, y: number): boolean {
    return this.slots[y][x].piece === null;
  }

  isSlotInBoard(x: number, y: number): boolean {
    return this.slots[y][x] !== undefined;
  }

  isMovementDistanceInBounds(
    piece: Piece,
    targetX: number,
    targetY: number,
  ): boolean {
    const bounds = piece.allowedMovements.bounds;
    const location = this.getPieceLocation(piece);

    if (!location) {
      return false;
    }

    const distance = this.getDistance(location.x, location.y, targetX, targetY);
    return distance >= bounds.min && distance <= bounds.max;
  }

  isMovementInRevealedZone(
    piece: Piece,
    targetX: number,
    targetY: number,
  ): boolean {
    const strategy = piece.allowedMovements.slotRevealStrategy;
    const slot = this.getPieceSlot(piece);

    if (!slot) {
      return false;
    }

    const revealedZone = strategy.resolve(this.flattenedSlots, slot);
    return revealedZone.filter((slot) =>
      slot.x === targetX && slot.y === targetY
    ).length > 0;
  }

  getRevealedZoneForPiece(piece: Piece) {
    const slot = this.getPieceSlot(piece);

    if (!slot) {
      throw new Error(
        "Cannot get revealed zone for piece: piece slot not found",
      );
    }

    return piece.allowedMovements.slotRevealStrategy.resolve(
      this.flattenedSlots,
      slot,
    );
  }

  // TODO: rename AllowedMovement to Zone
  getKillableSlotsForPlayer(player: ActivePlayer): Slot[] {
    const killers = player.pieces.filter((piece) =>
      piece.canKill && piece.allowedKills
    );

    const presumableVictims = killers.map((killer) => {
      const slot = this.getPieceSlot(killer);

      if (!slot) {
        throw new Error(
          "Cannot get killable pieces: piece slot not found",
        );
      }

      return killer.allowedKills!.slotRevealStrategy
        .resolve(this.flattenedSlots, slot)
        .filter((slot) => slot.piece && slot.piece.playerId !== player.id);
    }).flat(1);

    return presumableVictims;
  }

  getPieceLocation(piece: Piece): { x: number; y: number } | null {
    const slot = this.flattenedSlots.find((slot) => slot.piece == piece);
    return slot === undefined ? null : { x: slot.x, y: slot.y };
  }

  getPieceSlot(piece: Piece): Slot | null {
    const slot = this.flattenedSlots.find((slot) => slot.piece == piece);
    return slot === undefined ? null : slot;
  }

  movePieceTo(piece: Piece | null, targetX: number, targetY: number) {
    if (!piece) {
      throw new Error("Cannot move: mover not found");
    }

    if (!this.isSlotInBoard(targetX, targetY)) {
      throw new Error("Cannot move: slot is outside the board");
    }

    if (!this.isMovementDistanceInBounds(piece, targetX, targetY)) {
      throw new Error("Cannot move: trying to move too fast");
    }

    if (!this.isMovementInRevealedZone(piece, targetX, targetY)) {
      throw new Error(
        "Cannot move: trying to move outside piece's revealed zone",
      );
    }

    if (!this.isSlotEmpty(targetX, targetY)) {
      throw new Error("Cannot move: slot is already taken");
    }

    const pieceLocation = this.getPieceLocation(piece);

    if (pieceLocation === null) {
      throw new Error("Cannot move: cannot retrieve piece location");
    }

    const currentX = pieceLocation.x;
    const currentY = pieceLocation.y;

    this.slots[currentY][currentX].piece = null;
    this.slots[targetY][targetX].piece = piece;
    this.turn.registerMove();
    this.broadcastBoardUpdate();
  }

  getRevealedZoneForPlayer(player: ActivePlayer): Slot[] {
    const zone: Slot[] = [];

    for (const piece of player.pieces) {
      const strategy = piece.allowedMovements.slotRevealStrategy;
      const slot = this.getPieceSlot(piece);

      if (!slot) {
        continue;
      }

      zone.push(...strategy.resolve(this.flattenedSlots, slot));
    }

    const deduplicates = (array: Slot[]) =>
      array.filter((value, index, self) =>
        index ===
          self.findIndex((slot) => (slot.x === value.x && slot.y === value.y))
      );

    return deduplicates(zone);
  }

  killPieceAt(killer: Piece | null, x: number, y: number) {
    if (!killer) {
      throw new Error("Cannot kill: killer not found");
    }

    if (!killer.canKill) {
      throw new Error("Cannot kill: this piece is not abilited to kill");
    }

    if (!this.isSlotInBoard(x, y)) {
      throw new Error("Cannot kill: slot is outside the board");
    }

    if (this.isSlotEmpty(x, y)) {
      throw new Error("Cannot kill: nothing to kill here");
    }

    const victimSlot = this.slots[y][x];
    const victim = victimSlot.piece;

    if (!victim) {
      throw new Error("Cannot kill: unable to find targeted piece");
    }

    if (!this.isMovementInRevealedZone(victim, x, y)) {
      throw new Error(
        "Cannot kill: trying to move outside piece's revealed zone",
      );
    }

    if (killer.playerId === victim.playerId) {
      throw new Error("Cannot kill: trying to kill own piece");
    }

    const victimPlayer = this.getActivePlayers().find((player) =>
      player.id === victim.playerId
    );

    if (!victimPlayer) {
      throw new Error("Cannot kill: unable to find targeted player");
    }

    victimPlayer.pieces = victimPlayer.pieces.filter((piece) =>
      piece != victim
    );
    victimSlot.piece = null;
    this.broadcastBoardUpdate();
  }

  getActivePlayers(): ActivePlayer[] {
    return this.players.filter((player) =>
      player instanceof ActivePlayer
    ) as ActivePlayer[];
  }

  onPlayerDisconnection(playerId: string) {
    if (this.getActivePlayers().length < Ruler.ACTIVE_PLAYER_NUMBER) {
      this.waitingForAnotherPlayer = true;
      return;
    }

    // Remove player from array based on its id
  }

  onPlayerLost(player: ActivePlayer) {
    player.hasLost = true;
    player.pieces = [];
  }

  broadcastBoardUpdate() {
    this.players.forEach((player) =>
      this.boardUpdateSender.sendMessage(player)
    );
  }

  draw() {
    console.log("________________________________________");
    for (const row of this.slots) {
      console.log(row.map((slot) => {
        if (!slot.piece) {
          return "_";
        }

        if (slot.piece.playerId === "1") {
          return "1";
        }

        if (slot.piece.playerId === "2") {
          return "2";
        }
      }));
    }
    console.log("________________________________________");
  }
}
