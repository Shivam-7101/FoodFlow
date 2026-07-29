import { BaseError } from "./BaseError.js";

export class ValidationError extends BaseError {
    constructor(message = "Validation Error") {
        super(message, 422);
    }
}