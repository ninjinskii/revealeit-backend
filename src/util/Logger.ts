export interface Logger {
    log(message: string)
    warn(message: string)
    error(message: string)
}

export class InfamousLogger implements Logger {
    log(message: string) {
        console.log(message)
    }

    warn(message: string) {
        console.warn(message)
    }

    error(message: string | Error) {
        console.error(message)
    }
}
