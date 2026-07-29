import { BaseError } from "./BaseError.js";

export class NotFoundError extends BaseError {
    constructor(message = "Resource Not Found") {
        super(message, 404);
    }
}