import { assertEquals, describe, it } from "../../../deps.ts";
import { Explorer, PieceDTO } from "../Piece.ts";

describe("PieceDTO", () => {
  describe("fromPiece", () => {
    it("should create a DTO from Piece object", () => {
      const piece = new Explorer("player id");
      const dto = PieceDTO.fromPiece(piece)!;

      assertEquals(dto.playerId, piece.playerId);
      assertEquals(dto.name, piece.name);
      assertEquals(dto.killRange, piece.actionZone.killRange);
      assertEquals(dto.direction, piece.actionZone.direction);
    });

    it("should return null if given Piece is null", () => {
      const piece = null;
      const dto = PieceDTO.fromPiece(piece);

      assertEquals(dto, null);
    });
  });
});
