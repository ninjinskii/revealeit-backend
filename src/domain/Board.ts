import {
  BoardUpdateMessageSender,
  PlayersMessageSender,
} from "../network/Message.ts";
import { Piece } from "../model/Piece.ts";
import { Player } from "../model/Player.ts";
import { Rules } from "./Rules.ts";
import { Turn } from "./Turn.ts";

export interface Slot {
  x: number;
  y: number;
  piece: Piece | null;
}

export class Board {
  public players: Player[] = [];
  public flattenedSlots: Slot[] = [];
  public turn = new Turn(this);
  public slots: Slot[][] = [];

  private boardUpdateSender = new BoardUpdateMessageSender(this);
  private playersMessageSender = new PlayersMessageSender(this);

  init(players: Player[]) {
    this.players = players;

    Rules.ensureCorrectPlayerCount(this);

    this.generateSlots();
    this.initPlayersPieces();

    Rules.ensureCorrectBoardSize(this);

    this.broadcastBoardUpdate();
    this.broadcastPlayersUpdate();
    this.turn.start();
  }

  generateSlots() {
    for (let i = 0; i < Rules.BOARD_SIZE; i++) {
      let j = 0;
      const array = [...new Array(Rules.BOARD_SIZE)].map(() => ({
        x: j++,
        y: i,
        piece: null,
      }));
      this.slots.push(array);
    }

    this.flattenedSlots = this.slots.flat(1);
  }

  initPlayersPieces() {
    for (const player of this.players) {
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
    return this.players.map((player) => player.pieces).flat(1);
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

  getSlot(x: number, y: number) {
    return this.slots[y][x];
  }

  isMovementDistanceInBounds(
    piece: Piece,
    targetX: number,
    targetY: number,
  ): boolean {
    const location = this.getPieceLocation(piece);

    if (!location) {
      return false;
    }

    const distance = this.getDistance(location.x, location.y, targetX, targetY);
    return distance > 0 && distance <= piece.actionZone.moveRange;
  }

  isMovementInRevealedZone(
    piece: Piece,
    targetX: number,
    targetY: number,
  ): boolean {
    const slot = this.getPieceSlot(piece);

    if (!slot) {
      return false;
    }

    const revealedZone = piece.actionZone.resolveReveal(
      this.flattenedSlots,
      slot.x,
      slot.y,
    );

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

    return piece.actionZone.resolveReveal(this.flattenedSlots, slot.x, slot.y);
  }

  getRevealedZoneForPlayer(player: Player): Slot[] {
    const zone: Slot[] = [];

    for (const piece of player.pieces) {
      const slot = this.getPieceSlot(piece);

      if (!slot) {
        continue;
      }

      zone.push(
        ...piece.actionZone.resolveReveal(this.flattenedSlots, slot.x, slot.y),
      );
    }

    // return zone;
    const deduplicates = (array: Slot[]) =>
      array.filter((value, index, self) =>
        index ===
          self.findIndex((slot) => (slot.x === value.x && slot.y === value.y))
      );

    return deduplicates(zone);
  }

  getKillableSlotsForPlayer(player: Player): Slot[] {
    const revealedZone = this.getRevealedZoneForPlayer(player);

    const killers = player.pieces.filter((piece) =>
      piece.actionZone.killRange > 0
    );

    const presumableVictims = killers.map((killer) => {
      const slot = this.getPieceSlot(killer);

      if (!slot) {
        throw new Error(
          "Cannot get killable pieces: piece slot not found",
        );
      }

      return killer.actionZone.resolveKill(this.flattenedSlots, slot.x, slot.y)
        .filter((slot) =>
          slot.piece && revealedZone.includes(slot) &&
          slot.piece.playerId !== player.id
        );
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
    if (this.turn.waitForKill) {
      throw new Error(
        "Cannot move: max play count reached, waiting for a kill", // "Un pion est à votre portée, éliminez-le pour achever le tour.
      );
    }

    if (!piece) {
      throw new Error("Cannot move: mover not found");
    }

    if (!this.turn.isPieceMoveable(piece)) {
      throw new Error(
        "Cannot move: piece already moved this turn",
      );
    }

    const player = this.players.find((player) => player.id === piece.playerId);

    if (!player) {
      throw new Error(
        "Cannot move: player associated with moving piece does not exists",
      );
    }

    if (!this.isPlayerTurn(player)) {
      throw new Error("Cannot move: wait for player turn");
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
    this.turn.registerPlay(piece);
    this.broadcastBoardUpdate();
  }

  killPieceAt(player: Player, x: number, y: number) {
    if (!this.isPlayerTurn(player)) {
      throw new Error("Cannot move: wait for player turn");
    }

    const isAllowedToKill = this.getKillableSlotsForPlayer(player).find((
      slot,
    ) => slot.x === x && slot.y === y);

    if (!isAllowedToKill) {
      throw new Error(
        `Cannot kill: ${player.id} cannot kill piece at ${x},${y}`,
      );
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

    if (player.id === victim.playerId) {
      throw new Error("Cannot kill: trying to kill own piece");
    }

    const victimPlayer = this.players.find((player) =>
      player.id === victim.playerId
    );

    if (!victimPlayer) {
      throw new Error("Cannot kill: unable to find targeted player");
    }

    victimPlayer.pieces = victimPlayer.pieces.filter((piece) =>
      piece != victim
    );
    victimSlot.piece = null;

    if (Rules.COUNT_KILL_AS_TURN_MOVE) {
      this.turn.registerPlay();
    }

    if (this.turn.waitForKill) {
      this.turn.waitForKill = false;
      this.turn.end();
    }

    this.turn.checkLooseCondition();
    this.broadcastBoardUpdate();
  }

  isPlayerTurn(player: Player): boolean {
    return this.turn.getCurrentPlayer().id === player.id;
  }

  onPlayerLost(player: Player) {
    player.hasLost = true;
    player.pieces = [];
  }

  broadcastBoardUpdate() {
    this.players.forEach((player) =>
      this.boardUpdateSender.sendMessage(player)
    );
  }

  broadcastPlayersUpdate() {
    this.players.forEach((player) =>
      this.playersMessageSender.sendMessage(player)
    );
  }
}
