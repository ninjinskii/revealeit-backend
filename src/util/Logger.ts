export interface Logger {
    log(message: string): void
    warn(message: string): void
    error(message: string): void
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
