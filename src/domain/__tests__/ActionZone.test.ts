import { assertEquals, describe, it } from "../../../deps.ts";
import { ActionZone, Direction } from "../ActionZone.ts";

describe("ActionZone", () => {
  describe("resolve", () => {
    const slots = [
      { x: 0, y: 0, piece: null },
      { x: 1, y: 0, piece: null },
      { x: 2, y: 0, piece: null },
      { x: 3, y: 0, piece: null },
      { x: 4, y: 0, piece: null },
      { x: 0, y: 1, piece: null },
      { x: 1, y: 1, piece: null },
      { x: 2, y: 1, piece: null },
      { x: 3, y: 1, piece: null },
      { x: 4, y: 1, piece: null },
      { x: 0, y: 2, piece: null },
      { x: 1, y: 2, piece: null },
      { x: 2, y: 2, piece: null },
      { x: 3, y: 2, piece: null },
      { x: 4, y: 2, piece: null },
      { x: 0, y: 3, piece: null },
      { x: 1, y: 3, piece: null },
      { x: 2, y: 3, piece: null },
      { x: 3, y: 3, piece: null },
      { x: 4, y: 3, piece: null },
      { x: 0, y: 4, piece: null },
      { x: 1, y: 4, piece: null },
      { x: 2, y: 4, piece: null },
      { x: 3, y: 4, piece: null },
      { x: 4, y: 4, piece: null },
    ];

    it("can resolve an orthogonal zone", () => {
      const actionZone = new ActionZone({
        moveRange: 2,
        revealRange: 4,
        killRange: 1,
        direction: Direction.ORTHOGONAL,
      });
      const x = 0;
      const y = 0;

      const actual = actionZone.resolveReveal(slots, x, y);
      const expected = [
        { x: 0, y: 0, piece: null },
        { x: 1, y: 0, piece: null },
        { x: 2, y: 0, piece: null },
        { x: 3, y: 0, piece: null },
        { x: 4, y: 0, piece: null },
        { x: 0, y: 1, piece: null },
        { x: 0, y: 2, piece: null },
        { x: 0, y: 3, piece: null },
        { x: 0, y: 4, piece: null },
      ];

      assertEquals(actual, expected);
    });

    it("can resolve a diagonal zone", () => {
      const actionZone = new ActionZone({
        moveRange: 2,
        revealRange: 4,
        killRange: 1,
        direction: Direction.DIAGONAL,
      });
      const x = 1;
      const y = 1;

      const actual = actionZone.resolveReveal(slots, x, y);
      const expected = [
        { x: 0, y: 0, piece: null },
        { x: 2, y: 0, piece: null },
        { x: 1, y: 1, piece: null },
        { x: 0, y: 2, piece: null },
        { x: 2, y: 2, piece: null },
        { x: 3, y: 3, piece: null },
        { x: 4, y: 4, piece: null },
      ];

      assertEquals(actual, expected);
    });

    it("can resolve a short diagonal zone", () => {
      const actionZone = new ActionZone({
        moveRange: 2,
        revealRange: 2,
        killRange: 1,
        direction: Direction.DIAGONAL,
      });
      const x = 0;
      const y = 0;

      const actual = actionZone.resolveReveal(slots, x, y);
      const expected = [
        { x: 0, y: 0, piece: null },
        { x: 1, y: 1, piece: null },
        { x: 2, y: 2, piece: null },
      ];

      assertEquals(actual, expected);
    });

    it("can resolve an all directions zone", () => {
      const actionZone = new ActionZone({
        moveRange: 2,
        revealRange: 2,
        killRange: 1,
        direction: Direction.ALL,
      });
      const x = 0;
      const y = 0;

      const actual = actionZone.resolveReveal(slots, x, y);
      const orthogonal = [
        { x: 0, y: 0, piece: null },
        { x: 1, y: 0, piece: null },
        { x: 2, y: 0, piece: null },
        { x: 0, y: 1, piece: null },
        { x: 0, y: 2, piece: null },
      ];

      const diagonal = [
        { x: 0, y: 0, piece: null },
        { x: 1, y: 1, piece: null },
        { x: 2, y: 2, piece: null },
      ];

      const expected = [
        ...orthogonal,
        ...diagonal,
      ];

      assertEquals(actual, expected);
    });
  });
});
