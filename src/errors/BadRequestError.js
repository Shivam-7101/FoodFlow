import { BaseError } from "./BaseError.js";

export class BadRequestError extends BaseError {
    constructor(message = "Bad Request") {
        super(message, 400);
    }
}