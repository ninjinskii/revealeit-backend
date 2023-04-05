import { returnsNext, Spy, stub } from "../../deps.ts";
import { ReceiveableMessage, SendableMessage } from "../network/Message.ts";
import { Messenger } from "../network/Messenger.ts";
import { Board } from "../domain/Board.ts";
import { Piece } from "../model/Piece.ts";
import { ActionZone, Direction } from "../domain/ActionZone.ts";

export function spyContext(spies: Spy[], block: () => void): void {
  try {
    block();
  } finally {
    spies.forEach((s) => s.restore());
  }
}

export function simpleStub<T>(
  object: T,
  method: keyof T,
  returnNext: unknown,
) {
  return stub(object, method, returnsNext([returnNext] as never));
}

export function multipleStub<T>(
  object: T,
  method: keyof T,
  returnNext: unknown[],
) {
  return stub(object, method, returnsNext(returnNext as never));
}

export function simpleStubAsync<T>(
  object: T,
  method: keyof T,
  returnNext: unknown,
) {
  return stub(
    object,
    method,
    returnsNext([Promise.resolve(returnNext)] as never),
  );
}

export class FakeMessenger extends Messenger {
  isClosed(): boolean {
    return false;
  }

  endCommunication(): void {
  }

  sendMessage(_message: SendableMessage): void {
  }
}

export class FakeSendableMessage extends SendableMessage {
  constructor() {
    super("", "");
  }

  prepare(): SendableMessage {
    return this;
  }
}

export class FakeReceiveableMessage extends ReceiveableMessage {
  execute(_board?: Board): void {
  }
}

export class FakePiece implements Piece {
  playerId = "";
  name = "fake";
  actionZone = new ActionZone({
    direction: Direction.ORTHOGONAL,
    killRange: 1,
    revealRange: 1,
    moveRange: 1,
  });
  originSpawnDelta = { dX: 0, dY: 0 };
}
