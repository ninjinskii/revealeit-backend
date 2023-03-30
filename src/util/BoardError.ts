interface BoardErrorOptions {
    rawMessage: string;
    httpCode: number;       // Never used right now, but giveas additional context fore developers on errors
    clientTranslationKey: string;
}

export class BoardError extends Error {
    httpCode: number
    clientTranslationKey: string

    constructor(options: BoardErrorOptions) {
        super(options.rawMessage)

        this.httpCode = options.httpCode
        this.clientTranslationKey = options.clientTranslationKey
    }
}