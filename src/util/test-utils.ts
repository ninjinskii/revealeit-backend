import { Spy, stub, returnsNext } from "../../deps.ts";
import { SendableMessage, ReceiveableMessage } from "../network/Message.ts";
import { Messenger } from "../network/Messenger.ts";
import { Board } from "../domain/Board.ts"

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
    return false
  }

  endCommunication(): void {    
  }

  sendMessage(message: SendableMessage): void {
  }
}

export class FakeSendableMessage extends SendableMessage {
  constructor() {
    super("", "")
  }

  prepare(): SendableMessage {
    return this
  }
}

export class FakeReceiveableMessage extends ReceiveableMessage {
  execute(board?: Board): void {
  }
}
