import { BaseError } from "./BaseError.js";

export class InternalServerError extends BaseError {
    constructor(message = "Internal Server Error") {
        super(message, 500);
    }
}