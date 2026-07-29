import { BaseError } from "./BaseError.js";

export class ForbiddenError extends BaseError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }
}