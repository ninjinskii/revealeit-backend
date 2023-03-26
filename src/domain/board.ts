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
  public players: Player[] = [];
  public flattenedSlots: Slot[] = [];
  public turn = new Turn(this);

  private slots: Slot[][] = [];
  private boardUpdateSender = new BoardUpdateMessageSender(this);

  init(players: Player[]) {
    this.players = players;

    Ruler.ensureCorrectActivePlayerCount(this);

    this.generateSlots();
    this.initPlayersPieces();

    Ruler.ensureCorrectBoardSize(this);

    this.broadcastBoardUpdate();
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

  getSlot(x: number, y: number) {
    return this.slots[y][x];
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
    if (this.turn.waitForKill) {
      throw new Error(
        "Cannot move: max play coutn reached, waiting for a kill",
      );
    }

    if (!piece) {
      throw new Error("Cannot move: mover not found");
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
    this.turn.registerPlay();
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

  killPieceAt(player: ActivePlayer, x: number, y: number) {
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

    if (Ruler.COUNT_KILL_AS_TURN_MOVE) {
      this.turn.registerPlay();
    }

    if (this.turn.waitForKill) {
      this.turn.waitForKill = false;
      this.turn.end();
    }

    this.broadcastBoardUpdate();
    this.turn.checkLooseCondition();

    if (this.doWeHaveAWinner()) {
      this.endGame();
    }
  }

  getActivePlayers(): ActivePlayer[] {
    return this.players.filter((player) =>
      player instanceof ActivePlayer
    ) as ActivePlayer[];
  }

  isPlayerTurn(player: Player): boolean {
    return this.turn.getCurrentPlayer().id === player.id;
  }

  onPlayerLost(player: ActivePlayer) {
    player.hasLost = true;
    player.pieces = [];
  }

  broadcastBoardUpdate() {
    console.log("send update to players");
    this.players.forEach((player) =>
      this.boardUpdateSender.sendMessage(player)
    );
  }

  private doWeHaveAWinner(): string | null {
    const notLoosers = this.getActivePlayers().filter((player) =>
      !player.hasLost
    );

    if (notLoosers.length === 1) {
      return notLoosers[0].name;
    }

    return null;
  }

  private endGame() {
    this.players = [];
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
