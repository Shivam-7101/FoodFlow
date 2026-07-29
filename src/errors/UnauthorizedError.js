import { BaseError } from "./BaseError.js";

export class UnauthorizedError extends BaseError {
    constructor(message = "Unauthorized") {
        super(message, 401);
    }
}