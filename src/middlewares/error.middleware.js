import { ZodError } from 'zod'
import jwt from 'jsonwebtoken'
import { BaseError, ConflictError, ErrorCodes, InternalServerError, UnauthorizedError, ValidationError } from '../errors/index.js'

export const errorMiddleware = async (err, req, res, next) => {

    const error = {}

    if (err instanceof BaseError) {
        error = err
        error.message = err.message
    } else if (err.code === 11000) {
        error = new ConflictError(ErrorCodes.AUTH.ACCOUNT_ALREADY_EXISTS);
    } else if (err instanceof ZodError) {
        error = new ValidationError(ErrorCodes.VALIDATION.INVALID_INPUT);
        error.errors = err.flatten()
    } else if (err instanceof jwt.JsonWebTokenError) {
        error = new UnauthorizedError(ErrorCodes.AUTH.REFRESH_TOKEN_INVALID);
    } else if (err instanceof jwt.TokenExpiredError) {
        error = new UnauthorizedError(ErrorCodes.AUTH.REFRESH_TOKEN_INVALID)
    }

    if (!Object.keys(error).length) {
        error = new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG)
    }

    return res
        .status(error.statusCode || 500)
        .json({
            message: error.message,
            errors: [...error?.errors],
            name: error.name
        })
}