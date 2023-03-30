import { ErrorMessage } from "../network/Message.ts";
import { Messenger } from "../network/Messenger.ts";
import { Logger } from "./Logger.ts";

interface BoardErrorRegistor {
    registerError(error: BoardError)
}

interface BoardError {
    rawMessage: string;
    httpCode: number;       // Never used right now, but giveas additional context fore developers on errors
    clientTranslationKey: string;
}

export class LogAndPushErrorRegistor implements BoardErrorRegistor {
    constructor(private messenger: Messenger, private logger: Logger) {}

    registerError(error: BoardError) {
        const errorMessage = new ErrorMessage(new Error(error.rawMessage))
        this.messenger.sendMessage(errorMessage)
        this.logger.error(error.rawMessage)
    }
}