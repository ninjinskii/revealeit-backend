import { Piece } from "../model/Piece.ts";
import { Player } from "../model/Player.ts";
import { BoardUpdateMessage, PlayersMessage } from "../network/Message.ts";
import { BoardError } from "../util/BoardError.ts";
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

  isSlotEmpty(x: number, y: number): boolean {
    return this.slots[y][x].piece === null;
  }

  isSlotInBoard(x: number, y: number): boolean {
    return this.slots[y] !== undefined && this.slots[y][x] !== undefined;
  }

  getSlot(x: number, y: number) {
    return this.slots[y][x];
  }

  isMovementDistanceInBounds(
    piece: Piece,
    targetX: number,
    targetY: number,
  ): boolean {
    const slot = this.getPieceSlot(piece);

    if (!slot) {
      return false;
    }

    const moveZone = piece.actionZone.resolveMove(
      this.flattenedSlots,
      slot.x,
      slot.y,
    );

    return moveZone.filter((slot) =>
      slot.x === targetX && slot.y === targetY
    ).length > 0;
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
      throw new BoardError({
        rawMessage: "Cannot get revealed zone for piece: piece slot not found",
        httpCode: 500,
        clientTranslationKey: "error__base",
      });
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
        throw new BoardError({
          rawMessage: "Cannot get killable pieces: piece slot not found",
          httpCode: 500,
          clientTranslationKey: "error__base",
        });
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
      throw new BoardError({
        rawMessage: "Cannot move: max play count reached, waiting for a kill",
        httpCode: 400,
        clientTranslationKey: "error__waiting_for_kill",
      });
    }

    if (!piece) {
      throw new BoardError({
        rawMessage: "Cannot move: mover not found",
        httpCode: 500,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.turn.isPieceMoveable(piece)) {
      throw new BoardError({
        rawMessage: "Cannot move: piece already moved this turn",
        httpCode: 400,
        clientTranslationKey: "error__piece_already_moved",
      });
    }

    const player = this.players.find((player) => player.id === piece.playerId);

    if (!player) {
      throw new BoardError({
        rawMessage:
          "Cannot move: player associated with moving piece does not exists",
        httpCode: 500,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.isPlayerTurn(player)) {
      throw new BoardError({
        rawMessage: "Cannot move: wait for player turn",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.isSlotInBoard(targetX, targetY)) {
      throw new BoardError({
        rawMessage: "Cannot move: slot is outside the board",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.isMovementDistanceInBounds(piece, targetX, targetY)) {
      throw new BoardError({
        rawMessage: "Cannot move: trying to move too fast",
        httpCode: 400,
        clientTranslationKey: "error__move_range_outreached",
      });
    }

    if (!this.isMovementInRevealedZone(piece, targetX, targetY)) {
      throw new BoardError({
        rawMessage: "Cannot move: trying to move outside piece's revealed zone",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.isSlotEmpty(targetX, targetY)) {
      throw new BoardError({
        rawMessage: "Cannot move: slot is already taken",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    const pieceLocation = this.getPieceLocation(piece);

    if (pieceLocation === null) {
      throw new BoardError({
        rawMessage: "Cannot move: cannot retrieve piece location",
        httpCode: 500,
        clientTranslationKey: "error__base",
      });
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
      throw new BoardError({
        rawMessage: "Cannot move: wait for player turn",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    const isAllowedToKill = this.getKillableSlotsForPlayer(player).find((
      slot,
    ) => slot.x === x && slot.y === y);

    if (!isAllowedToKill) {
      throw new BoardError({
        rawMessage: `Cannot kill: ${player.id} cannot kill piece at ${x},${y}`,
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.isSlotInBoard(x, y)) {
      throw new BoardError({
        rawMessage: "Cannot kill: slot is outside the board",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    if (this.isSlotEmpty(x, y)) {
      throw new BoardError({
        rawMessage: "Cannot kill: nothing to kill here",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    const victimSlot = this.slots[y][x];
    const victim = victimSlot.piece;

    if (!victim) {
      throw new BoardError({
        rawMessage: "Cannot kill: unable to find targeted piece",
        httpCode: 500,
        clientTranslationKey: "error__base",
      });
    }

    if (!this.isMovementInRevealedZone(victim, x, y)) {
      // needs test
      throw new BoardError({
        rawMessage: "Cannot kill: trying to kill outside piece's revealed zone",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    if (player.id === victim.playerId) {
      throw new BoardError({
        rawMessage: "Cannot kill: trying to kill own piece",
        httpCode: 400,
        clientTranslationKey: "error__base",
      });
    }

    const victimPlayer = this.players.find((player) =>
      player.id === victim.playerId
    );

    if (!victimPlayer) {
      throw new BoardError({
        rawMessage: "Cannot kill: unable to find targeted player",
        httpCode: 500,
        clientTranslationKey: "error__base",
      });
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
      this.turn.triggerNext();
      // avoid calling checkLooseConsitionMultiple times by doing:
      // brodcastBoardUpdate
      // return
    }

    this.turn.checkLooseCondition();
    this.broadcastBoardUpdate();
  }

  isPlayerTurn(player: Player): boolean {
    return this.turn.getCurrentPlayer().id === player.id;
  }

  onPlayerLost(player: Player) {
    player.pieces = [];
  }

  broadcastBoardUpdate() {
    this.players.forEach((player) => {
      const message = new BoardUpdateMessage(this, player);
      player.messenger.sendMessage(message);
    });
  }

  broadcastPlayersUpdate() {
    this.players.forEach((player) => {
      const message = new PlayersMessage(this);
      player.messenger.sendMessage(message);
    });
  }
}
