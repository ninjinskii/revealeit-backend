import { ErrorMessage } from "../network/Message.ts";
import { Messenger } from "../network/Messenger.ts";
import { BoardError } from "./BoardError.ts";

export interface BoardErrorHandler {
  registerError(error: BoardError): void;
}

export class LogAndPushErrorHandler implements BoardErrorHandler {
  constructor(private messenger: Messenger) {}

  registerError(error: BoardError) {
    const errorMessage = new ErrorMessage(error);
    this.messenger.sendMessage(errorMessage);
    console.error(error.message);
  }
}
