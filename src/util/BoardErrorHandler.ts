import { ErrorMessage } from "../network/Message.ts";
import { Messenger } from "../network/Messenger.ts";
import { BoardError } from "./BoardError.ts";
import { Logger } from "./Logger.ts";

export interface BoardErrorHandler {
    registerError(error: BoardError): void
}

export class LogAndPushErrorHandler implements BoardErrorHandler {
    constructor(private messenger: Messenger, private logger: Logger) {}

    registerError(error: BoardError) {
        const errorMessage = new ErrorMessage(error)
        this.messenger.sendMessage(errorMessage)
        this.logger.error(error.message)
    }
}

