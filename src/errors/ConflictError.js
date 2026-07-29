import { BaseError } from "./BaseError.js";

export class ConflictError extends BaseError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}