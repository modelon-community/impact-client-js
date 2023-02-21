export const InvalidApiKey = 11034

const BASE = 100000
export const UnknownApiError = BASE
export const MissingAccessTokenCookie = BASE + 1
export const MissingJupyterHubToken = BASE + 2
export const ServerNotStarted = BASE + 3

class ApiError extends Error {
    errorCode: number
    httpCode: number | undefined

    constructor({
        errorCode,
        httpCode,
        message,
    }: {
        errorCode: number
        httpCode?: number
        message: string
    }) {
        super(message)
        Object.setPrototypeOf(this, ApiError.prototype)

        this.errorCode = errorCode
        this.httpCode = httpCode
    }

    getHttpCode() {
        return this.httpCode
    }

    getErrorCode() {
        return this.errorCode
    }

    getMessage() {
        return this.message
    }

    toString() {
        return `ApiError ${this.errorCode},${
            this.httpCode ? ` http error: ${this.httpCode}` : ''
        } message: ${this.message}`
    }
}

export default ApiError
